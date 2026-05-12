package com.springdemo.educationsystem.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "exam_materials")
public class ExamMaterial {

    public enum Type { SOR, SOCH }
    public enum Language { RU, KZ, EN }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Type type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    @JsonIgnore
    private Subject subject;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private Language language;

    @Column(nullable = false)
    private Integer quarter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_teacher_id", nullable = false)
    @JsonIgnore
    private Teacher author;

    @Column(name = "file_path", length = 512)
    private String filePath;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_public", nullable = false)
    private Boolean isPublic = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "download_count", nullable = false)
    private Integer downloadCount = 0;

    @Column(name = "like_count", nullable = false)
    private Integer likeCount = 0;

    public ExamMaterial() {
        this.createdAt = LocalDateTime.now();
        this.isPublic = false;
        this.downloadCount = 0;
        this.likeCount = 0;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public Type getType() { return type; }
    public void setType(Type type) { this.type = type; }
    public Subject getSubject() { return subject; }
    public void setSubject(Subject subject) { this.subject = subject; }
    public Language getLanguage() { return language; }
    public void setLanguage(Language language) { this.language = language; }
    public Integer getQuarter() { return quarter; }
    public void setQuarter(Integer quarter) { this.quarter = quarter; }
    public Teacher getAuthor() { return author; }
    public void setAuthor(Teacher author) { this.author = author; }
    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Boolean getIsPublic() { return isPublic; }
    public void setIsPublic(Boolean isPublic) { this.isPublic = isPublic; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public Integer getDownloadCount() { return downloadCount; }
    public void setDownloadCount(Integer downloadCount) { this.downloadCount = downloadCount; }
    public Integer getLikeCount() { return likeCount; }
    public void setLikeCount(Integer likeCount) { this.likeCount = likeCount; }
}
