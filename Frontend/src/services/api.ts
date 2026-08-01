import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE, withCredentials: true });

function getTokenExpiresAt(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function shouldRefreshToken(token: string): boolean {
  const expiresAt = getTokenExpiresAt(token);
  if (!expiresAt) return !!localStorage.getItem('refresh_token');
  return expiresAt <= Date.now() + 30_000;
}

export async function refreshStoredToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) throw new Error('Missing refresh token');

  const { data } = await axios.post(`${BASE}/auth/refresh`, { refresh_token: refreshToken });
  const newAccess = data.data.accessToken;
  const newRefresh = data.data.refreshToken;
  localStorage.setItem('access_token', newAccess);
  localStorage.setItem('refresh_token', newRefresh);
  return newAccess;
}

export async function ensureFreshAccessToken(): Promise<string | null> {
  const token = localStorage.getItem('access_token');
  if (!token) return null;
  if (!shouldRefreshToken(token)) return token;
  return refreshStoredToken();
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = false;
let queue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
        return Promise.reject(err);
      }

      if (refreshing) {
        return new Promise((resolve) => {
          queue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      original._retry = true;
      refreshing = true;

      try {
        const newAccess = await refreshStoredToken();
        queue.forEach((cb) => cb(newAccess));
        queue = [];
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        refreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default api;
