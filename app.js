const stockData = {
  NVDA: { name: 'NVIDIA Corporation', meta: 'NASDAQ: NVDA · Technology', icon: 'N', iconClass: 'nvda', price: 178.42, change: '+$4.86', percent: '(+2.80%)', forecast: 191.80, confidence: 87.4, signal: 'BULLISH', note: 'Strong upward momentum', color: '#74a3b6', seed: 12 },
  AAPL: { name: 'Apple Inc.', meta: 'NASDAQ: AAPL · Technology', icon: 'A', iconClass: 'apple', price: 231.54, change: '+$3.24', percent: '(+1.42%)', forecast: 240.20, confidence: 79.2, signal: 'BULLISH', note: 'Steady accumulation', color: '#779bb0', seed: 23 },
  MSFT: { name: 'Microsoft Corporation', meta: 'NASDAQ: MSFT · Technology', icon: 'M', iconClass: 'msft', price: 498.30, change: '+$4.35', percent: '(+0.88%)', forecast: 512.70, confidence: 82.1, signal: 'BULLISH', note: 'Cloud growth tailwind', color: '#749f8e', seed: 31 },
  TSLA: { name: 'Tesla, Inc.', meta: 'NASDAQ: TSLA · Automotive', icon: 'T', iconClass: 'tesla', price: 342.11, change: '−$4.30', percent: '(−1.24%)', forecast: 356.40, confidence: 68.8, signal: 'NEUTRAL', note: 'Mixed momentum signals', color: '#d57e6d', seed: 44 },
  AMZN: { name: 'Amazon.com, Inc.', meta: 'NASDAQ: AMZN · Consumer', icon: 'A', iconClass: 'amazon', price: 228.16, change: '+$2.91', percent: '(+1.29%)', forecast: 237.80, confidence: 81.6, signal: 'BULLISH', note: 'Retail momentum improving', color: '#d18c53', seed: 52 },
  GOOGL: { name: 'Alphabet Inc.', meta: 'NASDAQ: GOOGL · Communication', icon: 'G', iconClass: 'google', price: 251.08, change: '+$3.62', percent: '(+1.46%)', forecast: 263.50, confidence: 84.7, signal: 'BULLISH', note: 'Search and cloud strength', color: '#7c9caf', seed: 61 },
  META: { name: 'Meta Platforms, Inc.', meta: 'NASDAQ: META · Communication', icon: 'M', iconClass: 'meta', price: 736.22, change: '+$8.44', percent: '(+1.16%)', forecast: 768.90, confidence: 80.3, signal: 'BULLISH', note: 'Ad demand remains resilient', color: '#6689ad', seed: 73 },
  AMD: { name: 'Advanced Micro Devices', meta: 'NASDAQ: AMD · Semiconductors', icon: 'A', iconClass: 'amd', price: 174.63, change: '−$1.95', percent: '(−1.10%)', forecast: 181.40, confidence: 72.5, signal: 'NEUTRAL', note: 'Awaiting next catalyst', color: '#8b7e91', seed: 86 },
  NFLX: { name: 'Netflix, Inc.', meta: 'NASDAQ: NFLX · Entertainment', icon: 'N', iconClass: 'netflix', price: 1248.60, change: '+$16.25', percent: '(+1.32%)', forecast: 1299.40, confidence: 78.6, signal: 'BULLISH', note: 'Subscriber growth is accelerating', color: '#c85f5c', seed: 97 },
  JPM: { name: 'JPMorgan Chase & Co.', meta: 'NYSE: JPM · Financials', icon: 'J', iconClass: 'jpm', price: 321.44, change: '+$2.18', percent: '(+0.68%)', forecast: 329.80, confidence: 75.4, signal: 'BULLISH', note: 'Banking strength remains steady', color: '#6e8da6', seed: 108 },
  V: { name: 'Visa Inc.', meta: 'NYSE: V · Financials', icon: 'V', iconClass: 'visa', price: 352.78, change: '+$1.96', percent: '(+0.56%)', forecast: 364.20, confidence: 77.8, signal: 'BULLISH', note: 'Payments volume is resilient', color: '#7186b0', seed: 119 },
  JNJ: { name: 'Johnson & Johnson', meta: 'NYSE: JNJ · Healthcare', icon: 'J', iconClass: 'jnj', price: 188.24, change: '−$0.74', percent: '(−0.39%)', forecast: 191.70, confidence: 70.9, signal: 'NEUTRAL', note: 'Defensive outlook with low volatility', color: '#789b98', seed: 130 },
  XOM: { name: 'Exxon Mobil Corporation', meta: 'NYSE: XOM · Energy', icon: 'X', iconClass: 'xom', price: 119.86, change: '+$1.04', percent: '(+0.87%)', forecast: 124.60, confidence: 73.1, signal: 'BULLISH', note: 'Energy prices support momentum', color: '#9c875d', seed: 141 },
  WMT: { name: 'Walmart Inc.', meta: 'NYSE: WMT · Consumer', icon: 'W', iconClass: 'wmt', price: 108.52, change: '+$0.82', percent: '(+0.76%)', forecast: 112.10, confidence: 76.2, signal: 'BULLISH', note: 'Consumer demand remains durable', color: '#6f9a9d', seed: 152 },
  COIN: { name: 'Coinbase Global, Inc.', meta: 'NASDAQ: COIN · Digital assets', icon: 'C', iconClass: 'coin', price: 318.76, change: '−$6.42', percent: '(−1.97%)', forecast: 337.50, confidence: 64.8, signal: 'NEUTRAL', note: 'High volatility around crypto flows', color: '#628ab1', seed: 163 },
  ORCL: { name: 'Oracle Corporation', meta: 'NYSE: ORCL · Enterprise software', icon: 'O', iconClass: 'oracle', price: 251.42, change: '+$2.74', percent: '(+1.10%)', forecast: 260.80, confidence: 74.6, signal: 'BULLISH', note: 'Cloud infrastructure demand is firm', color: '#b67568', seed: 174 },
  CRM: { name: 'Salesforce, Inc.', meta: 'NYSE: CRM · Enterprise software', icon: 'S', iconClass: 'salesforce', price: 268.91, change: '+$1.62', percent: '(+0.61%)', forecast: 279.60, confidence: 73.8, signal: 'BULLISH', note: 'Recurring revenue remains healthy', color: '#6f9eb0', seed: 185 },
  INTC: { name: 'Intel Corporation', meta: 'NASDAQ: INTC · Semiconductors', icon: 'I', iconClass: 'intel', price: 39.84, change: '−$0.48', percent: '(−1.19%)', forecast: 42.30, confidence: 62.4, signal: 'NEUTRAL', note: 'Turnaround execution remains uncertain', color: '#78869b', seed: 196 },
  BAC: { name: 'Bank of America Corp.', meta: 'NYSE: BAC · Financials', icon: 'B', iconClass: 'bac', price: 48.72, change: '+$0.34', percent: '(+0.70%)', forecast: 50.10, confidence: 71.7, signal: 'BULLISH', note: 'Credit outlook is stable', color: '#607b9a', seed: 207 },
  PFE: { name: 'Pfizer Inc.', meta: 'NYSE: PFE · Healthcare', icon: 'P', iconClass: 'pfe', price: 28.64, change: '−$0.21', percent: '(−0.73%)', forecast: 29.50, confidence: 67.9, signal: 'NEUTRAL', note: 'Pipeline catalysts remain mixed', color: '#789b91', seed: 218 }
};
let currentTicker = 'NVDA';
let currentRange = '1W';
let detailTimer;
let livePrice = null;
let marketRefreshTimer;
const savedFavorites = new Set(JSON.parse(localStorage.getItem('stockFavorites') || '[]'));
const savedDetails = JSON.parse(localStorage.getItem('stockDetails') || '{}');
let authSession = JSON.parse(localStorage.getItem('predictSession') || 'null');
const $ = (selector) => document.querySelector(selector);
const supabaseClient = window.supabaseClient || null;
const hasCloudBackend = Boolean(supabaseClient);

