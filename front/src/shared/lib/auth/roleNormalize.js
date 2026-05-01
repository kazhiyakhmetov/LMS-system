export const ROLES = {
  ADMIN: "ADMIN",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
  PARENT: "PARENT",
};

export function normalizeRole(role) {
  if (typeof role !== "string" || !role) return null;
  const upper = role.toUpperCase();
  return ROLES[upper] ?? null;
}
