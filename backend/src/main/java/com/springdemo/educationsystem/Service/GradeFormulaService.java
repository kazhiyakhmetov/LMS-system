package com.springdemo.educationsystem.Service;

import com.springdemo.educationsystem.Entity.GradeFormulaConfig;
import com.springdemo.educationsystem.Repository.GradeFormulaConfigRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Применяет конфигурируемые формулы вычисления четвертных, годовых и аттестационных оценок.
 *
 *   Quarter = FO * foWeight + SOR * sorWeight + SOCH * sochWeight
 *   Year    = (Q1+Q2+Q3+Q4) / 4
 *   Final   = Year * yearWeight + Exam * examWeight
 */
@Service
public class GradeFormulaService {

    private final GradeFormulaConfigRepository repository;

    public GradeFormulaService(GradeFormulaConfigRepository repository) {
        this.repository = repository;
    }

    /** Singleton-конфиг. Если нет — создаём с дефолтами. */
    @Transactional
    public GradeFormulaConfig getOrCreate() {
        List<GradeFormulaConfig> all = repository.findAll();
        if (!all.isEmpty()) return all.get(0);
        GradeFormulaConfig fresh = new GradeFormulaConfig();
        return repository.save(fresh);
    }

    @Transactional
    public GradeFormulaConfig update(Double foWeight, Double sorWeight, Double sochWeight,
                                     Double yearWeight, Double examWeight, Integer maxScale) {
        GradeFormulaConfig cfg = getOrCreate();
        if (foWeight != null && sorWeight != null && sochWeight != null) {
            double sum = foWeight + sorWeight + sochWeight;
            if (sum <= 0) throw new RuntimeException("Сумма весов четверти должна быть > 0");
            cfg.setFoWeight(foWeight / sum);
            cfg.setSorWeight(sorWeight / sum);
            cfg.setSochWeight(sochWeight / sum);
        }
        if (yearWeight != null && examWeight != null) {
            double sum = yearWeight + examWeight;
            if (sum <= 0) throw new RuntimeException("Сумма весов аттестации должна быть > 0");
            cfg.setYearWeight(yearWeight / sum);
            cfg.setExamWeight(examWeight / sum);
        }
        if (maxScale != null) {
            if (maxScale != 5 && maxScale != 10) throw new RuntimeException("maxScale может быть 5 или 10");
            cfg.setMaxScale(maxScale);
        }
        cfg.setUpdatedAt(LocalDateTime.now());
        return repository.save(cfg);
    }

    /**
     * Считает четверть из категорийных средних. Любая из категорий может быть null —
     * тогда вес автоматически "переливается" в оставшиеся (нормализация).
     */
    public Double calcQuarter(Double foAvg, Double sorAvg, Double sochAvg) {
        GradeFormulaConfig cfg = getOrCreate();

        double weighted = 0.0;
        double totalWeight = 0.0;

        if (foAvg != null) { weighted += foAvg * cfg.getFoWeight(); totalWeight += cfg.getFoWeight(); }
        if (sorAvg != null) { weighted += sorAvg * cfg.getSorWeight(); totalWeight += cfg.getSorWeight(); }
        if (sochAvg != null) { weighted += sochAvg * cfg.getSochWeight(); totalWeight += cfg.getSochWeight(); }

        if (totalWeight <= 0) return null;
        return weighted / totalWeight;
    }

    /** Год = среднее по доступным четвертям. */
    public Double calcYear(Double q1, Double q2, Double q3, Double q4) {
        double sum = 0;
        int count = 0;
        for (Double q : new Double[]{q1, q2, q3, q4}) {
            if (q != null) { sum += q; count++; }
        }
        return count == 0 ? null : sum / count;
    }

    /** Итог = год * yearWeight + экзамен * examWeight. */
    public Double calcFinal(Double yearAvg, Double examGrade) {
        GradeFormulaConfig cfg = getOrCreate();
        if (yearAvg == null && examGrade == null) return null;
        double y = yearAvg != null ? yearAvg : 0.0;
        double e = examGrade != null ? examGrade : 0.0;
        return y * cfg.getYearWeight() + e * cfg.getExamWeight();
    }
}
