import { useMemo } from 'react';
import { ArrowRight, ArrowUpRight, BarChart3, CalendarDays, Clock3, ImagePlus, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import TradeCard from '../components/TradeCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useTrades } from '../context/TradesContext.jsx';
import { addDays, dateKey, formatDate, getStats, rateLabel, sortTrades, startOfWeek } from '../utils/dateStats.js';

export default function DashboardPage() {
  const { trades, loading, error } = useTrades();
  const stats = useMemo(() => getStats(trades), [trades]);
  const recent = useMemo(() => sortTrades(trades).slice(0, 6), [trades]);
  const weekStart = startOfWeek(new Date());
  const weekTrades = trades.filter((trade) => new Date(trade.tradeDate) >= weekStart && new Date(trade.tradeDate) < addDays(weekStart, 7));
  const weekStats = getStats(weekTrades);
  const chartData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 8 }, (_, index) => {
      const start = new Date(now.getFullYear(), now.getMonth() - (7 - index), 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      const monthly = trades.filter((trade) => new Date(trade.tradeDate) >= start && new Date(trade.tradeDate) < end);
      const info = getStats(monthly);
      return { month: start.toLocaleDateString(undefined, { month: 'short' }), rate: info.winRate, trades: info.total };
    });
  }, [trades]);
  const bestRate = chartData.filter((row) => row.rate !== null).length > 0;
  const latestDay = trades.length ? formatDate(sortTrades(trades)[0].tradeDate) : 'No trades yet';

  return <div className="page-stack">
    <PageHeader eyebrow="YOUR JOURNEY, AT A GLANCE" title="Trading dashboard" description="Track your results. Review your screenshots. Learn from every setup." actions={<Link className="button button-primary" to="/trades/new"><ImagePlus size={17} /> Log a trade</Link>} />
    {error && <div className="notice notice-error">{error} Start the backend and make sure MySQL is running, then refresh this page.</div>}
    <div className="welcome-strip"><div className="welcome-icon"><BarChart3 size={21} /></div><div><strong>{trades.length ? 'Keep building your edge.' : 'Your trading journal starts here.'}</strong><p>{trades.length ? `Your latest logged trade was ${latestDay}. Keep notes and screenshots together for better reviews.` : 'Add today’s trade or log a historical setup to get started. Your weekly, monthly, and yearly stats update automatically.'}</p></div><Link to="/weekly" className="text-link">Weekly review <ArrowRight size={15} /></Link></div>
    <div className="section-heading"><div><h2>All-time performance</h2><p>Calculated from all saved trades</p></div><span className="section-subtle">{stats.total} total · {stats.completed} completed</span></div>
    <div className="stats-grid stats-grid-five">
      <StatCard label="Win rate" value={rateLabel(stats)} helper={stats.completed ? `${stats.TP} wins / ${stats.completed} completed` : 'No TP or SL trades yet'} icon={Target} tone="positive" />
      <StatCard label="Take profit" value={stats.TP} helper="Winning trades" icon={TrendingUp} tone="positive" />
      <StatCard label="Stop loss" value={stats.SL} helper="Losing trades" icon={TrendingDown} tone="negative" />
      <StatCard label="Current streak" value={stats.currentStreak ? `${stats.currentStreak.count} ${stats.currentStreak.result}` : '—'} helper={stats.currentStreak ? (stats.currentStreak.result === 'TP' ? 'Wins in a row' : 'Losses in a row') : 'No completed trades yet'} icon={CalendarDays} tone={stats.currentStreak?.result === 'TP' ? 'positive' : stats.currentStreak?.result === 'SL' ? 'negative' : 'neutral'} />
    </div>

    <div className="dashboard-grid">
      <section className="panel performance-panel">
        <div className="panel-heading"><div><h2>Win-rate trend</h2><p>Monthly performance · last 8 months</p></div><span className="chart-legend"><span /> Win rate</span></div>
        {bestRate ? <div className="chart-wrap"><ResponsiveContainer width="100%" height={245}><AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs><linearGradient id="rateFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#64d9a2" stopOpacity={0.25} /><stop offset="100%" stopColor="#64d9a2" stopOpacity={0.01} /></linearGradient></defs>
          <CartesianGrid stroke="#252b38" strokeDasharray="4 5" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: '#8b94a7', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: '#8b94a7', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: '#171c27', border: '1px solid #2c3342', borderRadius: 10, color: '#eef2f8' }} formatter={(value, name) => [value === null ? 'No completed trades' : `${Number(value).toFixed(2)}%`, name === 'rate' ? 'Win rate' : name]} labelStyle={{ color: '#9ba6b8' }} />
          <Area type="monotone" dataKey="rate" stroke="#64d9a2" strokeWidth={2.5} fill="url(#rateFill)" connectNulls={false} activeDot={{ r: 4, fill: '#64d9a2', stroke: '#10131b', strokeWidth: 2 }} />
        </AreaChart></ResponsiveContainer></div> : <div className="chart-empty"><BarChart3 size={26} /><span>Your win-rate chart will appear after you record a TP or SL.</span></div>}
      </section>
      <section className="panel week-panel">
        <div className="panel-heading"><div><h2>This week</h2><p>{formatDate(weekStart, { month: 'short', day: 'numeric' })} – {formatDate(addDays(weekStart, 6), { month: 'short', day: 'numeric' })}</p></div><Link to="/weekly" className="icon-link" aria-label="Open weekly review"><ArrowUpRight size={18} /></Link></div>
        <div className="week-rate"><strong>{rateLabel(weekStats)}</strong><span>win rate</span></div>
        <div className="mini-stat-line"><span><i className="legend-dot dot-win" /> TP</span><strong>{weekStats.TP}</strong></div>
        <div className="mini-stat-line"><span><i className="legend-dot dot-loss" /> SL</span><strong>{weekStats.SL}</strong></div>
        <div className="mini-stat-line"><span><i className="legend-dot dot-be" /> BE / Open</span><strong>{weekStats.BE + weekStats.OPEN}</strong></div>
        <Link className="button button-outline button-wide" to="/weekly">View week <ArrowRight size={15} /></Link>
      </section>
    </div>

    <div className="section-heading recent-heading"><div><h2>Recent trades</h2><p>Your latest screenshots and outcomes</p></div><Link className="text-link" to="/history">View all trades <ArrowRight size={15} /></Link></div>
    {loading && !trades.length ? <div className="loading-block"><span className="spinner" /> Loading your journal…</div> : recent.length ? <div className="trade-grid trade-grid-three">{recent.map((trade) => <TradeCard key={trade._id} trade={trade} />)}</div> : <EmptyState title="No trades recorded yet" description="Upload your first chart screenshot to start tracking your performance." />}
    <div className="bottom-shortcuts"><Link to="/monthly"><CalendarDays size={18} /><span><strong>Monthly review</strong><small>Find a date and browse screenshots</small></span><ArrowRight size={17} /></Link><Link to="/yearly"><TrendingUp size={18} /><span><strong>Yearly overview</strong><small>Compare performance across months</small></span><ArrowRight size={17} /></Link></div>
  </div>;
}