function updateMarketDate() {
  const today = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());
  $('#marketDate').textContent = today.toUpperCase();
}

async function loadCloudData() {
  if (!supabaseClient || !authSession?.id) return;
  const { data: favorites } = await supabaseClient.from('favorites').select('symbol').eq('user_id', authSession.id);
  if (favorites) { savedFavorites.clear(); favorites.forEach((item) => savedFavorites.add(item.symbol)); }
  const { data: notes } = await supabaseClient.from('stock_notes').select('symbol,target,alert,note').eq('user_id', authSession.id);
  if (notes) notes.forEach((item) => { savedDetails[item.symbol] = { target: item.target || '', alert: item.alert || '', note: item.note || '' }; });
  renderWatchlist(); renderMarketDirectory(); updateDashboard(currentTicker);
}

async function saveCloudFavorite(ticker, isFavorite) {
  if (!supabaseClient || !authSession?.id) return;
  if (isFavorite) await supabaseClient.from('favorites').upsert({ user_id: authSession.id, symbol: ticker });
  else await supabaseClient.from('favorites').delete().eq('user_id', authSession.id).eq('symbol', ticker);
}

function updateAuthUI() {
  const button = $('#authButton');
  const displayName = authSession?.name || 'Investor';
  button.textContent = authSession ? `Hi, ${displayName}` : 'Sign in';
  button.classList.toggle('signed-in', Boolean(authSession));
  const profileName = document.querySelector('.profile strong');
  if (profileName) profileName.textContent = authSession ? displayName : 'Alex Smith';
}

