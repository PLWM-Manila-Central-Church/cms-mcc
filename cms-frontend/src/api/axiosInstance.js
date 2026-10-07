import axios from 'axios';
import toast from 'react-hot-toast';

const apiBaseUrl =
  process.env.NODE_ENV === 'production'
    ? '/api'
    : process.env.REACT_APP_API_URL;

const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ── Token refresh queue — prevents concurrent refresh race conditions ──
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeToRefresh(resolve, reject) {
  refreshSubscribers.push({ resolve, reject });
}

function onRefreshed() {
  const subscribers = refreshSubscribers;
  refreshSubscribers = [];
  subscribers.forEach(({ resolve }) => resolve());
}

function onRefreshFailed(error) {
  const subscribers = refreshSubscribers;
  refreshSubscribers = [];
  subscribers.forEach(({ reject }) => reject(error));
}

const shouldAttemptRefresh = (url = '') => {
  const path = String(url).split(/[?#]/, 1)[0].replace(/\/+$/, '');
  const noRefreshEndpoints = [
    '/auth/login',
    '/auth/refresh',
    '/auth/refresh-token',
    '/auth/forgot-password',
    '/auth/reset-password',
  ];
  return !noRefreshEndpoints.some((endpoint) => path.endsWith(endpoint));
};

// ── Request deduplication — prevents double-submits of identical mutating requests ──
const inFlightRequests = new Map();

function buildDedupKey(config) {
  const method = (config.method || 'get').toLowerCase();
  if (!['post', 'put', 'patch'].includes(method)) return null;
  const url = config.url || '';
  const bodyHash = config.data ? JSON.stringify(config.data) : '';
  return `${method}:${url}:${bodyHash}`;
}

axiosInstance.interceptors.request.use(
  (config) => {
    const dedupKey = buildDedupKey(config);
    if (dedupKey && inFlightRequests.has(dedupKey)) {
      return inFlightRequests.get(dedupKey);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => {
    const dedupKey = buildDedupKey(response.config);
    if (dedupKey) inFlightRequests.delete(dedupKey);
    return response;
  },
  async (error) => {
    const original = error.config;
    if (original) {
      const dedupKey = buildDedupKey(original);
      if (dedupKey) inFlightRequests.delete(dedupKey);
    }

    const status = error.response?.status;
    if (status === 401 && original && !original._retry && shouldAttemptRefresh(original.url)) {
      original._retry = true;
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeToRefresh(() => resolve(axiosInstance(original)), reject);
        });
      }

      isRefreshing = true;
      try {
        const baseUrl = (axiosInstance.defaults.baseURL || '').replace(/\/+$/, '');
        await axios.post(`${baseUrl}/auth/refresh`, {}, { withCredentials: true });
        onRefreshed(null);
        return axiosInstance(original);
      } catch (refreshError) {
        onRefreshFailed(refreshError);
        if (!original._skipAuthRedirect) window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (!error.response) {
      toast.error('Network error. Please check your connection.');
    } else if (status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (status === 403) {
      toast.error('Access denied. You do not have permission for this action.');
    }

    return Promise.reject(error);
  }
);

axiosInstance.inFlightRequests = inFlightRequests;

export default axiosInstance;
