const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const root = __dirname;
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

function getYahooQuote(symbol) {
  return new Promise((resolve, reject) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=3mo&interval=1d`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        try {
          if (response.statusCode < 200 || response.statusCode >= 300) throw new Error(`Market provider returned ${response.statusCode}`);
          const result = JSON.parse(body).chart.result[0];
          const meta = result.meta;
          const price = Number(meta.regularMarketPrice ?? meta.previousClose);
          const previousClose = Number(meta.chartPreviousClose ?? meta.previousClose);
          if (!Number.isFinite(price) || !Number.isFinite(previousClose)) throw new Error('Incomplete quote');
          const change = price - previousClose;
          const percent = change / previousClose * 100;
          resolve({ symbol, price, change, percent, timestamps: result.timestamp || [], closes: result.indicators.quote[0].close || [] });
        } catch (error) { reject(error); }
      });
    }).on('error', reject);
  });
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, 'http://localhost:5500');
  if (requestUrl.pathname === '/api/quote') {
    try {
      const quote = await getYahooQuote(requestUrl.searchParams.get('symbol') || 'NVDA');
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
      response.end(JSON.stringify(quote));
    } catch (error) {
      response.writeHead(502, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'Live market data is temporarily unavailable' }));
    }
    return;
  }
  const requested = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const filePath = path.join(root, requested);
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404); response.end('Not found'); return;
  }
  response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(response);
});

const port = Number(process.env.PORT) || 5500;
server.listen(port, () => console.log(`Stock Price Prediction running at http://localhost:${port}`));
