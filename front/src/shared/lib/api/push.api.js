import { http } from "./httpClient";

export const pushApi = {
  publicKey: () => http.get("/push/public-key"),
  subscribe: (subscription) => http.post("/push/subscribe", subscription),
  unsubscribe: (endpoint) => http.post("/push/unsubscribe", { endpoint }),
  test: () => http.post("/push/test", {}),
};
