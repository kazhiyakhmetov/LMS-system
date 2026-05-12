package com.springdemo.educationsystem.Repository;

import com.springdemo.educationsystem.Entity.NewsPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface NewsPostRepository extends JpaRepository<NewsPost, Long> {

    /** Активные новости (endDate >= today), отсортированные по startDate (новые сверху). */
    List<NewsPost> findByEndDateGreaterThanEqualOrderByStartDateDesc(LocalDate today);

    /** Все новости (для админа), отсортированные по дате создания. */
    List<NewsPost> findAllByOrderByCreatedAtDesc();
}
