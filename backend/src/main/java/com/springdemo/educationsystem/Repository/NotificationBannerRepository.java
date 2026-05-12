package com.springdemo.educationsystem.Repository;

import com.springdemo.educationsystem.Entity.NotificationBanner;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface NotificationBannerRepository extends JpaRepository<NotificationBanner, Long> {

    /** Активные баннеры для конкретной роли (с учётом окна дат). */
    @Query("SELECT b FROM NotificationBanner b WHERE :today BETWEEN b.startDate AND b.endDate AND " +
            "((b.forStudents = true AND :role = 'student') OR " +
            "(b.forTeachers = true AND :role = 'teacher') OR " +
            "(b.forParents = true AND :role = 'parent')) " +
            "ORDER BY b.createdAt DESC")
    List<NotificationBanner> findActiveForRole(@Param("today") LocalDate today, @Param("role") String role);

    /** Все баннеры для админки (новые сверху). */
    List<NotificationBanner> findAllByOrderByCreatedAtDesc();
}
