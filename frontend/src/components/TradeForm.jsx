import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ImagePlus, Save, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createTrade, imageUrl, updateTrade } from '../api/trades.js';
import { localDateTimeParts } from '../utils/dateStats.js';
import { useTrades } from '../context/TradesContext.jsx';
import ResultBadge from './ResultBadge.jsx';

const blankForm = () => ({ symbol: '', direction: 'LONG', result: 'OPEN', date: localDateTimeParts().date, time: localDateTimeParts().time, entryPrice: '', takeProfit: '', stopLoss: '', riskReward: '', pnl: '', strategy: '', session: '', notes: '', review: '' });

function fromTrade(trade) {
  const parts = localDateTimeParts(trade.tradeDate);
  return {
    symbol: trade.symbol || '', direction: trade.direction || 'LONG', result: trade.result || 'OPEN', date: parts.date, time: parts.time,
    entryPrice: trade.entryPrice ?? '', takeProfit: trade.takeProfit ?? '', stopLoss: trade.stopLoss ?? '', riskReward: trade.riskReward ?? '', pnl: trade.pnl ?? '',
    strategy: trade.strategy || '', session: trade.session || '', notes: trade.notes || '', review: trade.review || ''
  };
}

function Field({ label, hint, children, className = '' }) {
  return <label className={`form-field ${className}`}><span className="field-label">{label}</span>{children}{hint && <small className="field-hint">{hint}</small>}</label>;
}

