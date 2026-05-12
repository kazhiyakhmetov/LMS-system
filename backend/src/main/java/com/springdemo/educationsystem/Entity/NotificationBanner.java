package com.springdemo.educationsystem.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "notification_banners")
public class NotificationBanner {

    public enum Severity {
        INFO,
        WARNING,
        SUCCESS
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(name = "link_url", length = 1000)
    private String linkUrl;

    @Column(name = "link_label", length = 255)
    private String linkLabel;

    @Column(name = "for_students", nullable = false)
    private boolean forStudents = false;

    @Column(name = "for_teachers", nullable = false)
    private boolean forTeachers = false;

    @Column(name = "for_parents", nullable = false)
    private boolean forParents = false;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Severity severity = Severity.INFO;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    @JsonIgnore
    private User createdBy;

    public NotificationBanner() {
        this.createdAt = LocalDateTime.now();
    }

    // Getters / Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getLinkUrl() { return linkUrl; }
    public void setLinkUrl(String linkUrl) { this.linkUrl = linkUrl; }

    public String getLinkLabel() { return linkLabel; }
    public void setLinkLabel(String linkLabel) { this.linkLabel = linkLabel; }

    public boolean isForStudents() { return forStudents; }
    public void setForStudents(boolean forStudents) { this.forStudents = forStudents; }

    public boolean isForTeachers() { return forTeachers; }
    public void setForTeachers(boolean forTeachers) { this.forTeachers = forTeachers; }

    public boolean isForParents() { return forParents; }
    public void setForParents(boolean forParents) { this.forParents = forParents; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public Severity getSeverity() { return severity; }
    public void setSeverity(Severity severity) { this.severity = severity; }

    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
}
