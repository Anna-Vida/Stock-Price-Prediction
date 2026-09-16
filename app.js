'use strict';
const $ = (selector) => document.querySelector(selector);
const readLocal = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const writeLocal = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { toast('Browser storage unavailable. Changes may not persist.'); return false; } };
const state = { symbol: 'NVDA', view: 'overview', range: 66, demo: false, trajectoryTilt: 0, trajectoryBand: 100, quote: null, markets: [], user: null, favorites: [], notes: {}, pending: { favorites: {}, notes: {} }, request: 0, notesDirty: false };
const cloud = window.supabaseClient;
let controller, toastTimer, authGeneration = 0, hydratingUserId = null;
const syncFlights = new Map();
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const number = (value, decimals = 2) => Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals }) : '—';
const money = (value) => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: state.quote?.currency || 'USD' }).format(value); } catch { return number(value); } };
const signed = (value) => `${value >= 0 ? '+' : ''}${number(value)}%`;
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4500); }
function storageKey() { return `predictData:${state.user?.id || 'guest'}`; }
function persist() { return writeLocal(storageKey(), { favorites: state.favorites, notes: state.notes, pending: state.pending }); }
function loadLocal() {
  const saved = readLocal(storageKey(), null);
  const legacy = !state.user ? readLocal('stockFavorites', []) : [];
  state.favorites = (Array.isArray(saved?.favorites) ? saved.favorites : Array.isArray(legacy) ? legacy : []).filter(s => typeof s === 'string' && /^[A-Z0-9^][A-Z0-9.\-^=]{0,14}$/.test(s));
  const notes = saved?.notes || (!state.user ? readLocal('stockDetails', {}) : {});
  state.notes = notes && typeof notes === 'object' && !Array.isArray(notes) ? notes : {};
  state.pending = { favorites: saved?.pending?.favorites || {}, notes: saved?.pending?.notes || {} };
}