export default function TradeForm({ existingTrade = null }) {
  const navigate = useNavigate();
  const { refresh } = useTrades();
  const [form, setForm] = useState(() => existingTrade ? fromTrade(existingTrade) : blankForm());
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(existingTrade?.screenshot ? imageUrl(existingTrade.screenshot) : '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(existingTrade);

  useEffect(() => {
    if (existingTrade) {
      setForm(fromTrade(existingTrade));
      setPreview(imageUrl(existingTrade.screenshot));
    }
  }, [existingTrade]);

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const riskRewardHint = useMemo(() => {
    if (form.entryPrice === '' || form.stopLoss === '' || form.takeProfit === '') return '';
    const risk = Math.abs(Number(form.entryPrice) - Number(form.stopLoss));
    const reward = Math.abs(Number(form.takeProfit) - Number(form.entryPrice));
    if (!risk || !Number.isFinite(reward)) return '';
    return `Estimated R:R ${ (reward / risk).toFixed(2) }:1`;
  }, [form.entryPrice, form.stopLoss, form.takeProfit]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!form.symbol.trim()) return setError('Enter the trading pair or instrument.');
    if (!form.date || !form.time) return setError('Select the date and time of the trade.');
    if (!isEditing && !file) return setError('Upload a screenshot for this trade.');
    const date = new Date(`${form.date}T${form.time}:00`);
    if (Number.isNaN(date.getTime())) return setError('Please select a valid date and time.');

    const payload = new FormData();
    const fields = ['symbol', 'direction', 'result', 'entryPrice', 'takeProfit', 'stopLoss', 'riskReward', 'pnl', 'strategy', 'session', 'notes', 'review'];
    fields.forEach((key) => payload.append(key, form[key] ?? ''));
    payload.append('tradeDate', date.toISOString());
    if (file) payload.append('screenshot', file);

    setSaving(true);
    try {
      const saved = isEditing ? await updateTrade(existingTrade._id, payload) : await createTrade(payload);
      await refresh();
      navigate(`/trade/${saved._id}`, { replace: !isEditing, state: { saved: true } });
    } catch (err) {
      setError(err.message || 'Unable to save this trade.');
    } finally {
      setSaving(false);
    }
  }

  return <form className="trade-form" onSubmit={handleSubmit}>
    <section className="form-section">
      <div className="form-section-head"><span className="section-number">01</span><div><h2>Trade details</h2><p>The date is when you took the trade, even if you're logging it later.</p></div></div>
      <div className="form-grid form-grid-two">
        <Field label="Trading pair / instrument"><input autoFocus value={form.symbol} onChange={update('symbol')} placeholder="e.g. XAUUSD" maxLength={30} required /></Field>
        <Field label="Trade direction"><select value={form.direction} onChange={update('direction')}><option value="LONG">Buy / Long</option><option value="SHORT">Sell / Short</option></select></Field>
        <Field label="Trade date"><input type="date" value={form.date} onChange={update('date')} required /></Field>
        <Field label="Trade time"><input type="time" value={form.time} onChange={update('time')} required /></Field>
        <Field label="Result" className="field-full"><div className="result-picker">
          {[['TP', 'Take profit', 'pick-tp'], ['SL', 'Stop loss', 'pick-sl'], ['BE', 'Break even', 'pick-be'], ['OPEN', 'Still open', 'pick-open']].map(([value, label, cls]) => <button type="button" key={value} className={`result-pick ${cls} ${form.result === value ? 'selected' : ''}`} onClick={() => setForm((current) => ({ ...current, result: value }))}><span>{value}</span><small>{label}</small></button>)}
        </div></Field>
      </div>
    </section>

    <section className="form-section">
      <div className="form-section-head"><span className="section-number">02</span><div><h2>Chart screenshot</h2><p>Save the actual chart so you can revisit the setup later.</p></div></div>
      <label className={`upload-zone ${preview ? 'has-preview' : ''}`}>
        {preview ? <><img src={preview} alt="Trade screenshot preview" className="upload-preview" /><span className="upload-overlay"><ImagePlus size={17} /> Replace screenshot</span></> : <><span className="upload-icon"><ImagePlus size={24} /></span><strong>Click to upload your chart</strong><span>JPG, PNG, WEBP or GIF · up to 10 MB</span></>}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setFile(event.target.files?.[0] || null)} />
      </label>
      {file && <div className="file-chip"><ImagePlus size={14} /><span>{file.name}</span><button type="button" onClick={() => { setFile(null); setPreview(existingTrade?.screenshot ? imageUrl(existingTrade.screenshot) : ''); }} aria-label="Remove selected screenshot"><X size={15} /></button></div>}
    </section>

    <section className="form-section">
      <div className="form-section-head"><span className="section-number">03</span><div><h2>Trade metrics <span className="optional-label">Optional</span></h2><p>Only enter what you know. Leave missing values blank.</p></div></div>
      <div className="form-grid form-grid-three">
        <Field label="Entry price"><input type="number" step="any" value={form.entryPrice} onChange={update('entryPrice')} placeholder="0.00" /></Field>
        <Field label="Take profit"><input type="number" step="any" value={form.takeProfit} onChange={update('takeProfit')} placeholder="0.00" /></Field>
        <Field label="Stop loss"><input type="number" step="any" value={form.stopLoss} onChange={update('stopLoss')} placeholder="0.00" /></Field>
        <Field label="Risk-to-reward"><input type="number" min="0" step="0.01" value={form.riskReward} onChange={update('riskReward')} placeholder="e.g. 2" />{riskRewardHint && !form.riskReward && <small className="field-hint">{riskRewardHint}</small>}</Field>
        <Field label="Profit / loss (USD)"><input type="number" step="any" value={form.pnl} onChange={update('pnl')} placeholder="e.g. 25 or -10" /></Field>
        <Field label="Trading session"><select value={form.session} onChange={update('session')}><option value="">Select session</option><option>Asian</option><option>London</option><option>New York</option><option>London / New York overlap</option><option>Other</option></select></Field>
        <Field label="Strategy / setup" className="field-full"><input value={form.strategy} onChange={update('strategy')} placeholder="e.g. Breakout retest, support bounce" maxLength={100} /></Field>
      </div>
    </section>

    <section className="form-section">
      <div className="form-section-head"><span className="section-number">04</span><div><h2>Trade review</h2><p>Write down what you noticed, what worked, and what you would change.</p></div></div>
      <div className="form-grid">
        <Field label="My notes"><textarea rows="3" value={form.notes} onChange={update('notes')} placeholder="Why did you enter this trade? What did you see on the chart?" maxLength={5000} /></Field>
        <Field label="Chart review / lessons learned"><textarea rows="4" value={form.review} onChange={update('review')} placeholder="Record observations about trend, support/resistance, entry timing, risk management, or possible reasons for the outcome." maxLength={5000} /></Field>
      </div>
    </section>

    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="form-actions"><Link to={isEditing ? `/trade/${existingTrade._id}` : '/'} className="button button-quiet"><ArrowLeft size={16} /> Cancel</Link><button className="button button-primary" type="submit" disabled={saving}>{saving ? <span className="spinner" /> : <Save size={16} />}{saving ? 'Saving trade…' : isEditing ? 'Save changes' : 'Save trade'}</button></div>
  </form>;
}
