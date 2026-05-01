import { http } from "./httpClient";

export const usersApi = {
  all: () => http.get("/users"),
  byId: (id) => http.get(`/users/${id}`),
};
