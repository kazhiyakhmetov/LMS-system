package com.springdemo.educationsystem.DTO;

import java.util.List;

public class StudentRiskDTO {
    private Long studentId;
    private double score;       // 0..100
    private String level;       // "low" | "mid" | "high"
    private List<RiskFactorDTO> topFactors;
    private String modelVersion;

    // Optional joined fields populated by Spring controller for table views.
    private String studentName;
    private String className;

    public StudentRiskDTO() {}

    public Long getStudentId() { return studentId; }
    public void setStudentId(Long studentId) { this.studentId = studentId; }

    public double getScore() { return score; }
    public void setScore(double score) { this.score = score; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public List<RiskFactorDTO> getTopFactors() { return topFactors; }
    public void setTopFactors(List<RiskFactorDTO> topFactors) { this.topFactors = topFactors; }

    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getClassName() { return className; }
    public void setClassName(String className) { this.className = className; }
}
