const DEFAULT_ROLE = "STUDENT";

const ROLE_PATHS = {
  ADMIN: "/admin",
  TEACHER: "/teacher",
  PARENT: "/parent",
  STUDENT: "/student",
};

export function roleToPath(role) {
  return ROLE_PATHS[role] ?? ROLE_PATHS[DEFAULT_ROLE];
}

export function roleSectionPath(role, section) {
  return `${roleToPath(role)}/${section}`;
}
