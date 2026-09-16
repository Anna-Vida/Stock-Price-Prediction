"""CoinGecko market-data proxy. Provider credentials never enter browser code."""
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
import xml.etree.ElementTree as ET
from urllib.parse import urlencode
from flask import Blueprint, jsonify, request

crypto_api = Blueprint('crypto', __name__, url_prefix='/api/crypto')
COIN_ID = re.compile(r'^[a-z0-9][a-z0-9-]{0,99}$')
DEFAULT_IDS = ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'cardano', 'chainlink', 'avalanche-2', 'polkadot']
DEMO_COINS = [
    ('bitcoin', 'btc', 'Bitcoin', 43250.5), ('ethereum', 'eth', 'Ethereum', 2650.75),
    ('binancecoin', 'bnb', 'BNB', 315.25), ('solana', 'sol', 'Solana', 98.45),
    ('cardano', 'ada', 'Cardano', .48), ('chainlink', 'link', 'Chainlink', 14.25),
    ('avalanche-2', 'avax', 'Avalanche', 35.5), ('polkadot', 'dot', 'Polkadot', 6.5),
    ('dogecoin', 'doge', 'Dogecoin', .08), ('ripple', 'xrp', 'XRP', .55)]
CACHE = {}
LOCK = threading.Lock()
FETCH_LOCKS = [threading.Lock() for _ in range(16)]
PROVIDER_ERRORS = (urllib.error.URLError, TimeoutError, OSError, ValueError, TypeError, KeyError)


def number(value):
    return value if isinstance(value, (float, int)) and not isinstance(value, bool) and math.isfinite(value) else None


def provider(path, params):
    headers = {'User-Agent': 'Predict/1.0', 'Accept': 'application/json'}
    key = os.environ.get('COINGECKO_DEMO_API_KEY')
    if key:
        headers['x-cg-demo-api-key'] = key
    req = urllib.request.Request(f'https://api.coingecko.com/api/v3/{path}?{urlencode(params)}', headers=headers)
    with urllib.request.urlopen(req, timeout=12) as response:
        return json.load(response)


def cached(key, fetch, allow_stale=False):
    with FETCH_LOCKS[hash(key) % len(FETCH_LOCKS)]:
        with LOCK:
            entry = CACHE.get(key)
        age = time.monotonic() - entry[0] if entry else float('inf')
        if age < 60:
            result = copy.deepcopy(entry[1])
            result['cached'] = True
            return result
        try:
            result = fetch()
        except PROVIDER_ERRORS:
            if allow_stale and age < 900:
                result = copy.deepcopy(entry[1])
                result.update(stale=True, cached=True, warning='Provider unavailable. These cached prices may be out of date.')
                return result
            raise
        result.update(stale=False, cached=False, fetched_at=int(time.time()))
        with LOCK:
            if len(CACHE) >= 128:
                CACHE.pop(next(iter(CACHE)))
            CACHE[key] = (time.monotonic(), copy.deepcopy(result))
        return result


def normalize_markets(rows):
    if not isinstance(rows, list):
        raise ValueError('Invalid market response')
    clean = []
    for coin in rows:
        price = number(coin.get('current_price'))
        if price is None or price < 0 or not COIN_ID.fullmatch(str(coin.get('id', ''))):
            continue
        item = {key: str(coin.get(key) or '') for key in ('id', 'symbol', 'name', 'last_updated')}
        image = coin.get('image')
        item['image'] = image if isinstance(image, str) and image.startswith('https://') else ''
        for field in ('current_price', 'market_cap', 'market_cap_rank', 'price_change_percentage_24h', 'total_volume', 'high_24h', 'low_24h'):
            item[field] = number(coin.get(field))
        values = (coin.get('sparkline_in_7d') or {}).get('price') or []
        # Preserve missing sample positions rather than compressing the time axis.
        item['sparkline_in_7d'] = {'price': [v if number(v) is not None and v >= 0 else None for v in values]}
        clean.append(item)
    return clean


def demo_markets(ids):
    result = []
    for rank, (coin_id, symbol, name, price) in enumerate(DEMO_COINS, 1):
        if coin_id not in ids:
            continue
        rng = random.Random(coin_id)
        values = [price * (1 + .03 * math.sin(i / 15) + rng.uniform(-.006, .006)) for i in range(168)]
        values[-1] = price
        result.append(dict(id=coin_id, symbol=symbol, name=name, image='', current_price=price,
                           market_cap=price * 20_000_000, market_cap_rank=rank,
                           price_change_percentage_24h=(price / values[-25] - 1) * 100,
                           total_volume=price * 800_000, high_24h=max(values[-24:]), low_24h=min(values[-24:]),
                           sparkline_in_7d={'price': values}, last_updated='2025-09-07T00:00:00Z'))
    return result


