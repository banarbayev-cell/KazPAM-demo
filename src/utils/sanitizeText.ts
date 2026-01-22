export function sanitizeText(input: string): string {
  if (!input) return "";

  return input
    // убираем управляющие символы
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    // нормализуем пробелы
    .replace(/\s+/g, " ")
    // trim, но НЕ удаляем допустимые символы даты
    .trim();
}
