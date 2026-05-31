package com.springdemo.educationsystem.Service;

import com.springdemo.educationsystem.DTO.WikipediaDTO;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class WikipediaService {

    private final RestTemplate restTemplate;

    public WikipediaService() {
        this.restTemplate = new RestTemplate();
    }

    public List<WikipediaDTO> search(String query) {
        System.out.println("🔍 Searching Wikipedia for: " + query);

        try {
            // НЕ кодируем вручную - Spring сделает это автоматически
            URI url = UriComponentsBuilder
                    .fromUriString("https://ru.wikipedia.org/w/api.php")
                    .queryParam("action", "query")
                    .queryParam("format", "json")
                    .queryParam("list", "search")
                    .queryParam("srsearch", query) // Spring автоматически закодирует
                    .queryParam("srlimit", "10")
                    .queryParam("srprop", "snippet")
                    .queryParam("utf8", "1")
                    .build()
                    .toUri();

            System.out.println("📡 API URL: " + url);

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "EducationSystem/1.0 (https://github.com/your-repo; your-email@example.com)");
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    new ParameterizedTypeReference<Map<String, Object>>() {}
            );

            System.out.println("📥 Response status: " + response.getStatusCode());

            Map<String, Object> responseBody = response.getBody();

            if (responseBody != null && responseBody.containsKey("query")) {
                Map<String, Object> queryData = asStringObjectMap(responseBody.get("query"));
                List<Map<String, Object>> searchResults = asSearchResults(queryData.get("search"));

                System.out.println("📊 Found " + (searchResults != null ? searchResults.size() : 0) + " results");

                List<WikipediaDTO> results = new ArrayList<>();
                if (searchResults != null) {
                    for (Map<String, Object> result : searchResults) {
                        String title = (String) result.get("title");
                        String snippet = (String) result.get("snippet");

                        System.out.println("📖 Result: " + title);

                        // Очищаем HTML теги из сниппета
                        String cleanSnippet = cleanHtml(snippet);

                        // Формируем URL статьи (кодируем только здесь для URL)
                        String articleUrl = "https://ru.wikipedia.org/wiki/" +
                                title.replace(" ", "_");

                        results.add(new WikipediaDTO(title, cleanSnippet, articleUrl));
                    }
                }

                return results;
            } else {
                System.out.println("❌ No query in response or response is null");
                if (responseBody != null) {
                    System.out.println("📋 Response keys: " + responseBody.keySet());
                    if (responseBody.containsKey("error")) {
                        System.out.println("❌ API Error: " + responseBody.get("error"));
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("💥 Error searching Wikipedia: " + e.getMessage());
            e.printStackTrace();
        }

        return new ArrayList<>();
    }

    private String cleanHtml(String html) {
        if (html == null) return "";
        return html
                .replaceAll("<[^>]+>", "")
                .replaceAll("&quot;", "\"")
                .replaceAll("&amp;", "&")
                .replaceAll("&lt;", "<")
                .replaceAll("&gt;", ">")
                .replaceAll("&#39;", "'")
                .replaceAll("&nbsp;", " ")
                .trim();
    }

    private Map<String, Object> asStringObjectMap(Object value) {
        if (!(value instanceof Map<?, ?> source)) {
            return Map.of();
        }

        Map<String, Object> result = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : source.entrySet()) {
            if (entry.getKey() instanceof String key) {
                result.put(key, entry.getValue());
            }
        }
        return result;
    }

    private List<Map<String, Object>> asSearchResults(Object value) {
        if (!(value instanceof List<?> source)) {
            return List.of();
        }

        List<Map<String, Object>> results = new ArrayList<>();
        for (Object item : source) {
            Map<String, Object> result = asStringObjectMap(item);
            if (!result.isEmpty()) {
                results.add(result);
            }
        }
        return results;
    }
}
