import { http } from "./httpClient";

export const libraryApi = {
  search: (query) => http.get("/library/search", { query: { query } }),
};
