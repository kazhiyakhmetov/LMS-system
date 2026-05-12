import { http } from "./httpClient";

export const newsApi = {
  /** Лента активных новостей (для всех ролей). */
  list: () => http.get("/news"),

  /** Полный список (включая истёкшие) — только админ. */
  adminList: () => http.get("/news/admin"),

  /**
   * Создать новость. На вход — обычный объект, внутри упаковываем в FormData,
   * чтобы можно было передать файл фото.
   *
   * @param {{ title:string, description?:string, type?:"GENERAL"|"LOCAL", startDate:string, endDate:string, file?:File|null }} payload
   */
  adminCreate: (payload) => {
    const fd = new FormData();
    fd.append("title", payload.title ?? "");
    fd.append("description", payload.description ?? "");
    fd.append("type", payload.type ?? "GENERAL");
    fd.append("startDate", payload.startDate);
    fd.append("endDate", payload.endDate);
    if (payload.file) fd.append("file", payload.file);
    return http.post("/news/admin", fd);
  },

  adminDelete: (id) => http.delete(`/news/admin/${id}`),
};
