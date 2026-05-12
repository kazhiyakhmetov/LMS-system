package com.springdemo.educationsystem.Repository;

import com.springdemo.educationsystem.Entity.ExamMaterialLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamMaterialLikeRepository extends JpaRepository<ExamMaterialLike, Long> {

    Optional<ExamMaterialLike> findByUserIdAndMaterialId(Long userId, Long materialId);

    boolean existsByUserIdAndMaterialId(Long userId, Long materialId);

    long countByMaterialId(Long materialId);

    List<ExamMaterialLike> findByUserIdAndMaterialIdIn(Long userId, List<Long> materialIds);

    void deleteByMaterialId(Long materialId);
}
