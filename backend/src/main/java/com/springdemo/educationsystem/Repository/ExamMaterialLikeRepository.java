package com.springdemo.educationsystem.Repository;

import com.springdemo.educationsystem.Entity.ExamMaterialLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamMaterialLikeRepository extends JpaRepository<ExamMaterialLike, Long> {

    Optional<ExamMaterialLike> findByUserIdAndMaterialId(Long userId, Long materialId);

    boolean existsByUserIdAndMaterialId(Long userId, Long materialId);

    long countByMaterialId(Long materialId);

    List<ExamMaterialLike> findByUserIdAndMaterialIdIn(Long userId, List<Long> materialIds);

    @Modifying
    @Transactional
    @Query("DELETE FROM ExamMaterialLike l WHERE l.material.id = :materialId")
    void deleteByMaterialId(@Param("materialId") Long materialId);
}