@crypto_api.get('/markets')
def markets():
    raw = request.args.get('ids', ','.join(DEFAULT_IDS))
    ids = list(dict.fromkeys(raw.split(','))) if raw else []
    if len(ids) > 20 or any(not COIN_ID.fullmatch(coin_id) for coin_id in ids):
        return jsonify(error='Choose up to 20 valid coin IDs.'), 400
    demo = request.args.get('demo') == '1'
    if not ids:
        return jsonify(coins=[], missing_ids=[], demo=demo, stale=False, source='Synthetic demo' if demo else 'CoinGecko')
    def fetch():
        coins = demo_markets(ids) if demo else normalize_markets(provider('coins/markets', {
            'vs_currency': 'usd', 'ids': ','.join(ids), 'order': 'market_cap_desc',
            'per_page': 20, 'page': 1, 'sparkline': 'true', 'price_change_percentage': '24h'}))
        return dict(coins=coins, missing_ids=[i for i in ids if i not in {c['id'] for c in coins}],
                    demo=demo, source='Synthetic demo' if demo else 'CoinGecko')
    try:
        return jsonify(cached(('markets', tuple(sorted(ids)), demo), fetch, allow_stale=True))
    except PROVIDER_ERRORS:
        return jsonify(error='Crypto provider unavailable or rate-limited. Retry shortly or select Demo data.'), 502


@crypto_api.get('/search')
def search():
    query = request.args.get('q', '').strip()
    if len(query) > 60:
        return jsonify(error='Search must be 60 characters or fewer.'), 400
    if not query:
        return jsonify(coins=[])
    demo = request.args.get('demo') == '1'
    def fetch():
        rows = [dict(id=i, symbol=s, name=n) for i, s, n, _ in DEMO_COINS if query.lower() in f'{i} {s} {n}'.lower()] if demo else provider('search', {'query': query})['coins']
        coins = [dict(id=c['id'], symbol=c['symbol'], name=c['name']) for c in rows[:10]
                 if COIN_ID.fullmatch(str(c.get('id', '')))]
        return dict(coins=coins, demo=demo)
    try:
        return jsonify(cached(('search', query.lower(), demo), fetch))
    except PROVIDER_ERRORS:
        return jsonify(error='Coin search is unavailable. Please retry.'), 502


@crypto_api.get('/trending')
def trending():
    demo = request.args.get('demo') == '1'
    def fetch():
        if demo:
            coins = [dict(id=i, symbol=s, name=n) for i, s, n, _ in DEMO_COINS[3:7]]
        else:
            items = provider('search/trending', {})['coins']
            coins = [dict(id=c['item']['id'], symbol=c['item']['symbol'], name=c['item']['name']) for c in items[:6]]
        return dict(coins=coins, demo=demo, source='Illustrative trending list' if demo else 'CoinGecko search trends')
    try:
        return jsonify(cached(('trending', demo), fetch, allow_stale=True))
    except PROVIDER_ERRORS:
        return jsonify(error='Trending data unavailable.'), 502


@crypto_api.get('/news')
def news():
    def fetch():
        req = urllib.request.Request('https://www.coindesk.com/arc/outboundfeeds/rss/', headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=12) as response:
            content = response.read(2_000_001)
        if len(content) > 2_000_000:
            raise ValueError('Feed too large')
        try:
            tree = ET.fromstring(content)
        except ET.ParseError as error:
            raise ValueError('Invalid news feed') from error
        articles = []
        for item in tree.findall('./channel/item')[:8]:
            link = item.findtext('link', '').strip()
            if link.startswith('https://'):
                articles.append(dict(title=item.findtext('title', '').strip(), url=link, published=item.findtext('pubDate', ''), source='CoinDesk'))
        if not articles:
            raise ValueError('Empty news feed')
        return dict(articles=articles, source='CoinDesk RSS')
    try:
        return jsonify(cached(('news',), fetch, allow_stale=True))
    except PROVIDER_ERRORS:
        return jsonify(error='News feed unavailable. Please retry later.'), 502
