import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import TradeForm from '../components/TradeForm.jsx';
import { fetchTrade } from '../api/trades.js';

export default function AddTradePage() {
  const { id } = useParams();
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    if (!id) { setTrade(null); setError(''); setLoading(false); return undefined; }
    setError('');
    setLoading(true);
    fetchTrade(id).then((record) => { if (live) setTrade(record); }).catch((err) => { if (live) setError(err.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [id]);

  if (loading) return <div className="loading-block"><span className="spinner" /> Loading trade…</div>;
  if (error) return <div className="page-stack"><div className="notice notice-error"><AlertTriangle size={17} /> {error}</div><Link to="/history" className="button button-quiet"><ArrowLeft size={16} /> Back to history</Link></div>;

  return <div className="page-stack page-form-layout">
    <PageHeader eyebrow={id ? 'TRADE RECORD' : 'ADD TO YOUR JOURNAL'} title={id ? 'Edit trade' : 'Log a trade'} description={id ? 'Correct the details, outcome, screenshot, or lessons learned.' : 'Add a trade from today or enter a past trade for your historical review.'} />
    <div className="form-intro-note"><AlertTriangle size={16} /><span>Reports use the date and time you select below, not the day you save this record. This makes historical trade entry work correctly.</span></div>
    <TradeForm existingTrade={trade} />
  </div>;
}
