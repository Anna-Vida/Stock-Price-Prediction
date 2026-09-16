import time
import unittest
import urllib.error
from unittest.mock import patch
from crypto_api import CACHE, demo_markets, normalize_markets
from server import app


class CryptoTests(unittest.TestCase):
    def setUp(self):
        CACHE.clear()
        self.client = app.test_client()

    def test_demo_selections_and_search(self):
        result = self.client.get('/api/crypto/markets?ids=bitcoin,solana&demo=1')
        self.assertEqual(result.status_code, 200)
        self.assertTrue(result.json['demo'])
        self.assertEqual([c['id'] for c in result.json['coins']], ['bitcoin', 'solana'])
        self.assertEqual(len(result.json['coins'][0]['sparkline_in_7d']['price']), 168)
        search = self.client.get('/api/crypto/search?q=doge&demo=1')
        self.assertEqual(search.json['coins'][0]['id'], 'dogecoin')

    def test_limits_and_unknown_ids(self):
        for ids in ('../secret', ','.join(f'coin-{i}' for i in range(21))):
            self.assertEqual(self.client.get('/api/crypto/markets', query_string={'ids': ids}).status_code, 400)
        self.assertEqual(self.client.get('/api/crypto/search', query_string={'q': 'x' * 61}).status_code, 400)
        self.assertEqual(self.client.get('/api/crypto/markets?ids=&demo=1').json['coins'], [])
        self.assertEqual(self.client.get('/api/crypto/markets?ids=unknown&demo=1').json['missing_ids'], ['unknown'])

    def test_provider_response_and_cache(self):
        with patch('crypto_api.provider', return_value=demo_markets(['bitcoin'])) as provider:
            result = self.client.get('/api/crypto/markets?ids=bitcoin')
            self.assertEqual(result.json['source'], 'CoinGecko')
            self.assertFalse(result.json['demo'])
            self.assertTrue(self.client.get('/api/crypto/markets?ids=bitcoin').json['cached'])
            self.assertEqual(provider.call_count, 1)

    def test_failure_stale_expiry_and_demo_isolation(self):
        self.client.get('/api/crypto/markets?ids=bitcoin&demo=1')
        with patch('crypto_api.provider', side_effect=urllib.error.URLError('down')):
            self.assertEqual(self.client.get('/api/crypto/markets?ids=bitcoin').status_code, 502)
        with patch('crypto_api.provider', return_value=demo_markets(['bitcoin'])):
            self.client.get('/api/crypto/markets?ids=bitcoin')
        key = ('markets', ('bitcoin',), False)
        _, value = CACHE[key]
        CACHE[key] = (time.monotonic() - 90, value)
        with patch('crypto_api.provider', side_effect=urllib.error.URLError('down')):
            stale = self.client.get('/api/crypto/markets?ids=bitcoin')
            self.assertTrue(stale.json['stale'])
            self.assertFalse(stale.json['demo'])
            CACHE[key] = (time.monotonic() - 901, value)
            self.assertEqual(self.client.get('/api/crypto/markets?ids=bitcoin').status_code, 502)

    def test_missing_values_and_broken_images(self):
        coin = demo_markets(['bitcoin'])[0]
        coin.update(market_cap=None, image='javascript:alert(1)')
        coin['sparkline_in_7d']['price'][5] = float('nan')
        clean = normalize_markets([coin])[0]
        self.assertIsNone(clean['market_cap'])
        self.assertEqual(clean['image'], '')
        self.assertIsNone(clean['sparkline_in_7d']['price'][5])
        self.assertEqual(len(clean['sparkline_in_7d']['price']), 168)

    def test_crypto_page_and_no_source_exposure(self):
        with self.client.get('/crypto') as response:
            self.assertEqual(response.status_code, 200)
        self.assertEqual(self.client.get('/crypto_api.py').status_code, 404)


if __name__ == '__main__':
    unittest.main()
