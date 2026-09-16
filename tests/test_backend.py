import copy
import math
import unittest
import urllib.error
from unittest.mock import patch

from analytics import analyze, forecast
from server import app, CACHE, demo_quote, parse_provider, get_quote
import time
from concurrent.futures import ThreadPoolExecutor


class AnalyticsTests(unittest.TestCase):
    def bars(self, values):
        return [{"date": str(i), "close": value, "volume": 100} for i, value in enumerate(values)]

    def test_constant_prices(self):
        result = analyze(self.bars([100] * 100))
        for key in ("volatility", "period_return", "max_drawdown"):
            self.assertEqual(result[key], 0)
        self.assertEqual(result["rsi"], 50)
        self.assertEqual(result["forecasts"][1]["expected"], 100)
        self.assertEqual(result["backtests"][1]["mae"], 0)

    def test_minimum_history(self):
        self.assertGreater(analyze(self.bars([100] * 90))["backtests"][2]["samples"], 0)
        with self.assertRaises(ValueError):
            analyze(self.bars([100] * 89))

    def test_known_log_trend(self):
        prices = [100 * math.exp(i * .01) for i in range(100)]
        result = forecast(prices, 7)
        self.assertAlmostEqual(result["expected"], prices[-1] * math.exp(.035))

    def test_drawdown(self):
        result = analyze(self.bars([100] * 98 + [200, 100]))
        self.assertAlmostEqual(result["max_drawdown"], -50)

    def test_invalid_prices_and_horizons(self):
        for invalid in (float('nan'), float('inf'), 0, -1, True):
            with self.assertRaises(ValueError):
                analyze(self.bars([100] * 99 + [invalid]))
        for horizon in (0, 31, 1.5, True):
            with self.assertRaises(ValueError):
                forecast([100, 101], horizon)

    def test_error_metrics_and_missing_volume(self):
        bars = self.bars([100] * 100)
        for bar in bars:
            bar['volume'] = None
        result = analyze(bars)
        self.assertIsNone(result['average_volume'])
        self.assertEqual(result['volume_observations'], 0)
        for backtest in result['backtests']:
            self.assertEqual(backtest['rmse'], 0)
            self.assertEqual(backtest['mape'], 0)
            self.assertEqual(backtest['interval_coverage'], 100)
            self.assertEqual(backtest['directional_accuracy'], 100)

    def test_no_future_leakage(self):
        bars = demo_quote('NVDA')["bars"]
        original = analyze(bars)
        changed = copy.deepcopy(bars)
        changed[-1]["close"] *= 2
        altered = analyze(changed)
        for old, new in zip(original["backtests"], altered["backtests"]):
            self.assertEqual([p["predicted"] for p in old["points"]],
                             [p["predicted"] for p in new["points"]])
        for f in original["forecasts"]:
            self.assertLessEqual(f["lower"], f["expected"])
            self.assertLessEqual(f["expected"], f["upper"])


