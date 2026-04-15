export const safeRandomId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const safeTempPassword = () => {
  const raw = safeRandomId().replace(/-/g, "");
  return `Tmp#${raw.slice(0, 8)}A1`;
};