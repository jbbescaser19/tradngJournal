import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, Edit3, ImageOff, Sparkles, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import ResultBadge from '../components/ResultBadge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useTrades } from '../context/TradesContext.jsx';
import { analyzeTrade, deleteTrade, imageUrl } from '../api/trades.js';
import { formatDate, formatMoney, formatTime, sortTrades } from '../utils/dateStats.js';

function DetailItem({ label, value }) {
  return <div className="detail-item"><span>{label}</span><strong>{value === null || value === undefined || value === '' ? '—' : value}</strong></div>;
}

export default function TradeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { trades, loading, refresh } = useTrades();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [analysisError, setAnalysisError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const trade = trades.find((item) => item._id === id);
  const ordered = useMemo(() => sortTrades(trades, 'asc'), [trades]);
  const currentIndex = ordered.findIndex((item) => item._id === id);
  const previous = currentIndex > 0 ? ordered[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < ordered.length - 1 ? ordered[currentIndex + 1] : null;

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalysisError('');
    try {
      await analyzeTrade(id);
      await refresh();
    } catch (err) {
      setAnalysisError(err.message || 'Could not analyze this screenshot.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this trade and its uploaded screenshot? This cannot be undone.')) return;
    setDeleting(true);
    setError('');
    try { await deleteTrade(id); await refresh(); navigate('/history', { replace: true }); }
    catch (err) { setError(err.message || 'Could not delete this trade.'); setDeleting(false); }
  }

  if (loading && !trade) return <div className="loading-block"><span className="spinner" /> Loading trade…</div>;
  if (!trade) return <EmptyState title="Trade not found" description="It may have been deleted or the journal has not loaded yet." />;

  return <div className="page-stack">
    <PageHeader eyebrow="VISUAL TRADE REVIEW" title={`${trade.symbol} · ${trade.direction === 'LONG' ? 'Long' : 'Short'}`} description="Review the chart, the result, and what you learned from this setup." actions={<><Link className="button button-outline" to="/trades/new"><ArrowLeft size={15} /> Back</Link><Link className="button button-primary" to={`/trades/${trade._id}/edit`}><Edit3 size={15} /> Edit trade</Link></>} />
    {error && <div className="notice notice-error">{error}</div>}
    <div className="detail-top-grid">
      <section className="panel detail-screenshot-panel">
        <div className="panel-heading"><div><h2>Original chart</h2><p>Click the image to open it in full resolution</p></div><div className="panel-heading-tools"><ResultBadge result={trade.result} /><button className="button button-subtle button-small analyze-button" onClick={handleAnalyze} disabled={analyzing || !trade.screenshot}><Sparkles size={14} />{analyzing ? 'Analyzing…' : 'Analyze chart'}</button></div></div>
        {trade.screenshot ? <a className="detail-image-link" href={imageUrl(trade.screenshot)} target="_blank" rel="noreferrer"><img src={imageUrl(trade.screenshot)} alt={`${trade.symbol} original trade chart`} className="detail-image" /></a> : <div className="missing-image detail-missing"><ImageOff size={25} /><span>No screenshot attached</span></div>}
        {analysisError && <div className="analysis-error" role="alert">{analysisError}</div>}
        <div className="image-caption"><span><CalendarDays size={14} /> {formatDate(trade.tradeDate)}</span><span><Clock3 size={14} /> {formatTime(trade.tradeDate)}</span></div>
      </section>
      <section className="panel trade-info-panel">
        <div className="panel-heading"><div><h2>Trade overview</h2><p>Recorded details</p></div></div>
        <div className="detail-pill-row"><span className={`direction-pill ${trade.direction === 'LONG' ? 'direction-long' : 'direction-short'}`}>{trade.direction === 'LONG' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{trade.direction}</span><ResultBadge result={trade.result} /></div>
        <div className="detail-list">
          <DetailItem label="Instrument" value={trade.symbol} /><DetailItem label="Entry price" value={trade.entryPrice} /><DetailItem label="Take profit" value={trade.takeProfit} /><DetailItem label="Stop loss" value={trade.stopLoss} /><DetailItem label="Risk-to-reward" value={trade.riskReward ? `${trade.riskReward}:1` : '—'} /><DetailItem label="Profit / loss" value={trade.pnl === null || trade.pnl === undefined || trade.pnl === '' ? '—' : formatMoney(trade.pnl)} /><DetailItem label="Strategy" value={trade.strategy} /><DetailItem label="Session" value={trade.session} />
        </div>
        <div className="detail-actions"><button className="button button-danger-quiet" onClick={handleDelete} disabled={deleting}><Trash2 size={15} /> {deleting ? 'Deleting…' : 'Delete trade'}</button></div>
      </section>
    </div>
    <div className="review-grid">
      <section className="panel note-panel"><div className="panel-heading"><div><h2>My notes</h2><p>Your thought process before or during the trade</p></div></div><div className="review-text">{trade.notes?.trim() || <span className="muted-italic">No notes added yet.</span>}</div></section>
      <section className="panel note-panel"><div className="panel-heading"><div><h2>Chart review & lessons</h2><p>Your observations about the result</p></div></div><div className="review-text">{trade.review?.trim() || <span className="muted-italic">No review recorded yet. Edit this trade to add chart observations and lessons learned.</span>}</div></section>
    </div>
    <section className="panel ai-review-panel"><div className="panel-heading"><div><h2><Sparkles size={16} /> AI chart review</h2><p>Optional screenshot observations to support your own review</p></div>{trade.aiReviewGeneratedAt && <span className="section-subtle">Reviewed {formatDate(trade.aiReviewGeneratedAt, { month: 'short', day: 'numeric', year: 'numeric' })}</span>}</div>{trade.aiReview ? <div className="ai-review-copy">{trade.aiReview}</div> : <div className="ai-review-empty"><Sparkles size={20} /><p>Generate a careful visual review of the uploaded chart, including possible reasons for the result and what cannot be confirmed from the screenshot alone.</p><button className="button button-outline button-small" onClick={handleAnalyze} disabled={analyzing || !trade.screenshot}><Sparkles size={14} />{analyzing ? 'Analyzing screenshot…' : 'Analyze screenshot'}</button><small>Requires an OpenAI API key in backend/.env. Usage may incur API charges.</small></div>}</section>
    <div className="trade-navigation"><div>{previous && <Link to={`/trade/${previous._id}`} className="trade-nav-link"><ArrowLeft size={17} /><span><small>Previous trade</small><strong>{previous.symbol} · {formatDate(previous.tradeDate, { month: 'short', day: 'numeric' })}</strong></span></Link>}</div><div>{next && <Link to={`/trade/${next._id}`} className="trade-nav-link trade-nav-next"><span><small>Next trade</small><strong>{next.symbol} · {formatDate(next.tradeDate, { month: 'short', day: 'numeric' })}</strong></span><ArrowRight size={17} /></Link>}</div></div>
  </div>;
}
