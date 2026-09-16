"""Transparent statistical forecasts; every backtest uses only prior observations."""
import math
import statistics


def direction(value):
    """Keep flat outcomes distinct from negative returns."""
    return (value > 0) - (value < 0)


def forecast(prices, horizon):
    if not isinstance(horizon, int) or isinstance(horizon, bool) or not 1 <= horizon <= 30:
        raise ValueError("Forecast horizon must be 1 to 30 trading sessions")
    if len(prices) < 2 or any(not isinstance(p, (int, float)) or isinstance(p, bool)
                              or not math.isfinite(p) or p <= 0 for p in prices):
        raise ValueError("Forecast prices must be finite and positive")
    # Shrink recent log drift toward zero to limit trend extrapolation.
    recent = prices[-61:]
    returns = [math.log(b / a) for a, b in zip(recent, recent[1:])]
    drift = statistics.mean(returns) * 0.5
    sigma = statistics.stdev(returns) if len(returns) > 1 else 0.0
    last = prices[-1]
    expected = last * math.exp(drift * horizon)
    spread = 1.96 * sigma * math.sqrt(horizon)
    return {"horizon": horizon, "expected": expected,
            "lower": expected * math.exp(-spread), "upper": expected * math.exp(spread)}


def analyze(bars):
    prices = [bar["close"] for bar in bars]
    if len(prices) < 90:
        raise ValueError("At least 90 valid daily observations are required")
    if any(not isinstance(p, (int, float)) or isinstance(p, bool)
           or not math.isfinite(p) or p <= 0 for p in prices):
        raise ValueError("Historical prices must be finite and positive")
    returns = [b / a - 1 for a, b in zip(prices, prices[1:])]
    changes = [b - a for a, b in zip(prices[-15:-1], prices[-14:])]
    gain = sum(max(value, 0) for value in changes) / 14
    loss = sum(max(-value, 0) for value in changes) / 14
    rsi = 100 - 100 / (1 + gain / loss) if loss else (100 if gain else 50)
    peak, drawdown = prices[0], 0.0
    for price in prices:
        peak = max(peak, price)
        drawdown = min(drawdown, price / peak - 1)
    backtests = []
    for horizon in (1, 7, 30):
        errors, baseline, directions, points, percentages, coverage = [], [], [], [], [], []
        for end in range(max(59, len(prices) - 90 - horizon), len(prices) - horizon):
            estimate = forecast(prices[:end + 1], horizon)
            prediction = estimate["expected"]
            actual, previous = prices[end + horizon], prices[end]
            errors.append(abs(prediction - actual))
            baseline.append(abs(previous - actual))
            directions.append(direction(prediction - previous) == direction(actual - previous))
            percentages.append(abs(prediction / actual - 1) * 100)
            coverage.append(estimate["lower"] <= actual <= estimate["upper"])
            points.append({"origin_date": bars[end]["date"],
                           "date": bars[end + horizon]["date"], "actual": actual,
                           "predicted": prediction, "baseline": previous,
                           "lower": estimate["lower"], "upper": estimate["upper"]})
        backtests.append({"horizon": horizon, "samples": len(errors),
                          "mae": statistics.mean(errors),
                          "baseline_mae": statistics.mean(baseline),
                          "rmse": math.sqrt(statistics.mean(e * e for e in errors)),
                          "mape": statistics.mean(percentages),
                          "interval_coverage": statistics.mean(coverage) * 100,
                          "directional_accuracy": statistics.mean(directions) * 100,
                          "evaluation_start": points[0]["origin_date"],
                          "evaluation_end": points[-1]["date"],
                          "points": points})
    sma20, sma50 = statistics.mean(prices[-20:]), statistics.mean(prices[-50:])
    return {"observations": len(prices), "period_return": (prices[-1] / prices[0] - 1) * 100,
            "volatility": statistics.stdev(returns) * math.sqrt(252) * 100,
            "max_drawdown": drawdown * 100, "rsi": rsi, "sma20": sma20, "sma50": sma50,
            "average_volume": (statistics.mean([bar["volume"] for bar in bars[-20:]
                                                 if bar.get("volume") is not None])
                               if any(bar.get("volume") is not None for bar in bars[-20:]) else None),
            "volume_observations": sum(bar.get("volume") is not None for bar in bars[-20:]),
            "signal": "Uptrend" if prices[-1] > sma20 > sma50 else
                      "Downtrend" if prices[-1] < sma20 < sma50 else "Mixed trend",
            "forecasts": [forecast(prices, horizon) for horizon in (1, 7, 30)],
            "trajectory": [forecast(prices, horizon) for horizon in range(1, 31)],
            "backtests": backtests,
            "model": "Damped log-return drift",
            "model_version": "1.1",
            "methodology": "Mean of the last 60 daily log returns, shrunk by 50%. "
                           "95% model bands assume independent normal log returns; they are not calibrated guarantees. "
                           "Walk-forward errors use up to 90 origins per horizon, with overlapping outcomes. "
                           "The baseline predicts the last close. Flat, rising, and falling outcomes are distinct. "
                           "Coverage measures how often actual prices fell inside the historical bands. "
                           "No future observations enter a forecast."}
