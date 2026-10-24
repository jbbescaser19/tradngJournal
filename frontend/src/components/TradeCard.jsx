import { ArrowDownRight, ArrowUpRight, ImageOff, MoveUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { imageUrl } from '../api/trades.js';
import { formatDate, formatTime, formatMoney } from '../utils/dateStats.js';
import ResultBadge from './ResultBadge.jsx';

export default function TradeCard({ trade, compact = false }) {
  const navigate = useNavigate();
  const DirectionIcon = trade.direction === 'LONG' ? ArrowUpRight : ArrowDownRight;
  return <button type="button" className={`trade-card ${compact ? 'trade-card-compact' : ''}`} onClick={() => navigate(`/trade/${trade._id}`)}>
    <div className="trade-image-wrap">
      {trade.screenshot ? <img className="trade-image" src={imageUrl(trade.screenshot)} alt={`${trade.symbol} chart from ${formatDate(trade.tradeDate)}`} loading="lazy" /> : <div className="missing-image"><ImageOff size={22} /><span>No screenshot</span></div>}
      <span className={`image-direction ${trade.direction === 'LONG' ? 'direction-long' : 'direction-short'}`}><DirectionIcon size={13} />{trade.direction}</span>
      <span className="view-image"><MoveUpRight size={15} /></span>
    </div>
    <div className="trade-card-body">
      <div className="trade-card-title-row"><strong>{trade.symbol}</strong><ResultBadge result={trade.result} /></div>
      <div className="trade-meta"><span>{formatDate(trade.tradeDate, { month: 'short', day: 'numeric' })}</span><span className="meta-dot" /><span>{formatTime(trade.tradeDate)}</span></div>
      {!compact && <div className="trade-card-footer">
        <span>{trade.strategy || 'Trade review'}</span>
        {trade.pnl !== null && trade.pnl !== undefined && trade.pnl !== '' && <strong className={Number(trade.pnl) > 0 ? 'text-positive' : Number(trade.pnl) < 0 ? 'text-negative' : ''}>{formatMoney(trade.pnl)}</strong>}
      </div>}
    </div>
  </button>;
}
