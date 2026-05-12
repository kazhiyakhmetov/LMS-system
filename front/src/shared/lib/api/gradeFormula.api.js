import { http } from "./httpClient";

export const gradeFormulaApi = {
  get: () => http.get("/grade-formula"),
  adminUpdate: (body) => http.put("/grade-formula/admin", body),
};
