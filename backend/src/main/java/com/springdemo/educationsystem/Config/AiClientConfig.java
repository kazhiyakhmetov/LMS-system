package com.springdemo.educationsystem.Config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/**
 * Builds a dedicated RestClient pointed at the StudIX AI FastAPI service.
 * URL is configured via `ai.service.url` (defaults to http://localhost:8001).
 */
@Configuration
public class AiClientConfig {

    @Value("${ai.service.url:http://localhost:8001}")
    private String aiServiceUrl;

    @Value("${ai.service.connect-timeout-ms:2000}")
    private int connectTimeoutMs;

    @Value("${ai.service.read-timeout-ms:5000}")
    private int readTimeoutMs;

    @Bean(name = "aiRestClient")
    public RestClient aiRestClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        factory.setReadTimeout(Duration.ofMillis(readTimeoutMs));
        return RestClient.builder()
                .baseUrl(aiServiceUrl)
                .requestFactory(factory)
                .build();
    }

    /**
     * Separate client for slow LLM-backed operations (quiz generation).
     * Read-timeout up to 4 min — Qwen 2.5 3B on CPU may take 30-90 seconds.
     */
    @Bean(name = "aiGenRestClient")
    public RestClient aiGenRestClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(connectTimeoutMs));
        factory.setReadTimeout(Duration.ofMillis(240_000));
        return RestClient.builder()
                .baseUrl(aiServiceUrl)
                .requestFactory(factory)
                .build();
    }
}
