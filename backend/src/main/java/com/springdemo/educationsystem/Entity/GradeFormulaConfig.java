package com.springdemo.educationsystem.Entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Глобальная конфигурация формул вычисления итоговых оценок.
 * Хранится одной строкой (singleton). Все коэффициенты — десятичные доли в [0,1].
 *
 * Quarter = FO * foWeight + SOR * sorWeight + SOCH * sochWeight   (сумма = 1.0)
 * Year    = (Q1 + Q2 + Q3 + Q4) / 4
 * Final   = Year * yearWeight + Exam * examWeight                  (сумма = 1.0)
 */
@Entity
@Table(name = "grade_formula_config")
public class GradeFormulaConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fo_weight", nullable = false)
    private Double foWeight = 0.25;

    @Column(name = "sor_weight", nullable = false)
    private Double sorWeight = 0.25;

    @Column(name = "soch_weight", nullable = false)
    private Double sochWeight = 0.50;

    @Column(name = "year_weight", nullable = false)
    private Double yearWeight = 0.60;

    @Column(name = "exam_weight", nullable = false)
    private Double examWeight = 0.40;

    /** Максимум шкалы — переключатель 5 ↔ 10. */
    @Column(name = "max_scale", nullable = false)
    private Integer maxScale = 10;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public GradeFormulaConfig() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Double getFoWeight() { return foWeight; }
    public void setFoWeight(Double foWeight) { this.foWeight = foWeight; }

    public Double getSorWeight() { return sorWeight; }
    public void setSorWeight(Double sorWeight) { this.sorWeight = sorWeight; }

    public Double getSochWeight() { return sochWeight; }
    public void setSochWeight(Double sochWeight) { this.sochWeight = sochWeight; }

    public Double getYearWeight() { return yearWeight; }
    public void setYearWeight(Double yearWeight) { this.yearWeight = yearWeight; }

    public Double getExamWeight() { return examWeight; }
    public void setExamWeight(Double examWeight) { this.examWeight = examWeight; }

    public Integer getMaxScale() { return maxScale; }
    public void setMaxScale(Integer maxScale) { this.maxScale = maxScale; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
