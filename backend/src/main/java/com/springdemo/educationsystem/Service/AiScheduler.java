package com.springdemo.educationsystem.Service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Periodic background tasks that drive the AI service.
 * - Refreshes student recommendations once per hour.
 */
@Component
public class AiScheduler {

    private static final Logger log = LoggerFactory.getLogger(AiScheduler.class);

    private final AiService aiService;

    public AiScheduler(AiService aiService) {
        this.aiService = aiService;
    }

    /** Refresh recommendations every hour. Initial run delayed 1 minute after boot. */
    @Scheduled(initialDelay = 60_000L, fixedDelay = 3_600_000L)
    public void refreshRecommendations() {
        log.info("Triggering recommendation refresh");
        int n = aiService.refreshAllRecommendations();
        log.info("Recommendation refresh done: {} students", n);
    }
}
