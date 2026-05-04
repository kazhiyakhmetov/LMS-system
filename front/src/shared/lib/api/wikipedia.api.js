import { http } from "./httpClient";

export const wikipediaApi = {
  search: (query) => http.get("/wikipedia/search", { query: { query } }),
};
