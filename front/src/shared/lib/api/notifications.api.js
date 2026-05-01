import { http } from "./httpClient";

export const notificationsApi = {
  all: () => http.get("/notifications"),
  unread: () => http.get("/notifications/unread"),
  unreadCount: () => http.get("/notifications/unread-count"),
  markRead: (notificationId) => http.post(`/notifications/${notificationId}/mark-read`),
  hide: (notificationId) => http.post(`/notifications/${notificationId}/hide`),
  markAllRead: () => http.post("/notifications/mark-all-read"),
};
