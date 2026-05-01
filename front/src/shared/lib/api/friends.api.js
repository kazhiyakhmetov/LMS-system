import { http } from "./httpClient";

export const friendsApi = {
  myFriends: () => http.get("/friends/my"),
  pending: () => http.get("/friends/pending"),
  searchUsers: (query) => http.get("/friends/search-users", { query: { query } }),
  search: (query) => http.get("/friends/search", { query: { query } }),
  stats: () => http.get("/friends/stats"),
  request: (userId) => http.post(`/friends/request/${userId}`),
  accept: (friendshipId) => http.post(`/friends/accept/${friendshipId}`),
  reject: (friendshipId) => http.post(`/friends/reject/${friendshipId}`),
  remove: (friendId) => http.delete(`/friends/remove/${friendId}`),
};
