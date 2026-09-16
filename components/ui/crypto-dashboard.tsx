"use client";

// Adapted from the supplied CryptoDashboard component: repaired JSX, same card/chart
// structure, server-proxied data, accessible search, and persistent coin selection.
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, RefreshCw, X, Coins, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BackgroundPlus } from '../../demos/background-plus';

type Coin = { id: string; symbol: string; name: string };
export interface CryptoData extends Coin {
  image: string; current_price: number; market_cap: number | null; market_cap_rank: number | null;
  price_change_percentage_24h: number | null; total_volume: number | null;
  high_24h: number | null; low_24h: number | null; last_updated: string;
  sparkline_in_7d: { price: (number | null)[] };
}
type MarketResponse = { coins: CryptoData[]; missing_ids: string[]; source: string; stale: boolean; demo: boolean; warning?: string; fetched_at: number };
const defaults = ['bitcoin', 'ethereum', 'binancecoin', 'solana', 'cardano', 'chainlink', 'avalanche-2', 'polkadot'];
const selectionKey = 'predictCryptoCoins';
const formatPrice = (price: number | null) => price === null || !Number.isFinite(price) ? '—' : new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 2,
  maximumFractionDigits: price < .01 ? 6 : price < 1 ? 4 : 2
}).format(price);
const formatMarketCap = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2
}).format(value);
const formatPercentage = (value: number | null) => value === null ? '—' : `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

function loadSelection() {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(selectionKey) || 'null');
    if (Array.isArray(stored)) return [...new Set(stored.filter((id): id is string => typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,99}$/.test(id)))].slice(0, 20);
  } catch { /* Corrupt or unavailable browser storage: start with defaults. */ }
  return defaults;
}

async function api<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to fetch cryptocurrency data.');
  return data as T;
}

function ProfessionalCard({ children }: { children: ReactNode }) {
  return <div className="relative h-full w-full rounded-2xl border border-zinc-200 bg-white shadow-sm">
    <BackgroundPlus className="absolute inset-0 rounded-2xl opacity-5" plusColor="#3b82f6" plusSize={40} fade />
    <div className="relative z-10 p-4">{children}</div>
  </div>;
}

export function InteractiveChart({ data, positive, name }: { data: (number | null)[]; positive: boolean; name: string }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const gradientId = useId().replace(/:/g, '');
  const values = data.filter((v): v is number => v !== null && Number.isFinite(v));
  if (values.length < 2) return <div className="flex h-44 items-center justify-center text-xs text-zinc-500">7-day history unavailable</div>;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || Math.max(max * .02, .0001);
  const x = (index: number) => 55 + index / Math.max(data.length - 1, 1) * 285;
  const y = (value: number) => max === min ? 80 : 140 - (value - min) / span * 115;
  let move = true;
  const line = data.map((value, i) => {
    if (value === null) { move = true; return ''; }
    const command = `${move ? 'M' : 'L'} ${x(i)} ${y(value)}`; move = false; return command;
  }).join(' ');
  const color = positive ? '#059669' : '#e11d48';
  const selected = hoverIdx === null ? null : data[hoverIdx];
  return <div className="relative rounded-lg border border-zinc-200/50 bg-zinc-50/50">
    <svg viewBox="0 0 360 180" className="block w-full touch-pan-y" role="img" aria-label={`${name} price history over the last 7 days`}
      onPointerMove={event => { const rect = event.currentTarget.getBoundingClientRect(); const px = (event.clientX - rect.left) / rect.width * 360; setHoverIdx(Math.max(0, Math.min(data.length - 1, Math.round((px - 55) / 285 * (data.length - 1))))); }}
      onPointerLeave={() => setHoverIdx(null)}>
      <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".2" /><stop offset="100%" stopColor={color} stopOpacity=".01" /></linearGradient></defs>
      {[min, (min + max) / 2, max].map((value, i) => <g key={i}><line x1="55" x2="340" y1={y(value)} y2={y(value)} stroke="#d4d4d8" strokeDasharray="2 4" /><text x="49" y={y(value) + 3} textAnchor="end" fill="#71717a" fontSize="9">{new Intl.NumberFormat('en-US', { notation: 'compact', maximumSignificantDigits: 3 }).format(value)}</text></g>)}
      {values.length === data.length && <path d={`${line} L 340 140 L 55 140 Z`} fill={`url(#${gradientId})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" />
      <text x="55" y="163" fontSize="10" fill="#71717a">7-day price history</text><text x="340" y="163" textAnchor="end" fontSize="10" fill="#71717a">Latest sample</text>
      {hoverIdx !== null && selected != null && <g><line x1={x(hoverIdx)} x2={x(hoverIdx)} y1="20" y2="140" stroke="#3b82f6" strokeDasharray="3 3" /><circle cx={x(hoverIdx)} cy={y(selected)} r="4" fill="white" stroke="#3b82f6" strokeWidth="2" /></g>}
    </svg>
    <label className="sr-only" htmlFor={`chart-${gradientId}`}>Explore {name} historical samples</label>
    <input id={`chart-${gradientId}`} className="mx-auto mb-2 block w-4/5 accent-emerald-600" type="range" min="0" max={data.length - 1} value={hoverIdx ?? data.length - 1} onChange={e => setHoverIdx(Number(e.target.value))} />
    <p className="min-h-6 pb-2 text-center text-xs text-zinc-500" aria-live="polite">{hoverIdx === null ? 'Hover or use the slider to explore' : `Sample ${hoverIdx + 1}/${data.length}: ${formatPrice(selected ?? null)}`}</p>
  </div>;
}