function setAuthMode(mode) {
  const register = mode === 'register';
  document.querySelectorAll('.auth-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.authMode === mode));
  document.querySelector('.register-field').hidden = !register;
  $('#authTitle').textContent = register ? 'Create your workspace' : 'Welcome back';
  $('#authSubmit').textContent = register ? 'Create account' : 'Sign in';
  $('#authPassword').setAttribute('autocomplete', register ? 'new-password' : 'current-password');
  $('#authError').textContent = '';
}

async function openAuth() {
  if (authSession) { if (supabaseClient) await supabaseClient.auth.signOut(); authSession = null; localStorage.removeItem('predictSession'); updateAuthUI(); showToast('Signed out'); return; }
  $('#authBackdrop').hidden = false; $('#authEmail').focus();
}

async function refreshMarketData() {
  const symbols = Object.keys(stockData);
  const results = await Promise.allSettled(symbols.map(async (symbol) => {
    const response = await fetch(`/api/quote?symbol=${symbol}`);
    if (!response.ok) throw new Error('Quote unavailable');
    return response.json();
  }));
  let updated = 0;
  results.forEach((result, index) => {
    if (result.status !== 'fulfilled' || !Number.isFinite(result.value.price)) return;
    const data = stockData[symbols[index]];
    if (!data.forecastRatio) data.forecastRatio = data.forecast / data.price;
    data.price = result.value.price;
    data.change = `${result.value.change >= 0 ? '+' : '−'}$${Math.abs(result.value.change).toFixed(2)}`;
    data.percent = `(${result.value.percent >= 0 ? '+' : '−'}${Math.abs(result.value.percent).toFixed(2)}%)`;
    data.forecast = data.price * data.forecastRatio;
    data.liveCloses = result.value.closes.filter(Number.isFinite);
    updated += 1;
  });
  if (updated) {
    renderMarketDirectory(); renderWatchlist(); updateDashboard(currentTicker);
    if (!$('.stock-detail').hidden) openStockDetail(currentTicker);
    $('.last-sync').textContent = `Last synced just now · ${updated}/${symbols.length} markets`;
    $('#quoteStatus').textContent = `Live quote · updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    $('#quoteStatus').textContent = 'Live feed unavailable · last known quote';
  }
  return updated;
}

function makeSeries(data, range) {
  const count = range === '1Y' ? 48 : range === '3M' ? 32 : range === '1M' ? 22 : 12;
  if (data.liveCloses && data.liveCloses.length >= 2) {
    const history = data.liveCloses.slice(-count);
    history[history.length - 1] = data.price;
    const future = [data.price];
    for (let i = 1; i <= 7; i += 1) future.push(data.price + (data.forecast - data.price) * (i / 7));
    return { history, future };
  }
  const history = [];
  let value = data.price * (range === '1Y' ? 0.62 : range === '3M' ? 0.78 : range === '1M' ? 0.9 : 0.95);
  for (let i = 0; i < count; i += 1) {
    const wave = Math.sin((i + data.seed) * 0.8) * data.price * 0.012;
    const trend = (data.price - value) / (count - i + 1) * 0.72;
    value += trend + wave;
    history.push(value);
  }
  history[history.length - 1] = data.price;
  const future = [data.price];
  for (let i = 1; i <= 7; i += 1) future.push(data.price + (data.forecast - data.price) * (i / 7) + Math.sin(i * 1.4 + data.seed) * data.price * 0.005);
  return { history, future };
}
function drawChart() {
  const svg = $('#priceChart');
  const data = stockData[currentTicker];
  const series = makeSeries(data, currentRange);
  const all = [...series.history, ...series.future];
  const min = Math.min(...all) * 0.975;
  const max = Math.max(...all) * 1.025;
  const width = 900; const height = 360; const left = 32; const right = 8; const top = 18; const bottom = 19;
  const x = (index) => left + index * ((width - left - right) / (all.length - 1));
  const y = (value) => top + (max - value) * ((height - top - bottom) / (max - min));
  const actual = series.history.map((value, i) => `${x(i)},${y(value)}`).join(' ');
  const forecast = series.future.map((value, i) => `${x(series.history.length - 1 + i)},${y(value)}`).join(' ');
  const bandTop = series.future.map((value, i) => `${x(series.history.length - 1 + i)},${y(value + data.price * 0.018 * i)}`).join(' ');
  const bandBottom = [...series.future].reverse().map((value, reverseIndex) => { const i = series.future.length - 1 - reverseIndex; return `${x(series.history.length - 1 + i)},${y(value - data.price * 0.018 * i)}`; }).join(' ');
  const grid = [0, 1, 2, 3, 4].map((line) => { const value = min + (max - min) * (line / 4); const yy = y(value); return `<line x1="${left}" x2="${width}" y1="${yy}" y2="${yy}" class="grid-line"/><text x="0" y="${yy + 3}" class="axis-label">$${Math.round(value)}</text>`; }).join('');
  const split = x(series.history.length - 1);
  svg.innerHTML = `${grid}<rect x="${split}" y="${top}" width="${width - split}" height="${height - top - bottom}" class="forecast-zone"/><line x1="${split}" x2="${split}" y1="${top}" y2="${height - bottom}" class="split-line"/><polygon points="${bandTop} ${bandBottom}" class="confidence-area"/><polyline points="${actual}" class="actual-line"/><polyline points="${forecast}" class="forecast-line"/><circle cx="${split}" cy="${y(data.price)}" r="4.5" class="current-point"/><circle cx="${x(all.length - 1)}" cy="${y(series.future.at(-1))}" r="4" class="future-point"/>`;
}
function formatMoney(value) {
  return `$${value.toFixed(2)}`;
}

function updateForecastCheckpoints(data) {
  const horizons = [
    { expected: data.price + (data.forecast - data.price) * 0.2, spread: 0.012, probability: 91 },
    { expected: data.forecast, spread: 0.038, probability: Math.round(data.confidence) },
    { expected: data.price + (data.forecast - data.price) * 1.8, spread: 0.08, probability: 74 }
  ];
  const rows = [
    ['tomorrowExpected', 'tomorrowRange', 'tomorrowProbability'],
    ['sevenDayExpected', 'sevenDayRange', 'sevenDayProbability'],
    ['thirtyDayExpected', 'thirtyDayRange', 'thirtyDayProbability']
  ];
  horizons.forEach((horizon, index) => {
    const low = horizon.expected * (1 - horizon.spread);
    const high = horizon.expected * (1 + horizon.spread);
    const [expectedId, rangeId, probabilityId] = rows[index];
    $(`#${expectedId}`).textContent = formatMoney(horizon.expected);
    $(`#${rangeId}`).textContent = `${formatMoney(low)} — ${formatMoney(high)}`;
    $(`#${probabilityId}`).style.width = `${horizon.probability}%`;
    $(`#${probabilityId}`).parentElement.lastChild.textContent = `${horizon.probability}%`;
  });
}

