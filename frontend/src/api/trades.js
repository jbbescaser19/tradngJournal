const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) throw new Error(body?.message || `Request failed (${response.status}).`);
  return body;
}

export const imageUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_URL}${path}`;
};

export async function fetchTrades(params = {}) {
  const query = new URLSearchParams(params);
  const suffix = query.size ? `?${query.toString()}` : '';
  return (await request(`/api/trades${suffix}`)).trades;
}

export async function fetchTrade(id) {
  return (await request(`/api/trades/${id}`)).trade;
}

export async function createTrade(formData) {
  return (await request('/api/trades', { method: 'POST', body: formData })).trade;
}

export async function updateTrade(id, formData) {
  return (await request(`/api/trades/${id}`, { method: 'PATCH', body: formData })).trade;
}

export async function deleteTrade(id) {
  return request(`/api/trades/${id}`, { method: 'DELETE' });
}

export async function analyzeTrade(id) {
  return (await request(`/api/trades/${id}/analyze`, { method: 'POST' })).trade;
}
