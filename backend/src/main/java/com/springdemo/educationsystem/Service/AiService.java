package com.springdemo.educationsystem.Service;

import com.springdemo.educationsystem.DTO.RecommendationDTO;
import com.springdemo.educationsystem.DTO.StudentRiskDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.ResourceAccessException;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Thin wrapper over the FastAPI {@code studix-ai} service.
 * Returns sensible defaults (empty list / null) when AI is unavailable so the
 * dashboard never breaks because the ML container is down for maintenance.
 */
@Service
public class AiService {

    private static final Logger log = LoggerFactory.getLogger(AiService.class);

    private final RestClient ai;
    private final RestClient aiGen;

    public AiService(@Qualifier("aiRestClient") RestClient ai,
                     @Qualifier("aiGenRestClient") RestClient aiGen) {
        this.ai = ai;
        this.aiGen = aiGen;
    }

    /**
     * Calls the AI quiz generator. Uses a separate RestClient with 4 min
     * read-timeout — Qwen 2.5 3B on CPU may take 30-90 seconds per request.
     */
    public Map<String, Object> generateQuiz(String text, int nQuestions, String difficulty, String kind) {
        Map<String, Object> body = Map.of(
                "text", text == null ? "" : text,
                "nQuestions", Math.max(2, Math.min(15, nQuestions)),
                "difficulty", difficulty == null || difficulty.isBlank() ? "medium" : difficulty,
                "kind", kind == null || kind.isBlank() ? "quiz" : kind
        );
        try {
            return aiGen.post()
                    .uri("/generate/quiz")
                    .body(body)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
        } catch (ResourceAccessException e) {
            log.warn("AI generator unreachable: {}", e.getMessage());
            return Map.of("error", "AI service is unreachable");
        } catch (Exception e) {
            log.warn("generateQuiz failed: {}", e.getMessage());
            return Map.of("error", e.getMessage());
        }
    }

    public StudentRiskDTO riskForStudent(Long studentId) {
        try {
            return ai.get()
                    .uri("/risk/student/{id}", studentId)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, resp) -> {
                        // 404 student-not-found / 503 model-not-ready — treat as null
                    })
                    .body(StudentRiskDTO.class);
        } catch (ResourceAccessException e) {
            log.warn("AI service unreachable for risk/student/{}: {}", studentId, e.getMessage());
            return null;
        } catch (Exception e) {
            log.warn("riskForStudent({}) failed: {}", studentId, e.getMessage());
            return null;
        }
    }

    public List<StudentRiskDTO> riskForClass(Long classId, String levelFilter) {
        try {
            String uri = levelFilter != null && !levelFilter.isBlank()
                    ? "/risk/class/" + classId + "?level=" + levelFilter
                    : "/risk/class/" + classId;
            List<StudentRiskDTO> rows = ai.get()
                    .uri(uri)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<StudentRiskDTO>>() {});
            return rows != null ? rows : Collections.emptyList();
        } catch (Exception e) {
            log.warn("riskForClass({}, {}) failed: {}", classId, levelFilter, e.getMessage());
            return Collections.emptyList();
        }
    }

    public Map<String, Object> riskSchoolSummary(Long schoolId) {
        try {
            return ai.get()
                    .uri("/risk/school/{id}/summary", schoolId)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.warn("riskSchoolSummary({}) failed: {}", schoolId, e.getMessage());
            return Map.of("total", 0, "high", 0, "mid", 0, "low", 0, "topRisk", List.of());
        }
    }

    public List<RecommendationDTO> recommendForStudent(Long studentId, int limit) {
        try {
            List<RecommendationDTO> recs = ai.get()
                    .uri("/recommend/student/{id}?limit={limit}", studentId, limit)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<RecommendationDTO>>() {});
            return recs != null ? recs : Collections.emptyList();
        } catch (Exception e) {
            log.warn("recommendForStudent({}) failed: {}", studentId, e.getMessage());
            return Collections.emptyList();
        }
    }

    public int refreshAllRecommendations() {
        try {
            Map<String, Object> resp = ai.post()
                    .uri("/recommend/refresh")
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
            if (resp == null) return 0;
            Object n = resp.get("refreshed");
            return n instanceof Number ? ((Number) n).intValue() : 0;
        } catch (Exception e) {
            log.warn("refreshAllRecommendations failed: {}", e.getMessage());
            return 0;
        }
    }
}
