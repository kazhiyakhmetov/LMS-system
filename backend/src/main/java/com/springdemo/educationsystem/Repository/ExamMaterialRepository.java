package com.springdemo.educationsystem.Repository;

import com.springdemo.educationsystem.Entity.ExamMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExamMaterialRepository extends JpaRepository<ExamMaterial, Long> {

    List<ExamMaterial> findByAuthorIdOrderByCreatedAtDesc(Long authorId);

    @Query("""
            SELECT m
            FROM ExamMaterial m
            WHERE m.isPublic = true
              AND (:subjectId IS NULL OR m.subject.id = :subjectId)
              AND (:language IS NULL OR m.language = :language)
              AND (:quarter IS NULL OR m.quarter = :quarter)
              AND (:type IS NULL OR m.type = :type)
            ORDER BY m.createdAt DESC
            """)
    List<ExamMaterial> searchCatalog(
            @Param("subjectId") Long subjectId,
            @Param("language") ExamMaterial.Language language,
            @Param("quarter") Integer quarter,
            @Param("type") ExamMaterial.Type type
    );
}
