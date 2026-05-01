import { http } from "./httpClient";

export const chatApi = {
  conversations: () => http.get("/chat/conversations"),
  conversation: (otherUserId) => http.get(`/chat/conversation/${otherUserId}`),
  send: ({ receiverId, content, replyToId }) =>
    http.post("/chat/send", { receiverId, content, replyToId }),
  react: (messageId, reaction) => http.post(`/chat/${messageId}/react`, { reaction }),
  unreadCount: () => http.get("/chat/unread-count"),
};
