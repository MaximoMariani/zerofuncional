const BASE = process.env.NEXT_PUBLIC_API_URL || '';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}
function getRefreshToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

async function apiFetch(path, options = {}, retrying = false) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401 && !retrying && path !== '/api/auth/login') {
    const rt = getRefreshToken();
    if (rt) {
      const rr = await fetch(`${BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (rr.ok) {
        const { accessToken, refreshToken } = await rr.json();
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        return apiFetch(path, options, true);
      }
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error || 'Request failed'), { status: res.status, data: err });
  }

  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get:   (path)       => apiFetch(path),
  post:  (path, body) => apiFetch(path, { method: 'POST',  body: JSON.stringify(body) }),
  patch: (path, body) => apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del:   (path)       => apiFetch(path, { method: 'DELETE' }),
};

export function fetcher(url) {
  return apiFetch(url);
}
