-- ============================================================================
-- Demo seed for algebra.teacher@school.kz (id=12, Айгуль Жумабаева)
-- Class: 8Б (id=4), Subjects: АЛГЕБРА (id=2), Math (id=1)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Add 5 students to class 8Б (id=4)
-- ----------------------------------------------------------------------------
INSERT INTO users (email, password_hash, first_name, last_name, patronymic, school_id, created_at) VALUES
  ('aida.kim@school.kz',     'Password123', 'Аида',    'Ким',         'Сергеевна',   2, NOW()),
  ('marat.usov@school.kz',   'Password123', 'Марат',   'Усов',        'Алексеевич',  2, NOW()),
  ('zarina.bek@school.kz',   'Password123', 'Зарина',  'Бекова',      'Маратовна',   2, NOW()),
  ('timur.abay@school.kz',   'Password123', 'Тимур',   'Абаев',       'Болатович',   2, NOW()),
  ('aliya.nur@school.kz',    'Password123', 'Алия',    'Нурбекова',   'Адилевна',    2, NOW())
ON CONFLICT (email) DO NOTHING;

-- Add as students (user_role + students table)
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email IN ('aida.kim@school.kz','marat.usov@school.kz','zarina.bek@school.kz','timur.abay@school.kz','aliya.nur@school.kz')
  AND r.name = 'student'
ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, class_id)
SELECT u.id, 4 FROM users u
WHERE u.email IN ('aida.kim@school.kz','marat.usov@school.kz','zarina.bek@school.kz','timur.abay@school.kz','aliya.nur@school.kz')
ON CONFLICT (user_id) DO UPDATE SET class_id = EXCLUDED.class_id;

-- ----------------------------------------------------------------------------
-- 2. Teaching assignments for algebra.teacher (id=12) → class 8Б
-- ----------------------------------------------------------------------------
INSERT INTO teacher_class_subjects (active, assigned_at, class_id, subject_id, teacher_id) VALUES
  (true, NOW(), 4, 2, 12),  -- АЛГЕБРА
  (true, NOW(), 4, 1, 12)   -- Math
ON CONFLICT (teacher_id, class_id, subject_id) DO NOTHING;

-- Also some other teachers for variety in 8Б schedule
INSERT INTO teacher_class_subjects (active, assigned_at, class_id, subject_id, teacher_id) VALUES
  (true, NOW(), 4, 4, 14),   -- Физика → Алишер Нургалиев
  (true, NOW(), 4, 5, 15),   -- Биология
  (true, NOW(), 4, 6, 16),   -- Физкультура
  (true, NOW(), 4, 7, 17),   -- История
  (true, NOW(), 4, 9, 19),   -- Казахский
  (true, NOW(), 4, 10, 20),  -- Английский
  (true, NOW(), 4, 11, 21),  -- Русский
  (true, NOW(), 4, 13, 23)   -- Информатика
