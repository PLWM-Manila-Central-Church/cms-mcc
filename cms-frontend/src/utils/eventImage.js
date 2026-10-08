const API_BASE = (
  process.env.NODE_ENV === 'production'
    ? '/api'
    : process.env.REACT_APP_API_URL || '/api'
).replace(/\/+$/, '');

export const eventImageSrc = (event) => {
  if (!event?.image_url) return '';
  if (/^https?:\/\//i.test(event.image_url)) return event.image_url;
  return `${API_BASE}${event.image_url.startsWith('/') ? event.image_url : `/${event.image_url}`}`;
};
