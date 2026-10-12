const apiBase = () => (
  process.env.NODE_ENV === 'production'
    ? '/api'
    : process.env.REACT_APP_API_URL || '/api'
).replace(/\/+$/, '');

export const uploadUrl = (storedPath) => {
  if (!storedPath) return '';
  const value = String(storedPath).trim();
  if (/^https?:\/\//i.test(value)) {
    try {
      const segments = new URL(value).pathname.split('/').filter(Boolean).map(decodeURIComponent);
      const profileIndex = segments.lastIndexOf('profiles');
      const filename = profileIndex >= 0 && profileIndex === segments.length - 2 ? segments[profileIndex + 1] : null;
      if (filename && filename !== '.' && filename !== '..') {
        return `${apiBase()}/uploads/profiles/${encodeURIComponent(filename)}`;
      }
    } catch { /* Keep an unrecognized legacy URL unchanged. */ }
    return value;
  }
  const path = value.startsWith('/uploads/')
    ? value
    : `/uploads/${value.replace(/^\/+/, '')}`;
  return `${apiBase()}${path}`;
};
