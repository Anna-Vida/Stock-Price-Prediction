# Predict — Stock research workspace

Created by Anna Vida. HTML5, compiled Tailwind CSS, a vanilla JavaScript stock workspace, a React/TypeScript crypto dashboard, and a Python Flask API served by Waitress. Supabase provides optional account authentication and cloud storage for stocks.

## Run on this computer

From PowerShell in the project directory:

```powershell
.\start.ps1
```

Open http://localhost:5500. Use the Crypto item inside the workspace navigation for cryptocurrency markets. The launcher uses the project-local Python runtime in `.tools/python` when present. This runtime is ignored by Git, not a system installation.

## Set up another computer

Install Python 3.12 or newer, then:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python server.py
```

On macOS/Linux, use `.venv/bin/python` instead. The compiled `styles.css` and `public/crypto/dashboard.js` are committed, so Node.js is needed only when rebuilding frontend changes. Use Node 22.12+ (Node 24 is used in checks).

```powershell
npm ci
npm run build
```

Edit stock markup in `index.html` / `app.js`, crypto components in `components/ui`, or theme and component styles in `src/input.css`, then rebuild. `npm run build` runs TypeScript checks, compiles the React bundle with Vite, and builds Tailwind. The setup follows the [Tailwind CLI documentation](https://tailwindcss.com/docs/installation/tailwind-cli).

## Crypto dashboard

The **Crypto** navigation item in the workspace opens the cryptocurrency dashboard. The supplied React component is integrated at `components/ui/crypto-dashboard.tsx`, with repaired JSX and its missing `BackgroundPlus` helper in `demos/background-plus.tsx`. It retains animated market cards, interactive seven-day charts, and coin search; removal controls, keyboard chart exploration, native-dialog focus handling, and request cancellation are implemented as well.

- Eight initial coins, searchable by name or symbol; add or remove up to 20. Selection persists on this device, separately from the stock watchlist. An empty selection stays empty after reload.
- USD prices, 24-hour change, market capitalization, volume, high/low, rank, and provider update timestamps.
- Seven-day price samples with mouse, touch, or keyboard slider exploration. Missing history shows an unavailable state rather than a fabricated chart.
- Market data is requested from CoinGecko through Python, refreshed once per minute while visible. No third-party CORS proxy is used.
- Provider errors are explicit. Recent cached values are labeled stale. Synthetic demo data is an explicit dropdown choice and never silently replaces live data.
- Coin logos come from provider metadata with a local icon fallback. No unrelated stock photography is required.

CoinGecko supports a [keyless public API](https://docs.coingecko.com/docs/keyless-public-api), subject to provider limits. Optionally set `COINGECKO_DEMO_API_KEY` in the server environment for a Demo API key. It is sent only in the server's request headers, never embedded in browser assets. Do not confuse CoinGecko's API plan name with this app's synthetic demo mode.

### React, TypeScript, and shadcn structure

React, React DOM, Framer Motion, Lucide React, TypeScript, and Vite are installed in `package.json`; `npm ci` restores them. The stock page remains independent of React.

- `components/ui/`: reusable UI components, matching shadcn conventions and the supplied component import path.
- `components.json`: shadcn configuration, using Tailwind v4 and TypeScript.
- `lib/utils.ts`: `cn()` helper using `clsx` and `tailwind-merge`.
- `tsconfig.json` and `vite.config.mjs`: `@/` alias points to the project root.
- `src/input.css`: shared Tailwind source, scanned for stock markup and React components.
- `src/crypto-main.tsx`: mounts React in `crypto.html`; `demos/crypto-demo.tsx` shows standalone usage.

The project is already configured; no separate React project or shadcn initialization is needed. To add a future shadcn component, run `npx shadcn@latest add button` from the project root, review generated files, and rebuild. Keeping these components in `components/ui` lets the CLI and `@/components/ui/...` imports agree on one location.

## Features

- Ticker search and a directory of 20 stocks, plus a personal watchlist.
- Daily historical chart with 1-month, 3-month, and 1-year display windows.
- Returns, annualized volatility, maximum drawdown, 14-session simple RSI, 20/50-session moving averages, and average volume.
- Statistical forecasts for 1, 7, and 30 trading sessions, with model uncertainty bands.
- Walk-forward model evaluation, including MAE, RMSE, percentage error, direction accuracy, and measured band coverage, compared with a last-close baseline.
- CSV export of history, forecasts, metrics, and evaluation results.
- Research notes, target prices, and above-threshold alerts checked on refresh while the page is open.
- Explicit synthetic demo mode for offline exploration. Provider failures never silently substitute demo prices.
- Responsive navigation, keyboard focus indicators, semantic tables, and a native sign-in dialog.

## Data and methodology

The backend requests two years of daily Yahoo Finance history. The endpoint is unofficial and may be delayed, blocked, or rate-limited. Responses are cached for 60 seconds; requests have a 12-second timeout. Concurrent requests for the same ticker share a fetch. If the provider fails, a cached response fetched less than 15 minutes ago may be returned with `stale: true` and a warning. It retains its original quote and fetch timestamps; stale quotes do not trigger alerts. With no recent cache, the API returns an error. Quotes include the provider's timestamp. The browser refreshes once a minute when visible, except while notes have unsaved changes.

Analytics use adjusted closes where supplied, filtering missing values while preserving date/volume alignment. Dates use the exchange timezone, and duplicate or unordered timestamps are rejected. Only a bar belonging to the unfinished current session is excluded; previous completed sessions remain available before market open. Missing volumes stay missing rather than becoming zero; the valid observation count is returned with the average. At least 90 valid price observations are required. Daily quote changes compare with the previous session's raw close, not the start of the historical range.

The **damped log-return drift** model estimates the last 60 log returns, shrinks their mean by 50%, and extrapolates from the latest completed historical close. Its 95% bands assume independent normal log returns and do not account for parameter uncertainty or all market risks. They are not empirically calibrated guarantees. It is a transparent statistical model, not a trained neural network.

Evaluation uses up to 90 rolling forecast origins per horizon, fitting only on observations available at each origin. Horizons are in trading sessions, not calendar days. Outcomes overlap and are not independent. Mean absolute error (MAE) and root mean squared error (RMSE) are in price units; lower is better. MAPE is percentage error. Measured band coverage is the percentage of historical outcomes within the predicted bands, not a calibration guarantee. The baseline forecasts the last known close. Direction accuracy distinguishes rising, falling, and flat prices. Historical direction accuracy is not forecast confidence. Evaluation dates and model version are included in exports. The model can underperform the baseline; the interface reports that explicitly. No claim of improved future accuracy is made.

Demo history is deterministic synthetic weekday data starting September 2025. It is labeled in the dashboard and exports and is never presented as current market data.

## Supabase

Existing `supabase-config.js` settings and the `favorites` / `stock_notes` schema are retained. For your own Supabase project:

1. Configure the project URL and public publishable key in `supabase-config.js`. Never put a service-role key in browser code.
2. Run `supabase-schema.sql` once in the project's SQL editor and enable email authentication.
3. Configure the application URL and authentication redirects for your deployment.

Guest watchlists and notes remain local. Signed-in local data is scoped by user ID, and cloud access uses Supabase sessions and row-level security. Existing guest data is migrated from the old browser storage keys. Failed signed-in saves remain in a per-account local queue. Pending changes, including favorite removals, take priority over older cloud values during sign-in. They retry on sign-in, browser reconnection, and each visible-page refresh interval. An older in-flight response cannot acknowledge a newer edit. This is single-browser pending-write protection, not conflict resolution between simultaneous edits on different devices. The Supabase JavaScript SDK loads from a CDN; the rest of the UI uses locally served assets.

## Tests

```powershell
python -m unittest discover -s tests -v
node --check app.js
npm run build:css
```

On this computer replace `python` with `.\.tools\python\python.exe`. With the server running, execute browser checks using an installed Chrome:

```powershell
node tests/browser.cjs
node tests/sync.cjs
node tests/crypto.cjs
```

The browser checks use the real local Python API in demo mode, with deterministic provider-error and delayed-response cases. Sync checks use a mocked Supabase client to test offline persistence, retries, races, and account isolation. They do not create Supabase accounts or write to cloud data. Set `PLAYWRIGHT_CHANNEL=chromium` to use Playwright's installed Chromium instead of local Chrome. GitHub Actions runs backend, CSS, JavaScript, and both browser suites.

## API

| Endpoint | Purpose |
| --- | --- |
| `/api/health` | Python service health |
| `/api/markets` | Ticker directory |
| `/api/quote?symbol=NVDA` | Quote, aligned history, analytics, forecasts, and backtests |
| `/api/quote?symbol=NVDA&demo=1` | Explicit synthetic demo |
| `/api/crypto/markets?ids=bitcoin,ethereum` | CoinGecko market cards and seven-day sparklines |
| `/api/crypto/search?q=bitcoin` | Coin search (up to 10 results) |

Both crypto endpoints accept `demo=1` for synthetic demo data. Market IDs are validated, deduplicated, and limited to 20; search queries are limited to 60 characters. Provider responses are cached for 60 seconds with labeled stale market responses allowed for up to 15 minutes after a successful fetch. No-data selections are returned in `missing_ids`.

Only known public frontend assets are served. Source code, `.git`, and configuration files other than the public Supabase browser configuration are not exposed.

## Deployment

### Render

Render is the recommended host for the complete application because it runs the Python API and serves the stock and crypto frontend from the same service.

1. Sign in at [render.com](https://render.com/) with GitHub.
2. Choose **New +** and **Blueprint**.
3. Select `Anna-Vida/Stock-Price-Prediction`.
4. Review the `render.yaml` service and choose the free plan.
5. Click **Apply** and wait for the first deploy to finish.
6. Open the generated `https://<service-name>.onrender.com` URL.

Render redeploys the service automatically after future pushes to the repository's `main` branch. The free service may sleep after inactivity, so the first request after a quiet period can take longer.

`render.yaml` configures a Python web service using `pip install -r requirements.txt`, `python server.py`, and `/api/health`. `HOST=0.0.0.0` enables the hosting platform to reach the service; `PORT` is read from the environment. Locally, the default binding is `127.0.0.1:5500`.

Run `npm run build` and commit `styles.css` plus `public/crypto/dashboard.js` when changing frontend code before deployment. The Python deployment serves these prebuilt assets and does not need Node at runtime. The previous Node server has been replaced; an existing Render service must switch to a Python runtime or be recreated using the blueprint. Deployment is not performed by local setup.

Alternatively, the included Dockerfile packages the Python application and compiled public assets, runs as a non-root user, and excludes local data and development tools. Build with `docker build -t predict .` and run with `docker run --rm -p 5500:5500 predict`. Container execution requires Docker and is separate from the locally tested Python startup.

Educational research only; forecasts are uncertain and are not financial advice.
