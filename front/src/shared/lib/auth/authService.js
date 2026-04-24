/**
 * Temporary auth mock used while frontend is being built.
 * Replace with real API request when backend endpoint is ready:
 * return httpRequest("/auth/login", { method: "POST", body: { login, password } });
 */
export async function loginRequest({ login, password }) {
  await new Promise((resolve) => setTimeout(resolve, 650));

  if (!login || !password) {
    throw new Error("Введите логин и пароль");
  }

  const normalizedLogin = login.toLowerCase();
  const role = normalizedLogin.includes("admin")
    ? "ADMIN"
    : normalizedLogin.includes("teacher")
      ? "TEACHER"
      : normalizedLogin.includes("parent")
        ? "PARENT"
        : "STUDENT";

  return {
    token: "mock-jwt-token",
    user: { id: "u1", name: "Demo User", role },
  };
}
