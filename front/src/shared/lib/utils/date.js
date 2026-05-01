export function toISODate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMondayISO(date = new Date()) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return toISODate(d);
}

export function addDaysISO(isoDate, amount) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + amount);
  return toISODate(d);
}

export function formatWeekRange(startISO) {
  const start = new Date(startISO);
  const end = new Date(startISO);
  end.setDate(end.getDate() + 6);
  const dd = (n) => String(n).padStart(2, "0");
  const s = `${dd(start.getDate())}.${dd(start.getMonth() + 1)}`;
  const e = `${dd(end.getDate())}.${dd(end.getMonth() + 1)}.${end.getFullYear()}`;
  return `${s} - ${e}`;
}

export function formatDayMonth(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}`;
}

export function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function quarterKeyToNumber(key) {
  if (typeof key !== "string") return null;
  const n = Number(key.replace(/^q/i, ""));
  return Number.isFinite(n) && n >= 1 && n <= 4 ? n : null;
}

export function formatTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}