function SearchModal({ onClose, onAddCoin, selected, demo }: { onClose: () => void; onAddCoin: (coin: Coin) => void; selected: string[]; demo: boolean }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    setResults([]); setError(''); setLoading(Boolean(query.trim()));
    if (!query.trim()) return () => controller.abort();
    const timer = setTimeout(async () => {
      try {
        const data = await api<{ coins: Coin[] }>(`/api/crypto/search?q=${encodeURIComponent(query.trim())}${demo ? '&demo=1' : ''}`, controller.signal);
        if (!controller.signal.aborted) setResults(data.coins);
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Search unavailable'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, demo]);
  return <dialog ref={dialog} onClose={onClose} className="w-[min(520px,90vw)] rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl" aria-labelledby="cryptoSearchTitle">
    <div className="mb-4 flex items-center justify-between"><h2 id="cryptoSearchTitle" className="text-lg font-semibold">Add a cryptocurrency</h2><button onClick={onClose} aria-label="Close crypto search" className="rounded-lg p-2 hover:bg-zinc-100"><X size={18} /></button></div>
    <label className="sr-only" htmlFor="cryptoSearchInput">Search by coin name or symbol</label>
    <input id="cryptoSearchInput" autoFocus maxLength={60} className="input w-full" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Bitcoin, ETH, Solana…" />
    <div className="mt-3 max-h-80 overflow-y-auto" aria-live="polite">
      {error && <p role="alert" className="p-4 text-sm text-rose-700">{error}</p>}
      {loading ? <p className="p-4 text-sm text-zinc-500">Searching…</p> : results.map(coin => <button key={coin.id} disabled={selected.includes(coin.id) || selected.length >= 20} onClick={() => { onAddCoin(coin); onClose(); }} className="flex w-full items-center justify-between rounded-lg border-b border-zinc-100 p-3 text-left hover:bg-zinc-50"><span><b className="block text-sm">{coin.name}</b><span className="text-xs text-zinc-500">{coin.symbol.toUpperCase()}</span></span><span className="text-xs text-green">{selected.includes(coin.id) ? 'Added' : selected.length >= 20 ? 'Limit reached' : '+ Add'}</span></button>)}
      {!loading && !error && !results.length && <p className="p-4 text-sm text-zinc-500">{query.trim() ? 'No matching cryptocurrencies.' : 'Start typing to search by name or symbol.'}</p>}
    </div>
    <p className="mt-3 text-xs text-zinc-500">Up to 20 coins. Your selection is saved on this device.</p>
  </dialog>;
}

function Card({ crypto, onRemove }: { crypto: CryptoData; onRemove: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const isPositive = (crypto.price_change_percentage_24h ?? 0) >= 0;
  return <motion.article data-coin={crypto.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}>
    <ProfessionalCard>
      <div className="mb-4 flex items-start justify-between gap-2"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50">
        {crypto.image && !imageFailed ? <img src={crypto.image} alt="" className="h-6 w-6 object-contain" onError={() => setImageFailed(true)} /> : <Coins size={22} className="text-green" />}
      </div><div className="min-w-0"><h2 className="truncate text-base font-bold">{crypto.name}</h2><p className="text-xs uppercase tracking-wider text-zinc-500">{crypto.symbol} {crypto.market_cap_rank ? `· #${crypto.market_cap_rank}` : ''}</p></div></div><button className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label={`Remove ${crypto.name}`} onClick={onRemove}><X size={16} /></button></div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2"><p className="text-2xl font-bold tracking-tight">{formatPrice(crypto.current_price)}</p><p className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>{isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{formatPercentage(crypto.price_change_percentage_24h)} <span className="font-normal text-zinc-500">24h</span></p></div>
      <InteractiveChart data={crypto.sparkline_in_7d.price} positive={isPositive} name={crypto.name} />
      <dl className="mt-4 grid grid-cols-2 gap-4 text-xs">{[
        ['Market cap', formatMarketCap(crypto.market_cap)], ['Volume · 24h', formatMarketCap(crypto.total_volume)],
        ['24h high', formatPrice(crypto.high_24h)], ['24h low', formatPrice(crypto.low_24h)]
      ].map(([label, value]) => <div key={label}><dt className="text-zinc-500">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl>
      <p className="mt-4 border-t border-zinc-100 pt-3 text-[10px] text-zinc-500">Provider update: {crypto.last_updated && Number.isFinite(Date.parse(crypto.last_updated)) ? new Date(crypto.last_updated).toLocaleString() : 'Unavailable'}</p>
    </ProfessionalCard>
  </motion.article>;
}

export default function CryptoDashboard({ source, onSourceChange }: { source?: boolean; onSourceChange?: (demo: boolean) => void }) {
  const [selectedCoins, setSelectedCoins] = useState<string[]>(loadSelection);
  const [data, setData] = useState<MarketResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [internalDemo, setInternalDemo] = useState(false);
  const demo = source ?? internalDemo;
  const setDemo = onSourceChange ?? setInternalDemo;
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const searchButton = useRef<HTMLButtonElement>(null);
  const closeSearch = useCallback(() => { setIsSearchOpen(false); searchButton.current?.focus(); }, []);
  useEffect(() => {
    try { localStorage.setItem(selectionKey, JSON.stringify(selectedCoins)); setStorageError(''); }
    catch { setStorageError('Browser storage unavailable. Coin selection will not persist after closing this page.'); }
  }, [selectedCoins]);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError('');
    if (!selectedCoins.length) { setLoading(false); return () => controller.abort(); }
    setLoading(true);
    api<MarketResponse>(`/api/crypto/markets?ids=${encodeURIComponent(selectedCoins.join(','))}${demo ? '&demo=1' : ''}`, controller.signal)
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Crypto data unavailable.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selectedCoins, demo, refresh]);
  useEffect(() => {
    const timer = setInterval(() => { if (!document.hidden) setRefresh(value => value + 1); }, 60000);
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setIsSearchOpen(true); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { clearInterval(timer); document.removeEventListener('keydown', keyboard); };
  }, []);
  const addCoin = (coin: Coin) => setSelectedCoins(ids => ids.includes(coin.id) || ids.length >= 20 ? ids : [...ids, coin.id]);
  const removeCoin = (id: string) => setSelectedCoins(ids => ids.filter(coin => coin !== id));
  return <div className="relative min-h-screen p-4 sm:p-6 lg:p-8">
    <BackgroundPlus className="absolute inset-0 opacity-20" plusColor="#3b82f6" plusSize={60} fade />
    <div className="relative mx-auto max-w-7xl">
      <div className="mb-8 text-center"><motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-5xl">Crypto Market Explorer</motion.h1><p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-zinc-600">Live cryptocurrency prices, 24-hour movement, market activity, and interactive seven-day coin charts.</p></div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><button ref={searchButton} onClick={() => setIsSearchOpen(true)} className="button-primary flex items-center gap-2"><Search size={17} /> Search for a coin <kbd className="hidden text-xs opacity-60 sm:inline">Ctrl / ⌘ K</kbd></button><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-xs text-zinc-500">Crypto data source<select aria-label="Crypto data source" value={demo ? 'demo' : 'live'} onChange={event => setDemo(event.target.value === 'demo')} className="input"><option value="live">Live crypto data</option><option value="demo">Crypto demo data</option></select></label><button className="button-secondary flex items-center gap-2" disabled={loading} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={15} />Refresh crypto prices</button></div></div>
      <div aria-live="polite" className="mb-5 space-y-3 text-sm">
        {demo && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">Synthetic demo data — these are illustrative prices, not current market prices.</p>}
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">{error}</p>}
        {storageError && <p role="alert" className="text-amber-800">{storageError}</p>}
        {data?.stale && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">Stale data: {data.warning}</p>}
        <p className="text-xs text-zinc-500">{loading ? 'Loading cryptocurrency data…' : `${selectedCoins.length}/20 coins selected · USD · Refreshes every minute while visible`}{data?.fetched_at ? ` · Fetched ${new Date(data.fetched_at * 1000).toLocaleTimeString()}` : ''}</p>
      </div>
      {data && data.missing_ids.length > 0 && <div className="mb-5 rounded-xl border border-line bg-white p-4 text-sm"><p className="mb-2">No data available for these selections:</p>{data.missing_ids.map(id => <button key={id} onClick={() => removeCoin(id)} className="button-secondary mr-2 mb-2">Remove {id} ×</button>)}</div>}
      {!selectedCoins.length && <div className="panel p-10 text-center"><Coins size={32} className="mx-auto mb-4 text-green" /><h2 className="text-xl font-semibold">Build your crypto market list</h2><p className="mt-2 text-sm text-zinc-500">Search for a cryptocurrency to add its live market data.</p></div>}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"><AnimatePresence>{data?.coins.map(coin => <Card key={coin.id} crypto={coin} onRemove={() => removeCoin(coin.id)} />)}</AnimatePresence></div>
      <footer className="mt-8 flex flex-wrap justify-between gap-3 border-t border-zinc-200 pt-5 text-xs leading-5 text-zinc-500"><span>Prices may be delayed. Crypto markets trade 24/7. Research only.</span><a href="https://www.coingecko.com/" target="_blank" rel="noreferrer" className="underline">Market data by CoinGecko</a></footer>
    </div>
    {isSearchOpen && <SearchModal onClose={closeSearch} onAddCoin={addCoin} selected={selectedCoins} demo={demo} />}
  </div>;
}
