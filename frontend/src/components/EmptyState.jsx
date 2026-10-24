import { ImagePlus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmptyState({ title = 'No trades found', description = 'Add your first trade to start building your visual journal.', action = true }) {
  return <div className="empty-state">
    <div className="empty-icon"><ImagePlus size={24} /></div>
    <h3>{title}</h3><p>{description}</p>
    {action && <Link className="button button-primary" to="/trades/new">Add a trade</Link>}
  </div>;
}
