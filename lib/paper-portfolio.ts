export type Position = { id: string; quantity: number; cost: number };
export type Trade = { id: string; coin: string; side: 'buy' | 'sell'; quantity: number; price: number; fee: number; total: number; realized: number; time: string; source: 'demo' | 'market' };
export type Portfolio = { cash: number; positions: Position[]; trades: Trade[] };
export function initialPortfolio(): Portfolio {
  return { cash: 10000, positions: [{ id: 'bitcoin', quantity: .18, cost: 7200 }, { id: 'ethereum', quantity: 1.8, cost: 4320 }, { id: 'solana', quantity: 12, cost: 960 }], trades: [] };
}
export function executeTrade(portfolio: Portfolio, coin: string, side: 'buy' | 'sell', quantity: number, price: number, source: 'demo' | 'market'): Portfolio {
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) throw new Error('Enter a valid quantity and price.');
  const gross = quantity * price;
  if (!Number.isFinite(gross) || gross < .01) throw new Error('Minimum paper order is $0.01.');
  const fee = gross * .001;
  const positions = portfolio.positions.map(p => ({ ...p }));
  let position = positions.find(p => p.id === coin);
  let realized = 0, cash = portfolio.cash;
  if (side === 'buy') {
    if (gross + fee > cash) throw new Error('Insufficient paper cash, including the 0.1% fee.');
    cash -= gross + fee;
    if (!position) { position = { id: coin, quantity: 0, cost: 0 }; positions.push(position); }
    position.quantity += quantity; position.cost += gross + fee;
  } else {
    if (!position || quantity > position.quantity) throw new Error('Insufficient available coin holdings.');
    const basis = position.cost * quantity / position.quantity;
    realized = gross - fee - basis;
    position.quantity -= quantity; position.cost -= basis; cash += gross - fee;
  }
  const trade: Trade = { id: crypto.randomUUID(), coin, side, quantity, price, fee, total: side === 'buy' ? gross + fee : gross - fee, realized, time: new Date().toISOString(), source };
  return { cash, positions: positions.filter(p => p.quantity > 1e-12), trades: [trade, ...portfolio.trades] };
}
