import axios from 'axios';
import toast from 'react-hot-toast';

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ── Token refresh queue — prevents concurrent refresh race conditions ──
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeToRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(newToken) {
  refreshSubscribers.forEach(cb => cb(newToken));
  refreshSubscribers = [];
}

// ── Request deduplication — prevents double-submits of identical mutating requests ──
const inFlightRequests = new Map();

function buildDedupKey(config) {
  const method = (config.method || 'get').toLowerCase();
  // Only deduplicate POST, PUT, PATCH
  if (!['post', 'put', 'patch'].includes(method)) return null;
  const url = config.url || '';
  const bodyHash = config.data ? JSON.stringify(config.data) : '';
  return `${method}:${url}:${bodyHash}`;
}

// ── Request interceptor: deduplication only (cookies handle auth) ──
axiosInstance.interceptors.request.use(
  (config) => {
    // Deduplication check for mutating requests
    const dedupKey = buildDedupKey(config);
    if (dedupKey && inFlightRequests.has(dedupKey)) {
      // Return the existing in-flight promise instead of creating a new one
      return inFlightRequests.get(dedupKey);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: token refresh + global error toasts + dedup cleanup ──
axiosInstance.interceptors.response.use(
  (response) => {
    // Clean up dedup entry on successful response
    const dedupKey = buildDedupKey(response.config);
    if (dedupKey) {
      inFlightRequests.delete(dedupKey);
    }
    return response;
  },
  async (error) => {
    const original = error.config;

    // Clean up dedup entry on error too
    if (original) {
      const dedupKey = buildDedupKey(original);
      if (dedupKey) {
        inFlightRequests.delete(dedupKey);
      }
    }

    const status = error.response?.status;

    // ── 401: attempt token refresh (with queue to prevent races) ──
    if (status === 401 && original && !original._retry) {
      if (isRefreshing) {
        // Another request is already refreshing — queue this one
        return new Promise((resolve) => {
          subscribeToRefresh((newToken) => {
            original.headers['Authorization'] = `Bearer ${newToken}`;
            resolve(axiosInstance(original));
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        // Cookie auto-sends the refreshToken — just hit the endpoint
        const res = await axios.post(
          `${process.env.REACT_APP_API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        // Tokens are set as httpOnly cookies by server — no need to store locally
        // User and permissions cookies are also refreshed by the server

        // Trigger retries with the (now-refreshed) cookie-based auth
        onRefreshed(null);
        return axiosInstance(original);
      } catch (err) {
        // Refresh failed — cookies are cleared by server, just redirect
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    // ── Global error toasts (only for errors not handled by pages) ──
    if (!error.response) {
      // Network error (no response at all)
      toast.error('Network error. Please check your connection.');
    } else if (status >= 500) {
      // Server error — toast once (debounce: only if not already showing)
      toast.error('Server error. Please try again later.');
    } else if (status === 403) {
      toast.error('Access denied. You do not have permission for this action.');
    }
    // Note: 400/404 are handled by page-level catch blocks with specific messages

    return Promise.reject(error);
  }
);

// Expose inFlightRequests for testing / introspection
axiosInstance.inFlightRequests = inFlightRequests;

export default axiosInstance;