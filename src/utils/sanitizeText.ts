export function sanitizeText(input: string): string {
  if (!input) return "";

  return input
    // убираем управляющие символы
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    // оставляем латиницу, кириллицу, цифры, символы
    .replace(/[^\x20-\x7E\u0400-\u04FF]/g, "");
}
