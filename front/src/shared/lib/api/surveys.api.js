import { http } from "./httpClient";

export const surveysApi = {
  available: () => http.get("/surveys/available"),
  byId: (surveyId) => http.get(`/surveys/${surveyId}`),
  answer: (body) => http.post("/surveys/answer", body),

  adminCreate: (body) => http.post("/surveys", body),
  adminList: () => http.get("/surveys/admin"),
  adminResults: (surveyId) => http.get(`/surveys/${surveyId}/results`),
};
