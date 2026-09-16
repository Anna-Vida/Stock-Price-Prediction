"""Python API and explicitly allowlisted frontend assets."""
import copy
import json
import math
import os
import random
import re
import threading
import time
import urllib.error
import urllib.request
from urllib.parse import quote as encode_symbol
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from flask import Flask, jsonify, request, send_from_directory
from analytics import analyze
from crypto_api import crypto_api

ROOT = Path(__file__).resolve().parent
app = Flask(__name__, static_folder=None)
app.register_blueprint(crypto_api)
CACHE = {}
CACHE_LOCK = threading.Lock()
# Bounded lock stripes coalesce concurrent requests for the same ticker.
FETCH_LOCKS = [threading.Lock() for _ in range(32)]
CACHE_TTL = 60
STALE_TTL = 900
PROVIDER_ERRORS = (urllib.error.URLError, TimeoutError, ValueError, KeyError,
                   TypeError, IndexError, OSError, OverflowError)
SYMBOL = re.compile(r"^[A-Z0-9^][A-Z0-9.\-^=]{0,14}$")
CATALOG = [
    ("NVDA", "NVIDIA Corporation", "Technology"), ("AAPL", "Apple Inc.", "Technology"),
    ("MSFT", "Microsoft Corporation", "Technology"), ("TSLA", "Tesla, Inc.", "Automotive"),
    ("AMZN", "Amazon.com, Inc.", "Consumer"), ("GOOGL", "Alphabet Inc.", "Communication"),
    ("META", "Meta Platforms, Inc.", "Communication"), ("AMD", "Advanced Micro Devices", "Technology"),
    ("NFLX", "Netflix, Inc.", "Entertainment"), ("JPM", "JPMorgan Chase & Co.", "Financials"),
    ("V", "Visa Inc.", "Financials"), ("JNJ", "Johnson & Johnson", "Healthcare"),
    ("XOM", "Exxon Mobil Corporation", "Energy"), ("WMT", "Walmart Inc.", "Consumer"),
    ("COIN", "Coinbase Global, Inc.", "Financials"), ("ORCL", "Oracle Corporation", "Technology"),
    ("CRM", "Salesforce, Inc.", "Technology"), ("INTC", "Intel Corporation", "Technology"),
    ("BAC", "Bank of America Corp.", "Financials"), ("PFE", "Pfizer Inc.", "Healthcare")]


def finite(value):
    return isinstance(value, (float, int)) and not isinstance(value, bool) and math.isfinite(value)


def parse_provider(payload):
    result = payload["chart"]["result"][0]
    meta = result["meta"]
    quote = result["indicators"]["quote"][0]
    # Use adjusted history for analytics so splits/dividends do not masquerade as returns.
    adjusted_series = result["indicators"].get("adjclose") or [{}]
    adjusted = adjusted_series[0].get("adjclose")
    closes = adjusted if adjusted else quote["close"]
    timestamps = result.get("timestamp", [])
    market_time = meta.get("regularMarketTime")
    if not finite(market_time) or market_time <= 0:
        raise ValueError("Quote timestamp unavailable")
    try:
        exchange_zone = ZoneInfo(meta.get("exchangeTimezoneName") or "UTC")
    except ZoneInfoNotFoundError:
        exchange_zone = timezone(timedelta(seconds=meta.get("gmtoffset", 0)))
    def session_date(stamp):
        return datetime.fromtimestamp(stamp, exchange_zone).date().isoformat()
    market_day = session_date(market_time)
    # Exclude the current session until its scheduled close.
    session = meta.get("currentTradingPeriod", {}).get("regular", {})
    session_start, session_end = session.get("start", 0), session.get("end", 0)
    bars = []
    dropped = 0
    last_stamp = -1
    for i, stamp in enumerate(timestamps):
        if not finite(stamp) or stamp <= last_stamp:
            raise ValueError("Historical timestamps must be valid and increasing")
        last_stamp = stamp
        value = closes[i] if i < len(closes) else None
        date = session_date(stamp)
        if session_start <= stamp < session_end and time.time() < session_end:
            continue
        if not finite(value) or value <= 0:
            dropped += 1
            continue
        volume = quote.get("volume", [])
        bars.append({"date": date, "close": float(value),
                     "volume": volume[i] if i < len(volume) and finite(volume[i]) and volume[i] >= 0 else None})
    price = meta.get("regularMarketPrice")
    if not finite(price) or price <= 0 or len(bars) < 90:
        raise ValueError("Insufficient market data")
    # chartPreviousClose is the start-of-range close, not yesterday's close.
    raw = [(session_date(t), c)
           for t, c in zip(timestamps, quote["close"]) if finite(c) and c > 0]
    previous = next((c for date, c in reversed(raw) if date < market_day), None)
    if previous is None:
        raise ValueError("Previous session unavailable")
    return {"price": price, "change": price - previous, "percent": (price / previous - 1) * 100,
            "currency": meta.get("currency", "USD"), "as_of": market_time,
            "bars": bars, "source": "Yahoo Finance", "history_basis": "Adjusted daily close" if adjusted else "Daily close",
            "exchange_timezone": meta.get("exchangeTimezoneName", "UTC"),
            "data_quality": {"dropped_price_rows": dropped,
                             "missing_volume_rows": sum(bar["volume"] is None for bar in bars),
                             "last_completed_session": bars[-1]["date"]}}


