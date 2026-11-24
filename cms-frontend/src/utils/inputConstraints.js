// Strict character-level input sanitizers and keyboard guards for CMS form fields.

export const sanitizePersonName = (value = '', maxLength = 100) =>
  String(value)
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿÑñ\s'.-]/g, '')
    .replace(/^\s+/, '')
    .slice(0, maxLength);

export const sanitizePhone = (value = '', maxLength = 20) =>
  String(value)
    .replace(/[^0-9+()\-\s]/g, '')
    .replace(/^\s+/, '')
    .slice(0, maxLength);

export const sanitizeCode = (value = '', maxLength = 16) =>
  String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, maxLength);

export const sanitizeReference = (value = '', maxLength = 50) =>
  String(value)
    .replace(/[^A-Za-z0-9#\-/_. ]/g, '')
    .replace(/^\s+/, '')
    .slice(0, maxLength);

export const sanitizeMaskedAccount = (value = '', maxLength = 30) =>
  String(value)
    .replace(/[^0-9*\- ]/g, '')
    .replace(/^\s+/, '')
    .slice(0, maxLength);

export const sanitizeAlphaLabel = (value = '', maxLength = 40) =>
  String(value)
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿÑñ\s\-/()]/g, '')
    .replace(/^\s+/, '')
    .slice(0, maxLength);

export const sanitizeScriptureRef = (value = '', maxLength = 80) =>
  String(value)
    .replace(/[^A-Za-z0-9\s:,\-.;()]/g, '')
    .replace(/^\s+/, '')
    .slice(0, maxLength);

export const sanitizeWholeNumber = (value = '', { max, maxLength = 9 } = {}) => {
  const digits = String(value).replace(/[^0-9]/g, '').slice(0, maxLength);
  if (!digits) return '';
  const num = Number(digits);
  if (max != null && Number.isFinite(max) && num > max) return String(max);
  return String(num);
};

export const sanitizeSignedInteger = (value = '', maxLength = 9) => {
  const raw = String(value).trim();
  const negative = raw.startsWith('-');
  const digits = raw.replace(/[^0-9]/g, '').slice(0, maxLength);
  if (!digits) return negative ? '-' : '';
  return `${negative ? '-' : ''}${digits}`;
};

export const sanitizeCurrency = (value = '', maxWholeDigits = 10) => {
  const cleaned = String(value).replace(/[^0-9.]/g, '');
  if (!cleaned) return '';
  const [wholePart = '', ...rest] = cleaned.split('.');
  const whole = wholePart.slice(0, maxWholeDigits);
  if (rest.length === 0) return whole;
  const decimals = rest.join('').slice(0, 2);
  return `${whole || '0'}.${decimals}`;
};

export const blockInvalidIntegerKeys = (event) => {
  if (['e', 'E', '+', '-', '.'].includes(event.key)) {
    event.preventDefault();
  }
};

export const blockInvalidSignedIntegerKeys = (event) => {
  if (['e', 'E', '+', '.'].includes(event.key)) {
    event.preventDefault();
  }
};

export const blockInvalidDecimalKeys = (event) => {
  if (['e', 'E', '+', '-'].includes(event.key)) {
    event.preventDefault();
  }
};