function renderWatchlist() {
  const symbols = [...savedFavorites];
  $('#favoritesCount').textContent = savedFavorites.size;
  if (!symbols.length) {
    $('#watchlistRows').innerHTML = '<div class="watchlist-empty"><span>☆</span><b>Your Watchlist is empty</b><small>Add a stock from Markets to follow its prediction.</small></div>';
    return;
  }
  $('#watchlistRows').innerHTML = symbols.map((symbol) => {
    const data = stockData[symbol];
    const isDown = data.change.includes('−');
    return `<button class="watch-row" data-watch-ticker="${symbol}" type="button"><span class="mini-icon" style="background:${data.color}">${data.icon}</span><span><b>${data.name.replace(' Corporation', '').replace(' Inc.', '')}</b><small>${symbol}</small></span><strong>${formatMoney(data.price)}</strong><span class="${isDown ? 'negative' : 'positive'}">${data.percent}</span></button>`;
  }).join('');
  document.querySelectorAll('[data-watch-ticker]').forEach((row) => row.addEventListener('click', () => openStockDetail(row.dataset.watchTicker)));
}

function renderMarketDirectory() {
  $('#marketCount').textContent = `${Object.keys(stockData).length} symbols`;
  $('#marketDirectory').innerHTML = Object.entries(stockData).map(([symbol, data]) => {
    const isFavorite = savedFavorites.has(symbol);
    const isDown = data.change.includes('−');
    return `<article class="market-card"><button class="market-card-main" data-market-ticker="${symbol}" type="button"><span class="market-logo" style="background:${data.color}">${data.icon}</span><span class="market-card-name"><b>${data.name}</b><small>${symbol} · ${data.meta.split('· ')[1]}</small></span><strong>${formatMoney(data.price)}</strong><span class="${isDown ? 'negative' : 'positive'}">${data.percent}</span></button><button class="market-favorite ${isFavorite ? 'saved' : ''}" data-market-favorite="${symbol}" type="button" aria-label="${isFavorite ? 'Remove' : 'Add'} ${symbol} ${isFavorite ? 'from' : 'to'} Watchlist" title="${isFavorite ? 'Remove from Watchlist' : 'Add to Watchlist'}">${isFavorite ? '✓' : '+'}</button></article>`;
  }).join('');
  document.querySelectorAll('[data-market-ticker]').forEach((button) => button.addEventListener('click', () => openStockDetail(button.dataset.marketTicker)));
  document.querySelectorAll('[data-market-favorite]').forEach((button) => button.addEventListener('click', () => toggleFavorite(button.dataset.marketFavorite)));
}

