import { CircleDot, CheckCircle2, Clock3, XCircle } from 'lucide-react';

const config = {
  TP: { text: 'TP · Win', Icon: CheckCircle2, cls: 'result-tp' },
  SL: { text: 'SL · Loss', Icon: XCircle, cls: 'result-sl' },
  BE: { text: 'BE · Break even', Icon: CircleDot, cls: 'result-be' },
  OPEN: { text: 'Open', Icon: Clock3, cls: 'result-open' }
};

export default function ResultBadge({ result }) {
  const item = config[result] || config.OPEN;
  const { Icon } = item;
  return <span className={`result-badge ${item.cls}`}><Icon size={13} strokeWidth={2.2} />{item.text}</span>;
}
