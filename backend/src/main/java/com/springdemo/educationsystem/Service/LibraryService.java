package com.springdemo.educationsystem.Service;

import com.springdemo.educationsystem.DTO.LibraryBookDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class LibraryService {

    private static final Logger logger = LoggerFactory.getLogger(LibraryService.class);
    private static final String OPEN_LIBRARY_BASE = "https://openlibrary.org";
    private static final String COVER_BASE = "https://covers.openlibrary.org/b/id/";
    private static final int TIMEOUT_MS = 10_000;

    private static final ParameterizedTypeReference<Map<String, Object>> RESPONSE_TYPE =
            new ParameterizedTypeReference<>() {};

    private final RestTemplate restTemplate;

    public LibraryService(RestTemplateBuilder builder) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(TIMEOUT_MS);
        factory.setReadTimeout(TIMEOUT_MS);
        this.restTemplate = builder.requestFactory(() -> factory).build();
    }

    public List<LibraryBookDTO> search(String query) {
        if (query == null || query.trim().isEmpty()) {
            return new ArrayList<>();
        }

        String trimmed = query.trim();
        logger.info("Library search: {}", trimmed);

        try {
            URI uri = UriComponentsBuilder
                    .fromUriString(OPEN_LIBRARY_BASE + "/search.json")
                    .queryParam("q", trimmed)
                    .queryParam("limit", "12")
                    .build()
                    .toUri();

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "StudIX/1.0 (education platform)");
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    uri, HttpMethod.GET, entity, RESPONSE_TYPE);

            Map<String, Object> body = response.getBody();
            if (body == null || !body.containsKey("docs")) {
                logger.warn("Library: empty response body or missing 'docs'");
                return new ArrayList<>();
            }

            Object docsObj = body.get("docs");
            if (!(docsObj instanceof List<?> rawList)) {
                return new ArrayList<>();
            }

            List<LibraryBookDTO> results = new ArrayList<>();

            for (Object docObj : rawList) {
                if (!(docObj instanceof Map<?, ?> doc)) continue;

                String title = asString(doc.get("title"));
                if (title == null || title.isBlank()) continue;

                List<String> authors = asStringList(doc.get("author_name"));
                Integer year = asInteger(doc.get("first_publish_year"));
                String key = asString(doc.get("key"));
                String bookUrl = (key != null && !key.isBlank()) ? OPEN_LIBRARY_BASE + key : null;

                Integer coverId = asInteger(doc.get("cover_i"));
                String coverUrl = (coverId != null) ? COVER_BASE + coverId + "-M.jpg" : null;

                List<String> languages = asStringList(doc.get("language"));
                Integer editionCount = asInteger(doc.get("edition_count"));

                results.add(new LibraryBookDTO(title, authors, year, bookUrl, coverUrl, languages, editionCount));
            }

            logger.info("Library search '{}' returned {} books", trimmed, results.size());
            return results;
        } catch (Exception e) {
            logger.error("Library search failed for '{}': {}", trimmed, e.getMessage());
            return new ArrayList<>();
        }
    }

    private static String asString(Object value) {
        return value == null ? null : value.toString();
    }

    private static Integer asInteger(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static List<String> asStringList(Object value) {
        List<String> out = new ArrayList<>();
        if (value instanceof List<?> list) {
            for (Object item : list) {
                if (item == null) continue;
                String s = item.toString();
                if (!s.isBlank()) out.add(s);
            }
        }
        return out;
    }
}
