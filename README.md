# Stock Price Prediction

A real-time stock market prediction and portfolio tracking application with live market data, user authentication, and cloud storage.

**Created by**: Anna Vida

## Features

- **Live Market Data**: Real-time stock prices fetched from Yahoo Finance API
- **20+ Markets**: NVDA, AAPL, MSFT, TSLA, GOOGL, META, AMD, and more
- **User Authentication**: Email/password sign-up and login via Supabase
- **Personal Watchlist**: Save your favorite stocks
- **Stock Details**: Live price tracking, forecasts, and model insights
- **Target & Alerts**: Set price targets and alerts for each stock
- **Dark Theme**: Professional dark mode interface
- **Cloud Storage**: Watchlist and notes persist in Supabase
- **Responsive Design**: Works on desktop and mobile

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Backend**: Node.js with Express
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Market Data**: Yahoo Finance API
- **Hosting**: Local development or cloud deployment

## Setup

### Prerequisites

- Node.js (v14+)
- Supabase account
- Git

### Installation

1. Clone the repository:

```bash
git clone https://github.com/Anna-Vida/Stock-Price-Prediction.git
cd Stock-Price-Prediction
```

2. Create a Supabase project at [supabase.com](https://supabase.com)

3. Add your Supabase credentials to `supabase-config.js`:

```javascript
window.SUPABASE_URL = 'https://your-project.supabase.co';
window.SUPABASE_ANON_KEY = 'your-publishable-key';
```

4. Run the SQL schema in Supabase **SQL Editor**:

Open `supabase-schema.sql` and execute the queries to create:
- `favorites` table
- `stock_notes` table
- Row-level security policies

5. Enable email authentication:

In Supabase, go to **Authentication → Providers** and enable **Email**.

## Running the App

Start the local server:

```bash
node server.js
```

Open [http://localhost:5500](http://localhost:5500) in your browser.

## Usage

### Create an Account

1. Click **Sign in**
2. Select **Create account**
3. Enter email, password, and username
4. Confirm your email (check your inbox)
5. Sign in with your credentials

### Browse Markets

- View all 20 stocks on the **Markets** page
- Real-time prices update every minute
- Click a stock card to see details

### Save Favorites

- Click the **☆** icon on any stock card
- Your watchlist syncs to Supabase

### Track Stocks

1. Click a stock to open its detail page
2. Set a **target price**
3. Add a **price alert**
4. Write a **review note**
5. Click **Save changes**

Data is stored in your Supabase account and persists across sessions.

### View Dashboard

The **Overview** shows:
- Top 3 stocks by signal strength
- Market summary
- Recent activity

## Project Structure

```
.
├── index.html          # Main HTML interface
├── styles.css          # Dark theme styles
├── app.js              # Frontend logic
├── server.js           # Node.js backend server
├── package.json        # Node.js start configuration
├── supabase-config.js  # Supabase connection
├── supabase-schema.sql # Database schema
└── README.md           # This file
```

## Database Schema

### `favorites` table

Stores user watchlist:

```sql
user_id (uuid)    - References auth.users
symbol (text)     - Stock ticker
created_at (timestamp)
```

### `stock_notes` table

Stores user targets, alerts, and notes:

```sql
user_id (uuid)    - References auth.users
symbol (text)     - Stock ticker
target (numeric)  - Target price
alert (numeric)   - Alert price
note (text)       - User review
updated_at (timestamp)
```

All data is protected by row-level security (RLS). Users can only access their own data.

## API Endpoints

### Market Data

```
GET /api/quote?symbol=NVDA
```

Returns live stock data:

```json
{
  "symbol": "NVDA",
  "price": 230.36,
  "change": 5.35,
  "percent": 5.35,
  "closes": [...]
}
```

## Authentication

The app uses Supabase Auth with:

- Email/password authentication
- Secure password hashing
- Session management
- Row-level security for data access

Passwords are never stored in the browser. Supabase handles all authentication securely.

## Live Data

Stock prices are fetched from Yahoo Finance every 60 seconds. Prices are not permanently stored; the app shows the latest quote from the market API.

## Development

To modify the app:

1. Edit `index.html` for structure
2. Edit `styles.css` for styling
3. Edit `app.js` for frontend logic
4. Edit `server.js` for backend changes
5. Test locally with `node server.js`
6. Push changes to GitHub

## Deployment With Render

This project includes a Node.js server because it proxies live Yahoo Finance data. Render is a suitable host for the complete app.

1. Push the project to GitHub.
2. Sign in at [render.com](https://render.com) and select **New → Web Service**.
3. Connect the `Anna-Vida/Stock-Price-Prediction` repository.
4. Use these settings:

```text
Environment: Node
Build command: npm install
Start command: npm start
```

5. Choose the free plan and click **Create Web Service**.
6. After deployment, copy the Render URL and add it in Supabase under **Authentication → URL Configuration → Site URL**.
7. Add the Render URL to **Redirect URLs** as well, then test sign-up and sign-in.

The server automatically uses Render's `PORT` environment variable. No market-data API key is required for the current Yahoo Finance proxy.

## License

MIT License - See LICENSE file for details.

## Support

For issues or questions, open an issue on [GitHub](https://github.com/Anna-Vida/Stock-Price-Prediction/issues).

## Author

Anna Vida - [GitHub](https://github.com/Anna-Vida)

---

**Note**: This is a demo application. Stock predictions are simulated and for educational purposes only. This is not financial advice. Do not make investment decisions based on this app's data.
