const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/, "");

/**
 * Превращает относительный путь файла из бэка (`profiles/foo.png`) в полный URL.
 * Возвращает null если path пустой.
 */
export function getAvatarUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path) || path.startsWith("data:") || path.startsWith("blob:")) return path;
  let cleanPath = path.startsWith("/") ? path.slice(1) : path;
  // Бэк иногда возвращает profilePhotoUrl уже с "uploads/..." — не дублируем префикс.
  if (cleanPath.startsWith("uploads/")) {
    return `${BASE_URL}/${cleanPath}`;
  }
  return `${BASE_URL}/uploads/${cleanPath}`;
}

export function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0] || "")
    .join("")
    .toUpperCase() || "?";
}