def demo_quote(symbol):
    rng = random.Random(symbol)
    date = datetime(2025, 9, 1)
    price, bars = 100.0, []
    while len(bars) < 260:
        if date.weekday() < 5:
            price *= math.exp(rng.gauss(0.0005, 0.018))
            bars.append({"date": date.date().isoformat(), "close": price,
                         "volume": rng.randint(10_000_000, 70_000_000)})
        date += timedelta(days=1)
    previous = bars[-2]["close"]
    return {"price": price, "change": price - previous, "percent": (price / previous - 1) * 100,
            "currency": "USD", "as_of": int((date - timedelta(days=1)).replace(tzinfo=timezone.utc).timestamp()),
            "bars": bars, "source": "Synthetic demo", "history_basis": "Synthetic daily close"}


def get_quote(symbol, demo=False):
    with FETCH_LOCKS[hash((symbol, demo)) % len(FETCH_LOCKS)]:
        return _get_quote(symbol, demo)


def _get_quote(symbol, demo=False):
    key = (symbol, demo)
    with CACHE_LOCK:
        cached = CACHE.get(key)
        if cached and time.monotonic() - cached[0] < CACHE_TTL:
            result = copy.deepcopy(cached[1])
            result["cached"] = True
            return result
    if demo:
        result = demo_quote(symbol)
    else:
        try:
            req = urllib.request.Request(
                f"https://query1.finance.yahoo.com/v8/finance/chart/{encode_symbol(symbol, safe='')}?range=2y&interval=1d",
                headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=12) as response:
                result = parse_provider(json.load(response))
        except PROVIDER_ERRORS:
            if cached and time.monotonic() - cached[0] < STALE_TTL:
                result = copy.deepcopy(cached[1])
                result.update(cached=True, stale=True,
                              cache_age_seconds=int(time.monotonic() - cached[0]),
                              warning="Provider unavailable. Showing a previously fetched quote; retry for current data.")
                return result
            raise
    result.update(symbol=symbol, demo=demo, cached=False, stale=False,
                  fetched_at=int(time.time()), analytics=analyze(result["bars"]))
    # Retain the original quote API's history fields for clients.
    result["closes"] = [bar["close"] for bar in result["bars"]]
    with CACHE_LOCK:
        if len(CACHE) >= 128:
            CACHE.pop(next(iter(CACHE)))
        CACHE[key] = (time.monotonic(), copy.deepcopy(result))
    return result


@app.get("/api/health")
def health():
    return jsonify(status="ok", backend="python")


@app.get("/api/markets")
def markets():
    return jsonify([dict(symbol=s, name=n, sector=c) for s, n, c in CATALOG])


@app.get("/api/quote")
def quote():
    symbol = request.args.get("symbol", "NVDA").upper().strip()
    if not SYMBOL.fullmatch(symbol):
        return jsonify(error="Enter a valid ticker (up to 15 characters)."), 400
    try:
        return jsonify(get_quote(symbol, request.args.get("demo") == "1"))
    except PROVIDER_ERRORS:
        return jsonify(error="Market data unavailable for this ticker. Retry or choose Demo data."), 502


@app.get("/")
def index():
    return send_from_directory(ROOT, "index.html")


@app.get("/crypto")
def crypto_page():
    return send_from_directory(ROOT, "crypto.html")


@app.get("/crypto-assets/dashboard.js")
def crypto_bundle():
    return send_from_directory(ROOT / 'public' / 'crypto', 'dashboard.js')


@app.get("/<path:asset>")
def asset(asset):
    if asset not in {"app.js", "styles.css", "supabase-config.js"}:
        return jsonify(error="Not found"), 404
    return send_from_directory(ROOT, asset)


@app.after_request
def headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


if __name__ == "__main__":
    from waitress import serve
    port = int(os.environ.get("PORT", 5500))
    print(f"Predict running at http://localhost:{port}", flush=True)
    serve(app, host=os.environ.get("HOST", "127.0.0.1"), port=port, threads=8)
