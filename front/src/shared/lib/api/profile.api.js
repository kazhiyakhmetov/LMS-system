import { http } from "./httpClient";

export const profileApi = {
  me: () => http.get("/profile"),
  updateBio: (bio) => http.put("/profile/bio", { bio }),
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return http.post("/profile/avatar", fd);
  },
  deleteAvatar: () => http.delete("/profile/avatar"),
};