ON CONFLICT (teacher_id, class_id, subject_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Schedule for 8Б current week (May 4-8, 2026)
-- ----------------------------------------------------------------------------
INSERT INTO schedule_templates (class_id, quarter, week_start, week_end, week_number)
VALUES (4, 4, '2026-05-04', '2026-05-10', 19)
ON CONFLICT DO NOTHING;

WITH tmpl AS (SELECT id FROM schedule_templates WHERE class_id=4 AND week_start='2026-05-04')
INSERT INTO schedule_days (date, day_of_week, is_holiday, template_id)
SELECT d::date, dow, false, tmpl.id FROM tmpl, (VALUES
  ('2026-05-04'::date, 'MONDAY'),
  ('2026-05-05'::date, 'TUESDAY'),
  ('2026-05-06'::date, 'WEDNESDAY'),
  ('2026-05-07'::date, 'THURSDAY'),
  ('2026-05-08'::date, 'FRIDAY')
) AS days(d, dow);

-- MON: Algebra, Math, Physics, English, History
INSERT INTO lessons (day_id, lesson_number, start_time, end_time, classroom, subject_id, teacher_id)
SELECT d.id, 2, '08:00'::time, '08:40'::time, '305', 2, 12 FROM schedule_days d WHERE d.date='2026-05-04'
UNION ALL SELECT d.id, 3, '08:45'::time, '09:25'::time, '305', 1, 12 FROM schedule_days d WHERE d.date='2026-05-04'
UNION ALL SELECT d.id, 4, '09:35'::time, '10:15'::time, '205', 4, 14 FROM schedule_days d WHERE d.date='2026-05-04'
UNION ALL SELECT d.id, 5, '10:20'::time, '11:00'::time, '108', 10, 20 FROM schedule_days d WHERE d.date='2026-05-04'
UNION ALL SELECT d.id, 6, '11:10'::time, '11:50'::time, '402', 7, 17 FROM schedule_days d WHERE d.date='2026-05-04';

-- TUE: Math, Algebra, Russian, Biology, PE
INSERT INTO lessons (day_id, lesson_number, start_time, end_time, classroom, subject_id, teacher_id)
SELECT d.id, 2, '08:00'::time, '08:40'::time, '305', 1, 12 FROM schedule_days d WHERE d.date='2026-05-05'
UNION ALL SELECT d.id, 3, '08:45'::time, '09:25'::time, '305', 2, 12 FROM schedule_days d WHERE d.date='2026-05-05'
UNION ALL SELECT d.id, 4, '09:35'::time, '10:15'::time, '109', 11, 21 FROM schedule_days d WHERE d.date='2026-05-05'
UNION ALL SELECT d.id, 5, '10:20'::time, '11:00'::time, '210', 5, 15 FROM schedule_days d WHERE d.date='2026-05-05'
UNION ALL SELECT d.id, 6, '11:10'::time, '11:50'::time, 'СЗ',  6, 16 FROM schedule_days d WHERE d.date='2026-05-05';

-- WED: Algebra, Math, Informatics, Kazakh, English
INSERT INTO lessons (day_id, lesson_number, start_time, end_time, classroom, subject_id, teacher_id)
SELECT d.id, 2, '08:00'::time, '08:40'::time, '305', 2, 12 FROM schedule_days d WHERE d.date='2026-05-06'
UNION ALL SELECT d.id, 3, '08:45'::time, '09:25'::time, '305', 1, 12 FROM schedule_days d WHERE d.date='2026-05-06'
UNION ALL SELECT d.id, 4, '09:35'::time, '10:15'::time, '215', 13, 23 FROM schedule_days d WHERE d.date='2026-05-06'
UNION ALL SELECT d.id, 5, '10:20'::time, '11:00'::time, '107', 9, 19 FROM schedule_days d WHERE d.date='2026-05-06'
UNION ALL SELECT d.id, 6, '11:10'::time, '11:50'::time, '108', 10, 20 FROM schedule_days d WHERE d.date='2026-05-06';

-- THU: Algebra, Math, Physics, History, Russian
INSERT INTO lessons (day_id, lesson_number, start_time, end_time, classroom, subject_id, teacher_id)
SELECT d.id, 2, '08:00'::time, '08:40'::time, '305', 2, 12 FROM schedule_days d WHERE d.date='2026-05-07'
UNION ALL SELECT d.id, 3, '08:45'::time, '09:25'::time, '305', 1, 12 FROM schedule_days d WHERE d.date='2026-05-07'
UNION ALL SELECT d.id, 4, '09:35'::time, '10:15'::time, '205', 4, 14 FROM schedule_days d WHERE d.date='2026-05-07'
UNION ALL SELECT d.id, 5, '10:20'::time, '11:00'::time, '402', 7, 17 FROM schedule_days d WHERE d.date='2026-05-07'
UNION ALL SELECT d.id, 6, '11:10'::time, '11:50'::time, '109', 11, 21 FROM schedule_days d WHERE d.date='2026-05-07';

-- FRI: Math, Algebra, Biology, PE, English
INSERT INTO lessons (day_id, lesson_number, start_time, end_time, classroom, subject_id, teacher_id)
SELECT d.id, 2, '08:00'::time, '08:40'::time, '305', 1, 12 FROM schedule_days d WHERE d.date='2026-05-08'
UNION ALL SELECT d.id, 3, '08:45'::time, '09:25'::time, '305', 2, 12 FROM schedule_days d WHERE d.date='2026-05-08'
UNION ALL SELECT d.id, 4, '09:35'::time, '10:15'::time, '210', 5, 15 FROM schedule_days d WHERE d.date='2026-05-08'
UNION ALL SELECT d.id, 5, '10:20'::time, '11:00'::time, 'СЗ',  6, 16 FROM schedule_days d WHERE d.date='2026-05-08'
UNION ALL SELECT d.id, 6, '11:10'::time, '11:50'::time, '108', 10, 20 FROM schedule_days d WHERE d.date='2026-05-08';

-- ----------------------------------------------------------------------------
-- 4. Assignments from algebra.teacher (id=12) → class 8Б
-- ----------------------------------------------------------------------------
INSERT INTO assignments (title, description, subject_id, teacher_id, class_id, type, max_grade, deadline) VALUES
  ('Контрольная: линейные уравнения',
   E'Решить контрольную работу из 6 задач на линейные уравнения. Темы: одна переменная, две переменных, системы уравнений.',
   2, 12, 4, 'sor', 100, '2026-05-12 23:59'),

  ('Домашняя работа: упражнения 312-318',
   E'Выполнить упражнения 312-318 из учебника алгебры. Решения должны быть аккуратно оформлены с пояснениями.',
   2, 12, 4, 'homework', 5, '2026-05-06 23:59'),

  ('СОЧ за 4 четверть',
   E'Итоговая работа за четверть. 8 заданий разной сложности по всем темам четверти. Время выполнения 90 минут.',
   2, 12, 4, 'soch', 100, '2026-05-20 14:00'),

  ('Тест: квадратные функции',
   E'Онлайн тест из 10 вопросов на тему квадратных функций. 25 минут, одна попытка.',
   1, 12, 4, 'test', 5, '2026-05-09 18:00'),

  ('Реферат: великие математики',
   E'Подготовить реферат на 5-7 страниц о вкладе одного из великих математиков (на выбор: Пифагор, Евклид, Архимед, Аль-Хорезми, Эйлер, Гаусс).',
   1, 12, 4, 'homework', 5, '2026-04-28 23:59'),

  ('Подготовка к ЕНТ: математика блок 2',
   E'Решить тренировочный вариант ЕНТ по математике (блок №2, страницы 28-35).',
   1, 12, 4, 'homework', 5, '2026-05-15 23:59');

-- ----------------------------------------------------------------------------
-- 5. Submissions for various students (mix of statuses)
-- ----------------------------------------------------------------------------
-- Sultan Алиев (id=11) - submitted referat (graded 92)
INSERT INTO submissions (assignment_id, student_id, file_name, file_path, file_size, submitted_at, status, comment)
SELECT a.id, 11, 'sultan_referat.pdf', '/uploads/assignments/sultan_referat.pdf', 845210,
       '2026-04-26 18:30', 'GRADED', 'Выбрал Эйлера'
FROM assignments a WHERE a.title='Реферат: великие математики' AND a.teacher_id=12;

-- Aida Ким - submitted referat (graded 88)
INSERT INTO submissions (assignment_id, student_id, file_name, file_path, file_size, submitted_at, status, comment)
SELECT a.id, u.id, 'aida_referat.pdf', '/uploads/assignments/aida_referat.pdf', 712340,
       '2026-04-27 20:15', 'GRADED', NULL
FROM assignments a, users u
WHERE a.title='Реферат: великие математики' AND a.teacher_id=12 AND u.email='aida.kim@school.kz';

-- Marat Усов - submitted homework 312-318 (waiting check)
INSERT INTO submissions (assignment_id, student_id, file_name, file_path, file_size, submitted_at, status, comment)
SELECT a.id, u.id, 'marat_dz_312.pdf', '/uploads/assignments/marat_dz_312.pdf', 423190,
       '2026-05-04 19:45', 'SUBMITTED', NULL
FROM assignments a, users u
WHERE a.title='Домашняя работа: упражнения 312-318' AND a.teacher_id=12 AND u.email='marat.usov@school.kz';

-- Zarina submitted referat (graded 95 perfect)
INSERT INTO submissions (assignment_id, student_id, file_name, file_path, file_size, submitted_at, status, comment)
SELECT a.id, u.id, 'zarina_referat.pdf', '/uploads/assignments/zarina_referat.pdf', 982140,
       '2026-04-25 14:00', 'GRADED', 'Тема: Архимед, добавила схемы'
FROM assignments a, users u
WHERE a.title='Реферат: великие математики' AND a.teacher_id=12 AND u.email='zarina.bek@school.kz';

-- ----------------------------------------------------------------------------
-- 6. Grades for graded submissions
-- ----------------------------------------------------------------------------
INSERT INTO grades (submission_id, teacher_id, grade_value, comment, graded_at)
SELECT s.id, 12, 92, 'Хорошо! Можно было больше про вклад в матанализ.', '2026-04-28 11:00'
FROM submissions s JOIN assignments a ON a.id=s.assignment_id
WHERE s.student_id=11 AND a.title='Реферат: великие математики' AND a.teacher_id=12;

INSERT INTO grades (submission_id, teacher_id, grade_value, comment, graded_at)
SELECT s.id, 12, 88, 'Аккуратно. Маловато деталей про конкретные открытия.', '2026-04-29 14:30'
FROM submissions s JOIN assignments a ON a.id=s.assignment_id
JOIN users u ON u.id=s.student_id
WHERE u.email='aida.kim@school.kz' AND a.title='Реферат: великие математики' AND a.teacher_id=12;

INSERT INTO grades (submission_id, teacher_id, grade_value, comment, graded_at)
SELECT s.id, 12, 95, 'Отличный реферат! Грамотно оформлено, видны схемы.', '2026-04-26 10:00'
FROM submissions s JOIN assignments a ON a.id=s.assignment_id
JOIN users u ON u.id=s.student_id
WHERE u.email='zarina.bek@school.kz' AND a.title='Реферат: великие математики' AND a.teacher_id=12;

-- ----------------------------------------------------------------------------
-- 7. Journal entries for all students 8Б, subjects АЛГЕБРА (2) and Math (1), Q3
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  s_id BIGINT;
  d DATE;
  i INT;
  grade INT;
  marks INT[] := ARRAY[5,4,5,4,5,3,4,5,4,5,4,5];
  dates DATE[] := ARRAY[
    '2026-01-13'::date,'2026-01-20','2026-01-27','2026-02-03','2026-02-10','2026-02-17',
    '2026-02-24','2026-03-03','2026-03-10','2026-04-07','2026-04-14','2026-04-21'
  ];
  attendance TEXT[] := ARRAY['PRESENT','PRESENT','PRESENT','PRESENT','SICK','PRESENT','PRESENT','EXCUSED','PRESENT','PRESENT','PRESENT','PRESENT'];
BEGIN
  FOR s_id IN SELECT user_id FROM students WHERE class_id=4 LOOP
    FOR i IN 1..array_length(dates,1) LOOP
      -- AЛГЕБРА
      INSERT INTO journal_entries (class_id, student_id, subject_id, teacher_id, quarter, lesson_date, entry_type, numeric_value, max_value, display_value, is_manual, created_at, updated_at)
      VALUES (4, s_id, 2, 12, 3, dates[i], 'LESSON_GRADE', marks[((i + s_id) % 12) + 1], 5, marks[((i + s_id) % 12) + 1]::text, true, NOW(), NOW())
      ON CONFLICT DO NOTHING;
      -- Math
      INSERT INTO journal_entries (class_id, student_id, subject_id, teacher_id, quarter, lesson_date, entry_type, numeric_value, max_value, display_value, is_manual, created_at, updated_at)
      VALUES (4, s_id, 1, 12, 3, dates[i] + 1, 'LESSON_GRADE', marks[((i + s_id + 3) % 12) + 1], 5, marks[((i + s_id + 3) % 12) + 1]::text, true, NOW(), NOW())
      ON CONFLICT DO NOTHING;
      -- Attendance
      INSERT INTO attendance_marks (class_id, student_id, subject_id, teacher_id, quarter, lesson_date, status, created_at, updated_at)
      VALUES (4, s_id, 2, 12, 3, dates[i], attendance[((i + s_id) % 12) + 1], NOW(), NOW())
      ON CONFLICT (teacher_id, student_id, class_id, subject_id, lesson_date) DO NOTHING;
      INSERT INTO attendance_marks (class_id, student_id, subject_id, teacher_id, quarter, lesson_date, status, created_at, updated_at)
      VALUES (4, s_id, 1, 12, 3, dates[i] + 1, attendance[((i + s_id + 1) % 12) + 1], NOW(), NOW())
      ON CONFLICT (teacher_id, student_id, class_id, subject_id, lesson_date) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 8. Quarter final grades (Q3) for all students 8Б
-- ----------------------------------------------------------------------------
INSERT INTO journal_final_grades (class_id, student_id, subject_id, teacher_id, quarter, quarter_grade, calculated_quarter_grade, is_quarter_manual, is_year_manual, updated_at)
SELECT 4, s.user_id, 2, 12, 3,
       (4 + (s.user_id % 2))::float8,
       (4.2 + ((s.user_id % 5) * 0.15))::float8,
       true, false, NOW()
FROM students s WHERE s.class_id=4
ON CONFLICT (teacher_id, student_id, class_id, subject_id, quarter) DO NOTHING;

INSERT INTO journal_final_grades (class_id, student_id, subject_id, teacher_id, quarter, quarter_grade, calculated_quarter_grade, is_quarter_manual, is_year_manual, updated_at)
SELECT 4, s.user_id, 1, 12, 3,
       (3 + (s.user_id % 3))::float8,
       (3.8 + ((s.user_id % 4) * 0.2))::float8,
       true, false, NOW()
FROM students s WHERE s.class_id=4
ON CONFLICT (teacher_id, student_id, class_id, subject_id, quarter) DO NOTHING;

COMMIT;

-- Summary
SELECT 'Students in 8Б' AS metric, COUNT(*) AS value FROM students WHERE class_id=4
UNION ALL SELECT 'Algebra teacher pairs', COUNT(*) FROM teacher_class_subjects WHERE teacher_id=12 AND class_id=4
UNION ALL SELECT 'Lessons this week (8Б)', COUNT(*) FROM lessons l JOIN schedule_days d ON d.id=l.day_id WHERE d.date BETWEEN '2026-05-04' AND '2026-05-08'
UNION ALL SELECT 'Assignments by algebra.teacher', COUNT(*) FROM assignments WHERE teacher_id=12 AND class_id=4
UNION ALL SELECT 'Submissions in 8Б', COUNT(*) FROM submissions s JOIN assignments a ON a.id=s.assignment_id WHERE a.teacher_id=12
UNION ALL SELECT 'Journal entries (Q3) by algebra.teacher', COUNT(*) FROM journal_entries WHERE teacher_id=12 AND quarter=3
UNION ALL SELECT 'Final grades (Q3) by algebra.teacher', COUNT(*) FROM journal_final_grades WHERE teacher_id=12 AND quarter=3;
