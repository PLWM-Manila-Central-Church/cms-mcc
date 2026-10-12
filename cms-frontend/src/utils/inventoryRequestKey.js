export const createInventoryRequestKey = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  const randomPart = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `inventory-${Date.now().toString(36)}-${randomPart}`;
};
