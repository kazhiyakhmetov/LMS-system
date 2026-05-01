import { http } from "../api/httpClient";
import { normalizeRole } from "./roleNormalize";

function buildName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(" ");
}

function mapLoginResponse(dto) {
  return {
    token: dto.token,
    user: {
      id: dto.userId,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      name: buildName(dto.firstName, dto.lastName),
      role: normalizeRole(dto.role),
    },
  };
}

function mapUserDTO(dto) {
  const role = normalizeRole(dto.roles?.[0] ?? dto.role);
  return {
    id: dto.id,
    email: dto.email,
    firstName: dto.firstName,
    lastName: dto.lastName,
    patronymic: dto.patronymic ?? null,
    schoolId: dto.schoolId ?? null,
    schoolName: dto.schoolName ?? null,
    name: buildName(dto.firstName, dto.lastName),
    role,
  };
}

export async function loginRequest({ email, password }) {
  if (!email || !password) {
    throw new Error("Введите почту и пароль");
  }
  const data = await http.post(
    "/auth/login",
    { email, password },
    { skipAuth: true },
  );
  return mapLoginResponse(data);
}

export async function fetchCurrentUser() {
  const dto = await http.get("/auth/me");
  return mapUserDTO(dto);
}

export async function logoutRequest() {
  try {
    await http.post("/auth/logout");
  } catch {
    // Сервер мог упасть — всё равно чистим сессию локально.
  }
}