async function syncPending() {
  const userId = state.user?.id;
  if (!cloud || !userId || !navigator.onLine || hydratingUserId === userId) return false;
  if (syncFlights.has(userId)) return syncFlights.get(userId);
  const run = async () => {
    let failed = false;
    for (const kind of ['favorites', 'notes']) {
      for (const [symbol, value] of Object.entries(state.pending[kind])) {
        if (state.user?.id !== userId) return false;
        try {
          const result = kind === 'favorites'
            ? value ? await cloud.from('favorites').upsert({ user_id: userId, symbol })
              : await cloud.from('favorites').delete().eq('user_id', userId).eq('symbol', symbol)
            : await cloud.from('stock_notes').upsert({ user_id: userId, symbol, ...value });
          if (result.error) { failed = true; continue; }
          if (state.user?.id !== userId) return false;
          // A response for an older edit must never acknowledge a newer edit.
          if (JSON.stringify(state.pending[kind][symbol]) === JSON.stringify(value)) {
            delete state.pending[kind][symbol]; persist();
          }
        } catch { failed = true; }
      }
    }
    if (state.user?.id === userId && !state.notesDirty) {
      $('#notesStatus').textContent = state.pending.notes[state.symbol]
        ? 'Pending cloud sync; retrying automatically' : 'Saved and synced';
    }
    return !failed;
  };
  const promise = run().finally(() => syncFlights.delete(userId));
  syncFlights.set(userId, promise);
  return promise;
}
function setView(view) {
  state.view = view;
  const labels = { overview: 'Overview', markets: 'Markets', analytics: 'Analytics', models: 'Model evaluation', watchlist: 'Watchlist' };
  $('#breadcrumb').textContent = labels[view];
  document.querySelectorAll('[data-view]').forEach(button => { button.classList.toggle('active', button.dataset.view === view); button.setAttribute('aria-current', button.dataset.view === view ? 'page' : 'false'); });
  $('#marketSection').hidden = view !== 'markets';
  $('#watchlistSection').hidden = view !== 'watchlist';
  $('#research').hidden = !state.quote || ['markets', 'watchlist'].includes(view);
  $('#chartSection').hidden = view === 'models';
  $('#analyticsSection').hidden = view === 'models';
  $('#modelSection').hidden = view === 'analytics';
  $('#bottomSection').hidden = view !== 'overview';
}
function renderMarkets() {
  const filter = $('#marketFilter').value.toLowerCase();
  const card = (market) => `<button class="rounded-xl border border-line p-4 text-left transition hover:border-green hover:bg-paper" data-symbol="${escapeHTML(market.symbol)}"><span class="flex justify-between font-semibold">${escapeHTML(market.symbol)} <span class="text-green">↗</span></span><span class="mt-2 block text-sm">${escapeHTML(market.name)}</span><span class="mt-1 block text-xs text-muted">${escapeHTML(market.sector || 'Saved ticker')} · Open analysis</span></button>`;
  $('#marketGrid').innerHTML = state.markets.filter(m => `${m.symbol} ${m.name} ${m.sector}`.toLowerCase().includes(filter)).map(card).join('') || '<p class="text-sm text-muted">No matching markets.</p>';
  $('#watchlistGrid').innerHTML = state.favorites.map(symbol => card(state.markets.find(m => m.symbol === symbol) || { symbol, name: symbol })).join('') || '<p class="py-5 text-sm text-muted">Your watchlist is empty. Analyze a ticker and select the star to save it.</p>';
  $('#favoriteCount').textContent = state.favorites.length;
  document.querySelectorAll('[data-symbol]').forEach(button => button.addEventListener('click', () => { setView('overview'); loadQuote(button.dataset.symbol); }));
}
async function loadQuote(symbol = state.symbol) {
  symbol = symbol.trim().toUpperCase();
  if (!/^[A-Z0-9^][A-Z0-9.\-^=]{0,14}$/.test(symbol)) { toast('Enter a valid ticker, such as NVDA or BRK-B.'); return; }
  if (state.notesDirty) { toast('Save your research notes before refreshing or changing ticker.'); $('#dataMode').value = state.demo ? 'demo' : 'live'; return; }
  controller?.abort(); controller = new AbortController();
  resetTrajectoryEditor();
  const requestId = ++state.request;
  state.symbol = symbol; state.quote = null;
  $('#tickerInput').value = symbol; $('#research').hidden = true; $('#exportButton').disabled = true;
  $('#loading').hidden = false; $('#errorBanner').hidden = true; $('#demoBanner').hidden = !state.demo;
  $('#feedStatus').textContent = 'Fetching data…';
  try {
    const response = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}${state.demo ? '&demo=1' : ''}`, { signal: controller.signal });
    const quote = await response.json();
    if (!response.ok) throw new Error(quote.error || 'Unable to load market data.');
    if (requestId !== state.request) return;
    state.quote = quote;
    renderQuote(); setView(state.view); $('#exportButton').disabled = false;
    $('#feedStatus').textContent = `${quote.demo ? 'Synthetic demo' : 'Market quote'} · ${new Date(quote.as_of * 1000).toLocaleString()}${quote.cached ? ' · cached' : ''}`;
    if (quote.stale) {
      $('#feedStatus').textContent = `Stale quote · ${new Date(quote.as_of * 1000).toLocaleString()}`;
      $('#errorBanner').textContent = quote.warning;
      $('#errorBanner').hidden = false;
    }
    checkAlert();
  } catch (error) {
    if (error.name === 'AbortError' || requestId !== state.request) return;
    $('#errorBanner').textContent = error.message || 'Unable to connect to the Python server.';
    $('#errorBanner').hidden = false; $('#feedStatus').textContent = 'Data unavailable';
  } finally { if (requestId === state.request) $('#loading').hidden = true; }
}
function renderQuote() {
  const q = state.quote, a = q.analytics;
  $('#stockSymbol').textContent = q.symbol;
  $('#stockName').textContent = state.markets.find(m => m.symbol === q.symbol)?.name || q.symbol;
  $('#stockPrice').textContent = money(q.price);
  $('#stockChange').textContent = `${q.change >= 0 ? '+' : '−'}${money(Math.abs(q.change))} (${signed(q.percent)}) vs. previous session`;
  $('#stockChange').className = `mt-2 text-xs ${q.change >= 0 ? 'text-green' : 'text-red-700'}`;
  $('#forecastPrice').textContent = money(a.forecasts[1].expected); $('#trend').textContent = a.signal;
  $('#coverage').textContent = `${a.observations} sessions`; $('#historyDate').textContent = `Through ${q.bars.at(-1).date}`;
  $('#historyBasis').textContent = `${q.history_basis} · ${q.currency} · ${q.source}`;
  const metrics = [
    ['Period return', signed(a.period_return), `${q.bars[0].date} to ${q.bars.at(-1).date}`],
    ['Annualized volatility', `${number(a.volatility)}%`, 'Daily return deviation × √252'],
    ['Maximum drawdown', `${number(a.max_drawdown)}%`, 'Largest peak-to-trough loss in history'],
    ['RSI · 14 sessions', number(a.rsi, 1), 'Simple average gains / losses; 0–100'],
    ['20-session average', money(a.sma20), 'Short-term average closing price'],
    ['50-session average', money(a.sma50), 'Medium-term average closing price'],
    ['Average daily volume', number(a.average_volume, 0), `${a.volume_observations} valid volume observations in last 20 sessions`],
    ['7-session model MAE', money(a.backtests[1].mae), 'Historical average absolute forecast error']
  ];
  $('#analyticsGrid').innerHTML = metrics.map(([label, value, detail]) => `<article class="panel p-5"><h3 class="text-xs text-muted">${escapeHTML(label)}</h3><p class="mt-4 font-mono text-2xl">${escapeHTML(value)}</p><p class="mt-3 text-xs leading-5 text-muted">${escapeHTML(detail)}</p></article>`).join('');
  $('#modelDescription').textContent = `${a.model}. ${a.methodology}`;
  $('#backtestRows').innerHTML = a.backtests.map(b => `<tr><td>${b.horizon} session${b.horizon > 1 ? 's' : ''}</td><td>${money(b.mae)}</td><td>${money(b.baseline_mae)}</td><td>${number(b.directional_accuracy, 1)}%</td><td>${b.samples}</td><td>${money(b.rmse)}</td><td>${number(b.mape, 1)}%</td><td>${number(b.interval_coverage, 1)}%</td><td class="${b.mae < b.baseline_mae ? 'text-green' : 'text-amber-800'}">${b.mae < b.baseline_mae ? 'Lower error' : b.mae === b.baseline_mae ? 'Equal error' : 'Higher error'}</td></tr>`).join('');
  $('#forecastRows').innerHTML = a.forecasts.map(f => `<tr><td>${f.horizon} session${f.horizon > 1 ? 's' : ''}</td><td class="font-mono">${money(f.expected)}</td><td class="text-muted">${money(f.lower)} – ${money(f.upper)}</td></tr>`).join('');
  renderPersonal(); drawChart();
}
function renderPersonal() {
  const saved = state.favorites.includes(state.symbol);
  $('#favoriteButton').textContent = saved ? '★' : '☆';
  $('#favoriteButton').setAttribute('aria-label', saved ? 'Remove from watchlist' : 'Add to watchlist');
  $('#favoriteButton').setAttribute('aria-pressed', String(saved));
  if (state.notesDirty) return;
  const notes = state.notes[state.symbol] || {};
  $('#targetPrice').value = notes.target ?? ''; $('#alertPrice').value = notes.alert ?? ''; $('#noteText').value = notes.note || '';
  $('#notesStatus').textContent = state.user
    ? state.pending.notes[state.symbol] ? 'Pending cloud sync' : 'Cloud sync enabled'
    : 'Saved on this device';
}
function drawChart() {
  if (!state.quote) return;
  const history = state.quote.bars.slice(-state.range), trajectory = state.quote.analytics.trajectory;
  const last = history.at(-1).close;
  const future = [{ expected: last, lower: last, upper: last }, ...trajectory.map((forecast, index) => {
    const expected = last + (forecast.expected - last) * (1 + state.trajectoryTilt / 100);
    const lower = expected - (expected - forecast.lower) * state.trajectoryBand / 100;
    const upper = expected + (forecast.upper - expected) * state.trajectoryBand / 100;
    return { expected, lower, upper, index };
  })];
  const values = [...history.map(b => b.close), ...future.flatMap(f => [f.lower, f.upper])];
  let min = Math.min(...values), max = Math.max(...values); const margin = (max - min) * 0.08 || max * 0.05;
  min -= margin; max += margin;
  const x = i => 70 + i * 900 / (history.length - 1 + trajectory.length);
  const y = value => 20 + (max - value) / (max - min) * 275;
  const point = (i, value) => `${x(i).toFixed(2)},${y(value).toFixed(2)}`;
  const split = history.length - 1;
  const actual = history.map((b, i) => point(i, b.close)).join(' ');
  const prediction = future.map((f, i) => point(split + i, f.expected)).join(' ');
  const band = [...future.map((f, i) => point(split + i, f.upper)), ...future.map((f, i) => point(split + i, f.lower)).reverse()].join(' ');
  const grid = Array.from({ length: 5 }, (_, i) => { const value = min + (max - min) * i / 4; return `<line x1="70" x2="970" y1="${y(value)}" y2="${y(value)}" stroke="#e8ede7"/><text x="60" y="${y(value) + 4}" text-anchor="end" fill="#68776f" font-size="11">${number(value, 0)}</text>`; }).join('');
  $('#priceChart').innerHTML = `<title>${escapeHTML(state.symbol)} historical closes and 30-session forecast</title>${grid}<polygon points="${band}" fill="#cf894e" opacity=".13"/><line x1="${x(split)}" x2="${x(split)}" y1="20" y2="295" stroke="#9cad9f" stroke-dasharray="4 5"/><polyline points="${actual}" fill="none" stroke="#18745d" stroke-width="2.5"/><polyline points="${prediction}" fill="none" stroke="#cf894e" stroke-width="2.5" stroke-dasharray="5 5"/><circle cx="${x(split)}" cy="${y(last)}" r="4" fill="#18745d"/><text x="70" y="325" fill="#68776f" font-size="11">${history[0].date}</text><text x="${x(split) - 5}" y="325" text-anchor="end" fill="#68776f" font-size="11">${history.at(-1).date}</text><text x="970" y="325" text-anchor="end" fill="#68776f" font-size="11">+30 sessions</text>`;
}
function resetTrajectoryEditor() {
  state.trajectoryTilt = 0; state.trajectoryBand = 100;
  if (!$('#trajectoryTilt')) return;
  $('#trajectoryTilt').value = '0'; $('#trajectoryBand').value = '100';
  $('#trajectoryTiltValue').textContent = '0%'; $('#trajectoryBandValue').textContent = '100%';
}
function updateTrajectoryEditor() {
  state.trajectoryTilt = Number($('#trajectoryTilt').value); state.trajectoryBand = Number($('#trajectoryBand').value);
  $('#trajectoryTiltValue').textContent = `${state.trajectoryTilt > 0 ? '+' : ''}${state.trajectoryTilt}%`;
  $('#trajectoryBandValue').textContent = `${state.trajectoryBand}%`;
  drawChart();
}
async function toggleFavorite() {
  const symbol = state.symbol, user = state.user;
  const saved = state.favorites.includes(symbol);
  state.favorites = saved ? state.favorites.filter(s => s !== symbol) : [...state.favorites, symbol];
  if (user) state.pending.favorites[symbol] = !saved;
  persist(); renderMarkets(); renderPersonal();
  if (cloud && user) {
    if (!await syncPending()) toast('Cloud sync pending. Your changes will retry automatically.');
  }
}
async function saveNotes(event) {
  event.preventDefault();
  const symbol = state.symbol, user = state.user;
  const detail = { target: $('#targetPrice').value === '' ? null : Number($('#targetPrice').value), alert: $('#alertPrice').value === '' ? null : Number($('#alertPrice').value), note: $('#noteText').value };
  state.notes[symbol] = detail;
  if (user) state.pending.notes[symbol] = { ...detail, updated_at: new Date().toISOString() };
  const stored = persist(); state.notesDirty = !stored;
  $('#notesStatus').textContent = stored ? 'Saved on this device' : 'Storage failed; keep this page open';
  if (cloud && user) {
    await syncPending();
  }
  checkAlert();
}
function checkAlert() {
  const value = Number(state.notes[state.symbol]?.alert);
  if (state.quote && !state.quote.stale && value > 0 && state.quote.price >= value) toast(`${state.quote.demo ? 'Demo: ' : ''}${state.symbol} is at or above your ${money(value)} alert threshold.`);
}
async function applySession(session) {
  const nextUser = session?.user || null;
  if (state.user?.id === nextUser?.id) return;
  const generation = ++authGeneration;
  state.user = nextUser; state.notesDirty = false;
  hydratingUserId = state.user?.id || null;
  loadLocal(); renderPersonal(); renderMarkets();
  $('#authButton').textContent = state.user ? 'Sign out' : 'Sign in';
  if (!state.user || !cloud) return;
  const userId = state.user.id;
  const settled = await Promise.allSettled([
    cloud.from('favorites').select('symbol').eq('user_id', userId),
    cloud.from('stock_notes').select('symbol,target,alert,note').eq('user_id', userId)
  ]);
  if (generation !== authGeneration) return;
  hydratingUserId = null;
  const [favorites, notes] = settled.map(result => result.status === 'fulfilled' ? result.value : { error: true });
  if (favorites.error || notes.error) { toast('Cloud data unavailable. Showing this account’s local data.'); await syncPending(); return; }
  const combined = new Set(favorites.data.map(f => f.symbol));
  for (const [symbol, saved] of Object.entries(state.pending.favorites)) {
    if (saved) combined.add(symbol); else combined.delete(symbol);
  }
  state.favorites = [...combined];
  state.notes = { ...Object.fromEntries(notes.data.map(n => [n.symbol, n])), ...state.pending.notes };
  persist(); renderMarkets(); renderPersonal();
  await syncPending();
}
function exportCSV() {
  if (!state.quote) return;
  const q = state.quote;
  const rows = [['symbol', 'source', 'type', 'date_or_horizon', 'close_or_estimate', 'lower', 'upper', 'volume'],
    ...q.bars.map(b => [q.symbol, q.source, 'history', b.date, b.close, '', '', b.volume]),
    ...q.analytics.forecasts.map(f => [q.symbol, q.source, 'forecast_sessions', f.horizon, f.expected, f.lower, f.upper, '']),
    [], ['metric', 'value'], ...Object.entries(q.analytics).filter(([, value]) => typeof value === 'number'),
    [], ['horizon_sessions', 'model_mae', 'baseline_mae', 'directional_accuracy_percent', 'samples', 'rmse', 'mape_percent', 'coverage_percent', 'evaluation_start', 'evaluation_end'],
    ...q.analytics.backtests.map(b => [b.horizon, b.mae, b.baseline_mae, b.directional_accuracy, b.samples, b.rmse, b.mape, b.interval_coverage, b.evaluation_start, b.evaluation_end]),
    [], ['quote_as_of_unix', q.as_of], ['fetched_at_unix', q.fetched_at], ['stale', q.stale], ['model_version', q.analytics.model_version]];
  const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a'); link.href = url; link.download = `${q.symbol}-${q.demo ? 'demo-' : ''}research.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
document.querySelectorAll('[data-range]').forEach(b => b.addEventListener('click', () => { state.range = Number(b.dataset.range); document.querySelectorAll('[data-range]').forEach(r => r.classList.toggle('active', r === b)); drawChart(); }));
$('#trajectoryTilt').addEventListener('input', updateTrajectoryEditor);
$('#trajectoryBand').addEventListener('input', updateTrajectoryEditor);
$('#resetTrajectory').addEventListener('click', () => { resetTrajectoryEditor(); drawChart(); });
$('#searchForm').addEventListener('submit', event => { event.preventDefault(); setView('overview'); loadQuote($('#tickerInput').value); });
$('#refreshButton').addEventListener('click', () => loadQuote());
$('#dataMode').addEventListener('change', () => { if (state.notesDirty) { $('#dataMode').value = state.demo ? 'demo' : 'live'; toast('Save your notes before changing data source.'); return; } state.demo = $('#dataMode').value === 'demo'; loadQuote(); });
$('#marketFilter').addEventListener('input', renderMarkets);
$('#favoriteButton').addEventListener('click', toggleFavorite);
$('#notesForm').addEventListener('submit', saveNotes);
$('#notesForm').addEventListener('input', () => { state.notesDirty = true; $('#notesStatus').textContent = 'Unsaved changes'; });
$('#exportButton').addEventListener('click', exportCSV);
$('#authButton').addEventListener('click', async () => {
  if (!cloud) { toast('Sign-in is unavailable. Check the Supabase configuration and connection.'); return; }
  if (state.notesDirty) { toast('Save your notes before changing accounts.'); return; }
  if (state.user) { const { error } = await cloud.auth.signOut(); if (error) toast(error.message); else await applySession(null); return; }
  $('#authError').textContent = ''; $('#authDialog').showModal();
});
$('#authForm').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true;
  try {
    const credentials = { email: $('#authEmail').value, password: $('#authPassword').value };
    const { data, error } = button.value === 'signup' ? await cloud.auth.signUp(credentials) : await cloud.auth.signInWithPassword(credentials);
    if (error) throw error;
    if (data.session) { await applySession(data.session); $('#authDialog').close(); $('#authPassword').value = ''; }
    else $('#authError').textContent = 'Check your email to confirm your account, then sign in.';
  } catch (error) { $('#authError').textContent = error.message; }
  finally { button.disabled = false; }
});
async function init() {
  $('#today').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
  loadLocal(); renderMarkets();
  try { const response = await fetch('/api/markets'); if (!response.ok) throw new Error(); state.markets = await response.json(); renderMarkets(); } catch { toast('Market directory unavailable. You can still search a ticker.'); }
  loadQuote();
  if (cloud) cloud.auth.onAuthStateChange((_event, session) => { setTimeout(() => applySession(session), 0); });
  window.addEventListener('online', () => syncPending());
  window.addEventListener('beforeunload', event => { if (state.notesDirty) { event.preventDefault(); event.returnValue = ''; } });
  setInterval(() => { if (!document.hidden) { syncPending(); if (!state.notesDirty) loadQuote(); } }, 60000);
}
init();
