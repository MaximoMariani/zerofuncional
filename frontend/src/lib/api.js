/**
 * API client for ZERO frontend.
 *
 * In production (Railway): frontend and API are served from the same origin,
 * so BASE is '' — all fetch calls go to /api/... on the same host/port.
 *
 * In local dev with separate servers: set NEXT_PUBLIC_API_URL=http://localhost:4000
 * in frontend/.env.local and the client will prefix all requests with that URL.
 */
const BASE = process.env.NEXT_PUBLIC_API_URL || '';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  // Transparent JWT refresh on 401
  if (res.status === 401 && path !== '/api/auth/login') {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      const refreshRes = await fetch(`${BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshRes.ok) {
        const { accessToken, refreshToken: newRefresh } = await refreshRes.json();
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefresh);
        return apiFetch(path, options); // retry
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return;
      }
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error || 'Request failed'), { status: res.status });
  }

  return res.json();
}

export const api = {
  get:   (path)        => apiFetch(path),
  post:  (path, body)  => apiFetch(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch: (path, body)  => apiFetch(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  del:   (path)        => apiFetch(path, { method: 'DELETE' }),
};