async function toggleFavorite(ticker) {
  const saved = savedFavorites.has(ticker);
  if (saved) savedFavorites.delete(ticker); else savedFavorites.add(ticker);
  localStorage.setItem('stockFavorites', JSON.stringify([...savedFavorites]));
  await saveCloudFavorite(ticker, !saved);
  renderWatchlist(); renderMarketDirectory(); updateDashboard(currentTicker);
  if (!$('.stock-detail').hidden && ticker === currentTicker) { const favorite = savedFavorites.has(ticker); $('#detailFavorite').textContent = favorite ? '★ Saved to Watchlist' : '☆ Add to Watchlist'; $('#detailFavorite').classList.toggle('saved', favorite); }
  showToast(saved ? `${ticker} removed from favorites` : `${ticker} added to favorites`);
}

function openStockDetail(ticker) {
  const data = stockData[ticker];
  currentTicker = ticker;
  window.clearInterval(detailTimer);
  livePrice = stockData[ticker].price;
  updateDashboard(ticker);
  setPageView('Detail');
  $('.stock-detail').hidden = false;
  $('.breadcrumb strong').textContent = `${ticker} detail`;
  $('#detailLogo').textContent = data.icon; $('#detailLogo').style.background = data.color;
  $('#detailName').textContent = data.name; $('#detailMeta').textContent = data.meta;
  $('#detailPrice').textContent = formatMoney(data.price); $('#detailChange').textContent = `${data.change} ${data.percent}`;
  $('#detailForecast').textContent = formatMoney(data.forecast); $('#detailConfidence').textContent = `${data.confidence}%`;
  $('#detailSignal').textContent = data.note; $('#detailMomentum').textContent = data.signal === 'BULLISH' ? 'Strong' : 'Mixed'; $('#detailRisk').textContent = data.confidence > 80 ? 'Low' : 'Medium';
  $('#targetPrice').value = savedDetails[ticker]?.target || ''; $('#alertPrice').value = savedDetails[ticker]?.alert || ''; $('#reviewNote').value = savedDetails[ticker]?.note || '';
  const favorite = savedFavorites.has(ticker); $('#detailFavorite').textContent = favorite ? '★ Saved to Watchlist' : '☆ Add to Watchlist'; $('#detailFavorite').classList.toggle('saved', favorite);
  drawDetailChart(data); detailTimer = window.setInterval(() => updateLiveDetail(data), 2600); window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeStockDetail() {
  window.clearInterval(detailTimer); $('.stock-detail').hidden = true; setPageView('Markets');
}

function updateLiveDetail(data) {
  const movement = (Math.random() - 0.46) * data.price * 0.0025;
  livePrice = Math.max(data.price * 0.94, livePrice + movement);
  const tickPercent = ((livePrice / data.price - 1) * 100).toFixed(2);
  $('#detailPrice').textContent = formatMoney(livePrice);
  $('#detailTick').textContent = `${tickPercent >= 0 ? '+' : ''}${tickPercent}%`;
  $('#detailTick').className = tickPercent >= 0 ? 'positive' : 'negative';
  $('#detailStatus').textContent = 'Market simulation live';
  drawDetailChart(data);
}

function setPageView(view) {
  const groups = {
    Overview: ['.page-heading', '.toolbar', '.market-overview', '.dashboard-grid', '.bottom-grid'],
    Markets: ['.toolbar', '.markets-panel'],
    Watchlist: ['.bottom-grid'],
    Models: ['.dashboard-grid'],
    Reports: ['.bottom-grid']
  };
  document.querySelector('.main-content').dataset.pageView = view;
  ['.page-heading', '.toolbar', '.market-overview', '.dashboard-grid', '.bottom-grid', '.markets-panel', '.stock-detail'].forEach((selector) => { const element = $(selector); if (element) element.hidden = true; });
  $('.forecast-panel').hidden = false; $('.watchlist-panel').hidden = false; $('.chart-panel').hidden = false;
  (groups[view] || groups.Overview).forEach((selector) => { const element = $(selector); if (element) element.hidden = false; });
  if (view === 'Watchlist') { $('.forecast-panel').hidden = true; $('.watchlist-panel').hidden = false; }
  if (view === 'Models') $('.chart-panel').hidden = true;
  if (view === 'Reports') $('.watchlist-panel').hidden = true;
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function drawDetailChart(data) {
  const series = makeSeries(data, currentRange); series.history[series.history.length - 1] = livePrice || data.price; const values = [...series.history, ...series.future]; const low = Math.min(...values) * .98; const high = Math.max(...values) * 1.02; const points = values.map((value, index) => `${index * (880 / (values.length - 1)) + 10},${280 - ((value - low) / (high - low)) * 250}`).join(' '); const split = series.history.length * (880 / (values.length - 1)) + 10;
  $('#detailChart').innerHTML = `<line x1="10" x2="890" y1="55" y2="55" class="grid-line"/><line x1="10" x2="890" y1="155" y2="155" class="grid-line"/><line x1="10" x2="890" y1="255" y2="255" class="grid-line"/><line x1="${split}" x2="${split}" y1="18" y2="280" class="split-line"/><polyline points="${points}" class="actual-line live-line"/><circle cx="${split}" cy="${280 - (((livePrice || data.price) - low) / (high - low)) * 250}" r="5" class="current-point"/>`;
}

function updateDashboard(ticker) {
  const data = stockData[ticker]; currentTicker = ticker;
  $('#companyName').textContent = data.name; $('#companyMeta').textContent = data.meta;
  $('#currentPrice').textContent = `$${data.price.toFixed(2)}`; $('#dailyChange').innerHTML = `${data.change} <small>${data.percent}</small>`;
  $('#dailyChange').className = `change ${data.signal === 'NEUTRAL' ? 'negative' : 'positive'}`;
  $('#forecastValue').textContent = `$${data.forecast.toFixed(2)}`;
  $('#forecastChange').textContent = `${data.forecast > data.price ? '+' : ''}${((data.forecast / data.price - 1) * 100).toFixed(1)}% expected`;
  $('#signal').textContent = data.signal; $('#signal').className = `signal ${data.signal === 'NEUTRAL' ? 'negative' : 'positive'}`;
  $('#signal').nextElementSibling.textContent = data.note; $('#confidenceValue').textContent = `${data.confidence}%`; $('#confidenceBar').style.width = `${data.confidence}%`;
  $('#chartTooltip strong').textContent = formatMoney(data.price);
  const favoriteButton = $('#favoriteButton'); const isFavorite = savedFavorites.has(ticker);
  favoriteButton.textContent = isFavorite ? '★' : '☆'; favoriteButton.classList.toggle('saved', isFavorite); favoriteButton.setAttribute('aria-label', isFavorite ? 'Remove stock from favorites' : 'Add stock to favorites');
  updateForecastCheckpoints(data);
  $('.symbol-icon').textContent = data.icon; $('.symbol-icon').style.background = data.color; $('#tickerInput').value = ticker;
  document.querySelectorAll('.ticker-chip').forEach((button) => button.classList.toggle('selected', button.dataset.ticker === ticker));
  drawChart();
}

document.querySelectorAll('.ticker-chip').forEach((button) => button.addEventListener('click', () => updateDashboard(button.dataset.ticker)));
document.querySelectorAll('.range').forEach((button) => button.addEventListener('click', () => { currentRange = button.dataset.range; document.querySelectorAll('.range').forEach((item) => item.classList.remove('active')); button.classList.add('active'); drawChart(); }));
$('#tickerInput').addEventListener('keydown', (event) => { if (event.key === 'Enter') { const ticker = $('#tickerInput').value.trim().toUpperCase(); if (stockData[ticker]) updateDashboard(ticker); else $('#tickerInput').value = currentTicker; } });
document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach((nav) => nav.classList.remove('active'));
  item.classList.add('active');
  $('.breadcrumb strong').textContent = item.dataset.view;
  setPageView(item.dataset.view);
  showToast(`${item.dataset.view} view opened`);
}));
function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('visible');
  window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => toast.classList.remove('visible'), 2600);
}
$('#filterButton').addEventListener('click', () => { const active = $('#filterButton').classList.toggle('active'); $('#filterButton').setAttribute('aria-expanded', active); showToast(active ? 'Showing high-confidence signals' : 'Showing all signals'); });
$('#refreshButton').addEventListener('click', async () => { const button = $('#refreshButton'); button.classList.add('spinning'); const updated = await refreshMarketData(); $('.last-sync').textContent = updated ? `Last synced just now · ${updated}/${Object.keys(stockData).length} markets` : 'Live data unavailable · showing last known prices'; window.setTimeout(() => button.classList.remove('spinning'), 500); showToast(updated ? 'All market prices refreshed' : 'Using last known market prices'); });
$('#detailsButton').addEventListener('click', () => { const panel = $('.insight-panel'); const expanded = panel.classList.toggle('details-open'); $('#detailsButton').textContent = expanded ? 'Hide details ↑' : 'Details ↗'; showToast(expanded ? 'Full model breakdown shown' : 'Model breakdown collapsed'); });
$('#favoriteButton').addEventListener('click', () => toggleFavorite(currentTicker));
$('#backToMarkets').addEventListener('click', closeStockDetail);
$('#detailFavorite').addEventListener('click', () => toggleFavorite(currentTicker));
$('#detailRefresh').addEventListener('click', async () => { await refreshMarketData(); drawDetailChart(stockData[currentTicker]); $('#detailStatus').textContent = 'Refreshed just now'; showToast(`${currentTicker} detail refreshed`); });
$('#buyAction').addEventListener('click', () => showToast(`Bullish monitor enabled for ${currentTicker}`));
$('#sellAction').addEventListener('click', () => showToast(`Pullback monitor enabled for ${currentTicker}`));
$('#saveDetails').addEventListener('click', async () => { savedDetails[currentTicker] = { target: $('#targetPrice').value, alert: $('#alertPrice').value, note: $('#reviewNote').value }; localStorage.setItem('stockDetails', JSON.stringify(savedDetails)); if (supabaseClient && authSession?.id) await supabaseClient.from('stock_notes').upsert({ user_id: authSession.id, symbol: currentTicker, target: $('#targetPrice').value || null, alert: $('#alertPrice').value || null, note: $('#reviewNote').value }); $('#savedMessage').textContent = 'Saved just now'; showToast(`${currentTicker} settings saved`); });
$('#notificationsButton').addEventListener('click', () => showToast('No new market alerts'));
$('#authButton').addEventListener('click', openAuth);
$('#authClose').addEventListener('click', () => { $('#authBackdrop').hidden = true; });
$('#authBackdrop').addEventListener('click', (event) => { if (event.target === $('#authBackdrop')) $('#authBackdrop').hidden = true; });
document.querySelectorAll('.auth-tab').forEach((tab) => tab.addEventListener('click', () => setAuthMode(tab.dataset.authMode)));
$('#authForm').addEventListener('submit', async (event) => { event.preventDefault(); const email = $('#authEmail').value.trim(); const password = $('#authPassword').value; const username = $('#authName').value.trim(); const register = document.querySelector('.auth-tab.active').dataset.authMode === 'register'; if (password.length < 6) { $('#authError').textContent = 'Use a password with at least 6 characters.'; return; } if (register && !username) { $('#authError').textContent = 'Choose a username to continue.'; return; } if (supabaseClient) { const result = register ? await supabaseClient.auth.signUp({ email, password, options: { data: { username } } }) : await supabaseClient.auth.signInWithPassword({ email, password }); if (result.error) { $('#authError').textContent = result.error.message; return; } authSession = { id: result.data.user?.id, email, name: result.data.user?.user_metadata?.username || email.split('@')[0] }; await loadCloudData(); } else { authSession = { email, name: register ? username : email.split('@')[0] }; } localStorage.setItem('predictSession', JSON.stringify(authSession)); updateAuthUI(); $('#authBackdrop').hidden = true; $('#authForm').reset(); setAuthMode('signin'); showToast(register ? 'Account created' : 'Signed in successfully'); });
$('#viewWatchlistButton').addEventListener('click', () => { document.querySelector('[data-view="Watchlist"]').click(); document.querySelector('.watchlist-panel').scrollIntoView({ behavior: 'smooth', block: 'center' }); showToast('Watchlist opened'); });
$('#exportButton').addEventListener('click', () => { const report = `Stock Prediction Report\n${stockData[currentTicker].name} (${currentTicker})\nCurrent price: $${stockData[currentTicker].price}\n7-day forecast: $${stockData[currentTicker].forecast}`; const blob = new Blob([report], { type: 'text/plain' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${currentTicker}-prediction-report.txt`; link.click(); URL.revokeObjectURL(link.href); showToast(`${currentTicker} report downloaded`); });
updateMarketDate();
renderWatchlist();
renderMarketDirectory();
updateAuthUI();
setPageView('Overview');
updateDashboard(currentTicker);
refreshMarketData();
marketRefreshTimer = window.setInterval(refreshMarketData, 60000);
if (supabaseClient) {
  supabaseClient.auth.getSession().then(async ({ data }) => {
    if (!data.session?.user) return;
    authSession = { id: data.session.user.id, email: data.session.user.email, name: data.session.user.user_metadata?.username || data.session.user.email.split('@')[0] };
    localStorage.setItem('predictSession', JSON.stringify(authSession)); updateAuthUI(); await loadCloudData();
  });
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (!session) { authSession = null; localStorage.removeItem('predictSession'); updateAuthUI(); }
  });
}
