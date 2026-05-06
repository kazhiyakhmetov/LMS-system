package com.springdemo.educationsystem.DTO;

public class RecommendationDTO {
    private String kind;          // "quiz" | "topic"
    private Long targetId;        // quiz_id or subject_id
    private String title;
    private double score;
    private String reason;
    private String subjectName;

    public RecommendationDTO() {}

    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }

    public Long getTargetId() { return targetId; }
    public void setTargetId(Long targetId) { this.targetId = targetId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public double getScore() { return score; }
    public void setScore(double score) { this.score = score; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getSubjectName() { return subjectName; }
    public void setSubjectName(String subjectName) { this.subjectName = subjectName; }
}
