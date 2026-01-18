// src/utils/parseUserAgent.ts
export function parseUserAgent(ua?: string): string {
  if (!ua) return "Unknown";

  let os = "";
  let browser = "";

  // OS
  if (ua.includes("Windows NT 10.0")) os = "Windows 10";
  else if (ua.includes("Windows NT 11.0")) os = "Windows 11";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";

  // Browser
  const chrome = ua.match(/Chrome\/([\d.]+)/);
  if (chrome) browser = `Chrome ${chrome[1]}`;

  const edge = ua.match(/Edg\/([\d.]+)/);
  if (edge) browser = `Edge ${edge[1]}`;

  const firefox = ua.match(/Firefox\/([\d.]+)/);
  if (firefox) browser = `Firefox ${firefox[1]}`;

  if (os && browser) return `${os} · ${browser}`;
  if (os) return os;
  if (browser) return browser;

  // fallback — показываем raw, ничего не теряем
  return ua;
}
