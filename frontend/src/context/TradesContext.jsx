import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchTrades } from '../api/trades.js';

const TradesContext = createContext(null);

export function TradesProvider({ children }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const records = await fetchTrades({ limit: 5000 });
      setTrades(records);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not connect to the API.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = { trades, loading, error, refresh };
  return <TradesContext.Provider value={value}>{children}</TradesContext.Provider>;
}

export function useTrades() {
  const context = useContext(TradesContext);
  if (!context) throw new Error('useTrades must be used inside TradesProvider.');
  return context;
}
