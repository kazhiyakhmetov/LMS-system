package com.springdemo.educationsystem.Repository;

import com.springdemo.educationsystem.Entity.GradeFormulaConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GradeFormulaConfigRepository extends JpaRepository<GradeFormulaConfig, Long> {
}
