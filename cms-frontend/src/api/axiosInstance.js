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

// ── Request scope and deduplication ───────────────────────────────
const inFlightRequests = new Map();
let activeLeaderScopeHeader = null;

export const setLeaderScopeHeader = (scopeKey) => {
  activeLeaderScopeHeader = typeof scopeKey === 'string' && scopeKey.length <= 80
    ? scopeKey
    : null;
};

const captureLeaderScope = (config) => {
  if (config.__mccLeaderScopeCaptured !== true) {
    config.__mccLeaderScopeKey = activeLeaderScopeHeader;
    config.__mccLeaderScopeCaptured = true;
  }
  return config.__mccLeaderScopeKey || null;
};

function buildDedupKey(config, scopeKey = captureLeaderScope(config)) {
  const method = (config.method || 'get').toLowerCase();
  if (!['post', 'put', 'patch'].includes(method)) return null;
  const url = config.url || '';
  const bodyHash = config.data ? JSON.stringify(config.data) : '';
  return `${method}:${scopeKey || ''}:${url}:${bodyHash}`;
}

axiosInstance.interceptors.request.use(
  (config) => {
    const scopeKey = captureLeaderScope(config);
    if (typeof config.headers?.set === 'function') {
      config.headers.delete('X-MCC-Leader-Scope');
      if (scopeKey) config.headers.set('X-MCC-Leader-Scope', scopeKey);
    } else {
      config.headers = { ...config.headers };
      delete config.headers['X-MCC-Leader-Scope'];
      delete config.headers['x-mcc-leader-scope'];
      if (scopeKey) config.headers['X-MCC-Leader-Scope'] = scopeKey;
    }

    const method = (config.method || 'get').toLowerCase();
    if (!['post', 'put', 'patch'].includes(method)) return config;

    // Axios transforms JSON data in dispatchRequest before it invokes the
    // adapter. Capture the original adapter here, then compute the dedup key
    // and share the request only when the transformed config reaches it.
    if (!config.__mccOriginalAdapter) config.__mccOriginalAdapter = axios.getAdapter(config.adapter);
    const originalAdapter = config.__mccOriginalAdapter;
    config.adapter = (requestConfig) => {
      const requestScope = captureLeaderScope(requestConfig);
      const dedupKey = buildDedupKey(requestConfig, requestScope);
      if (!dedupKey) return originalAdapter(requestConfig);

      const pending = inFlightRequests.get(dedupKey);
      if (pending) return pending;

      let requestPromise;
      requestPromise = Promise.resolve()
        .then(() => originalAdapter(requestConfig))
        .finally(() => {
          if (inFlightRequests.get(dedupKey) === requestPromise) inFlightRequests.delete(dedupKey);
        });
      inFlightRequests.set(dedupKey, requestPromise);
      return requestPromise;
    };
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

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
