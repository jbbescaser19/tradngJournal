import { useMemo, useState } from 'react';
import { Download, Filter, Search, X } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import TradeCard from '../components/TradeCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useTrades } from '../context/TradesContext.jsx';
import { sortTrades } from '../utils/dateStats.js';
import { exportTradesCsv } from '../utils/exportTrades.js';

export default function TradeHistoryPage() {
  const { trades, loading } = useTrades();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('ALL');
  const [direction, setDirection] = useState('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('desc');
  const filtered = useMemo(() => sortTrades(trades.filter((trade) => {
    const search = `${trade.symbol} ${trade.strategy || ''} ${trade.notes || ''}`.toLowerCase();
    const date = new Date(trade.tradeDate);
    return (!query || search.includes(query.toLowerCase())) && (result === 'ALL' || trade.result === result) && (direction === 'ALL' || trade.direction === direction) && (!from || date >= new Date(`${from}T00:00:00`)) && (!to || date < new Date(`${to}T23:59:59.999`));
  }), sort), [trades, query, result, direction, from, to, sort]);
  const hasFilters = query || result !== 'ALL' || direction !== 'ALL' || from || to;
  function clearFilters() { setQuery(''); setResult('ALL'); setDirection('ALL'); setFrom(''); setTo(''); }

  return <div className="page-stack">
    <PageHeader eyebrow="YOUR COMPLETE RECORD" title="Trade history" description="Search every screenshot and open a trade to review it in detail." actions={<><span className="record-count"><strong>{filtered.length}</strong> / {trades.length} trades</span><button className="button button-outline button-small" onClick={() => exportTradesCsv(filtered)} disabled={!filtered.length}><Download size={14} /> Export CSV</button></>} />
    <section className="panel filters-panel">
      <div className="filter-title"><Filter size={16} /><strong>Find a trade</strong>{hasFilters && <button className="text-button" onClick={clearFilters}><X size={13} /> Clear filters</button>}</div>
      <div className="filters-grid">
        <label className="search-input"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pair, strategy, notes…" /></label>
        <label className="filter-field"><span>Result</span><select value={result} onChange={(event) => setResult(event.target.value)}><option value="ALL">All results</option><option value="TP">TP · Win</option><option value="SL">SL · Loss</option><option value="BE">Break even</option><option value="OPEN">Open</option></select></label>
        <label className="filter-field"><span>Direction</span><select value={direction} onChange={(event) => setDirection(event.target.value)}><option value="ALL">All directions</option><option value="LONG">Buy / Long</option><option value="SHORT">Sell / Short</option></select></label>
        <label className="filter-field"><span>From</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label className="filter-field"><span>To</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        <label className="filter-field"><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="desc">Newest first</option><option value="asc">Oldest first</option></select></label>
      </div>
    </section>
    {loading && !trades.length ? <div className="loading-block"><span className="spinner" /> Loading trades…</div> : filtered.length ? <div className="trade-grid trade-grid-three">{filtered.map((trade) => <TradeCard key={trade._id} trade={trade} />)}</div> : <EmptyState title="No matching trades" description={trades.length ? 'Try another search or remove some filters.' : 'Your saved trade screenshots will appear here.'} action={!trades.length} />}
  </div>;
}
