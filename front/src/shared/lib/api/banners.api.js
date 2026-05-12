import { http } from "./httpClient";

/**
 * API клиента для глобальных баннеров-уведомлений.
 *
 * Эндпоинты:
 *  - GET    /banners            — активные баннеры для текущей роли (учёт startDate/endDate)
 *  - GET    /banners/admin      — все баннеры (только админ)
 *  - POST   /banners/admin      — создать баннер (только админ)
 *  - DELETE /banners/admin/:id  — удалить баннер (только админ)
 *
 * Тело создания:
 *  { title, message, linkUrl?, linkLabel?,
 *    forStudents, forTeachers, forParents,
 *    startDate, endDate, severity: 'INFO'|'WARNING'|'SUCCESS' }
 */
export const bannersApi = {
  active: () => http.get("/banners"),
  adminList: () => http.get("/banners/admin"),
  adminCreate: (body) => http.post("/banners/admin", body),
  adminDelete: (id) => http.delete(`/banners/admin/${id}`),
};
