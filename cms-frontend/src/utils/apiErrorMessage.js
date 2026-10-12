export const apiErrorMessage = (error, fallback = 'The request failed.') => {
  const message = error?.response?.data?.error?.message || error?.response?.data?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
};