class APITests(unittest.TestCase):
    def setUp(self):
        CACHE.clear()
        self.client = app.test_client()

    def test_demo_and_cache(self):
        result = self.client.get('/api/quote?symbol=NVDA&demo=1')
        self.assertEqual(result.status_code, 200)
        self.assertTrue(result.json['demo'])
        self.assertEqual(len(result.json['analytics']['forecasts']), 3)
        self.assertTrue(self.client.get('/api/quote?symbol=NVDA&demo=1').json['cached'])

    def test_invalid_symbol(self):
        self.assertEqual(self.client.get('/api/quote?symbol=../secret').status_code, 400)

    def test_source_files_not_served(self):
        for path in ('server.py', '.git/config', 'requirements.txt', '.env', 'analytics.py'):
            self.assertEqual(self.client.get('/' + path).status_code, 404)
        with self.client.get('/') as response:
            self.assertEqual(response.status_code, 200)

    def test_provider_failure_never_becomes_demo(self):
        with patch('server.urllib.request.urlopen', side_effect=urllib.error.URLError('unavailable')):
            result = self.client.get('/api/quote?symbol=NVDA')
        self.assertEqual(result.status_code, 502)
        self.assertNotIn('price', result.json)

    def test_stale_cache_is_labeled_and_expires(self):
        live = get_quote('NVDA', demo=True)
        live.update(demo=False, source='Yahoo Finance')
        CACHE[('NVDA', False)] = (time.monotonic() - 90, live)
        with patch('server.urllib.request.urlopen', side_effect=urllib.error.URLError('offline')):
            result = self.client.get('/api/quote?symbol=NVDA')
            self.assertEqual(result.status_code, 200)
            self.assertTrue(result.json['stale'])
            self.assertFalse(result.json['demo'])
            self.assertIn('warning', result.json)
            CACHE[('NVDA', False)] = (time.monotonic() - 1000, live)
            self.assertEqual(self.client.get('/api/quote?symbol=NVDA').status_code, 502)

    def test_concurrent_requests_fetch_once(self):
        with patch('server.demo_quote', wraps=demo_quote) as fetch:
            with ThreadPoolExecutor(max_workers=6) as pool:
                results = list(pool.map(lambda _: get_quote('AAPL', demo=True), range(6)))
            self.assertEqual(fetch.call_count, 1)
            self.assertEqual(sum(not result['cached'] for result in results), 1)

    def provider_fixture(self):
        stamps = [1700000000 + 86400 * i for i in range(100)]
        return {'chart': {'result': [{'meta': {
            'regularMarketPrice': 200, 'regularMarketTime': stamps[-1],
            'chartPreviousClose': 100, 'currency': 'USD'}, 'timestamp': stamps,
            'indicators': {'quote': [{'close': list(range(100, 200)), 'volume': [100] * 100}]}}]}}

    def test_premarket_keeps_previous_completed_session(self):
        payload = self.provider_fixture()
        result = payload['chart']['result'][0]
        last = result['timestamp'][-1]
        result['meta']['currentTradingPeriod'] = {'regular': {'start': last + 86400, 'end': last + 110000}}
        with patch('server.time.time', return_value=last + 80000):
            self.assertEqual(len(parse_provider(payload)['bars']), 100)

    def test_intraday_excludes_unfinished_bar(self):
        payload = self.provider_fixture()
        result = payload['chart']['result'][0]
        last = result['timestamp'][-1]
        result['meta']['currentTradingPeriod'] = {'regular': {'start': last, 'end': last + 20000}}
        with patch('server.time.time', return_value=last + 10000):
            self.assertEqual(len(parse_provider(payload)['bars']), 99)

    def test_exchange_dates_and_missing_volume(self):
        payload = self.provider_fixture()
        result = payload['chart']['result'][0]
        result['meta'].update(exchangeTimezoneName='Asia/Manila', gmtoffset=28800)
        result['indicators']['quote'][0]['volume'][-1] = None
        parsed = parse_provider(payload)
        self.assertEqual(parsed['bars'][0]['date'], '2023-11-15')
        self.assertIsNone(parsed['bars'][-1]['volume'])
        self.assertEqual(parsed['data_quality']['missing_volume_rows'], 1)

    def test_rejects_duplicate_history(self):
        payload = self.provider_fixture()
        stamps = payload['chart']['result'][0]['timestamp']
        stamps[-1] = stamps[-2]
        with self.assertRaises(ValueError):
            parse_provider(payload)

    def test_previous_session_and_adjusted_alignment(self):
        stamps = [1700000000 + 86400 * i for i in range(100)]
        raw = list(range(100, 200))
        adjusted = [float(i) / 2 for i in raw]
        adjusted[10] = None
        payload = {'chart': {'result': [{'meta': {
            'regularMarketPrice': 200, 'regularMarketTime': stamps[-1],
            'chartPreviousClose': 100, 'currency': 'USD'}, 'timestamp': stamps,
            'indicators': {'quote': [{'close': raw, 'volume': [100] * 100}],
                           'adjclose': [{'adjclose': adjusted}]}}]}}
        result = parse_provider(payload)
        self.assertEqual(result['change'], 2)
        self.assertEqual(len(result['bars']), 99)
        self.assertEqual(result['bars'][10]['close'], adjusted[11])
        self.assertEqual(result['history_basis'], 'Adjusted daily close')


if __name__ == '__main__':
    unittest.main()
