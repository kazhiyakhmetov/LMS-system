package com.springdemo.educationsystem.Repository;

import com.springdemo.educationsystem.Entity.Recommendation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecommendationRepository extends JpaRepository<Recommendation, Long> {

    List<Recommendation> findByStudentIdOrderByScoreDesc(Long studentId);

    void deleteByStudentId(Long studentId);
}
