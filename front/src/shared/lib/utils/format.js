const SHORT_DAY_MONTH_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
});

const CHAT_TIME_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
});

function normalizeDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatShortDayMonth(value) {
  const date = normalizeDate(value);
  return date ? SHORT_DAY_MONTH_FORMATTER.format(date) : String(value ?? "");
}

export function formatChatTime(value = new Date()) {
  const date = normalizeDate(value);
  return date ? CHAT_TIME_FORMATTER.format(date) : "";
}
