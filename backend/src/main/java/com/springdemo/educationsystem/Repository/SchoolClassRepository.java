package com.springdemo.educationsystem.Repository;

import com.springdemo.educationsystem.Entity.SchoolClass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Repository
public interface SchoolClassRepository extends JpaRepository<SchoolClass, Long> {

    List<SchoolClass> findBySchoolId(Long schoolId);

    List<SchoolClass> findBySchoolIdOrderByActiveDescNameAscAcademicYearAsc(Long schoolId);

    List<SchoolClass> findBySchoolIdAndActiveTrueOrderByNameAscAcademicYearAsc(Long schoolId);

    /**
     * Найти класс, в котором указанный teacher назначен классным руководителем.
     * Один учитель может быть классруком только одного класса (на практике),
     * но репозиторий возвращает Optional с предпочтением активного класса.
     */
    @Query("""
            select sc
            from SchoolClass sc
            where sc.homeroomTeacher.id = :teacherId
            order by sc.active desc, sc.id desc
            """)
    List<SchoolClass> findByHomeroomTeacherIdOrdered(@Param("teacherId") Long teacherId);

    default Optional<SchoolClass> findByHomeroomTeacherId(Long teacherId) {
        List<SchoolClass> list = findByHomeroomTeacherIdOrdered(teacherId);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    @Query("""
            select count(sc) > 0
            from SchoolClass sc
            where sc.school.id = :schoolId
              and lower(sc.name) = lower(:name)
              and sc.academicYear = :academicYear
              and (:excludeId is null or sc.id <> :excludeId)
            """)
    boolean existsDuplicate(@Param("schoolId") Long schoolId,
                            @Param("name") String name,
                            @Param("academicYear") String academicYear,
                            @Param("excludeId") Long excludeId);
}