package com.springdemo.educationsystem.Entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "exam_material_likes",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "material_id"})
)
public class ExamMaterialLike {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "material_id", nullable = false)
    @JsonIgnore
    private ExamMaterial material;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public ExamMaterialLike() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public ExamMaterial getMaterial() { return material; }
    public void setMaterial(ExamMaterial material) { this.material = material; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
