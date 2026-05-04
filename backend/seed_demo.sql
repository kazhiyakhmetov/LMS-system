-- ============================================================================
-- StudIX Demo Seed
-- Realistic data for one Teacher + one Student + one Parent
--   Teacher: id=5  teacher.math@school.kz       (Айгуль Смагулова)
--   Student: id=25 Kazhiyakhmetov@gmail.com     (Nurbol Kazhiyakhmetov, 8А)
--   Parent:  id=26 parent1@gmail.com            (Samal Samalova)
-- School: id=2 (НИШ г. Астана), Class 8А id=2
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Teaching assignments — wire other teachers to class 8А for realistic schedule
-- ----------------------------------------------------------------------------
INSERT INTO teacher_class_subjects (active, assigned_at, class_id, subject_id, teacher_id) VALUES
  (true, NOW(), 2, 4, 14),   -- Физика: Алишер Нургалиев
  (true, NOW(), 2, 5, 15),   -- Биология: Гульнара Омарова
  (true, NOW(), 2, 6, 16),   -- Физкультура: Арман Кожанов
  (true, NOW(), 2, 7, 17),   -- История: Сауле Искакова
  (true, NOW(), 2, 8, 18),   -- Химия: Марат Тастанов
  (true, NOW(), 2, 9, 19),   -- Казахский: Айжан Калиева
  (true, NOW(), 2, 10, 20),  -- Английский: Карлыгаш Мухамеджанова
  (true, NOW(), 2, 11, 21),  -- Русский: Ольга Петрова
  (true, NOW(), 2, 12, 22),  -- География: Ерлан Баймуханов
  (true, NOW(), 2, 13, 23),  -- Информатика: Дамир Ахметов
  (true, NOW(), 2, 3, 13)    -- Геометрия: Данияр Сагинтаев
ON CONFLICT (teacher_id, class_id, subject_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. Schedule template + days for class 8А, current week (Apr 27 - May 3, 2026)
-- ----------------------------------------------------------------------------
INSERT INTO schedule_templates (class_id, quarter, week_start, week_end, week_number)
VALUES (2, 3, '2026-04-27', '2026-05-03', 18);

-- Get the just-created template id
WITH tmpl AS (
  SELECT id FROM schedule_templates WHERE class_id=2 AND week_start='2026-04-27'
)
INSERT INTO schedule_days (date, day_of_week, is_holiday, template_id)
SELECT d::date, dow, false, tmpl.id
FROM tmpl, (VALUES
  ('2026-04-27'::date, 'MONDAY'),
  ('2026-04-28'::date, 'TUESDAY'),
  ('2026-04-29'::date, 'WEDNESDAY'),
  ('2026-04-30'::date, 'THURSDAY'),
  ('2026-05-01'::date, 'FRIDAY')
) AS days(d, dow);

-- ----------------------------------------------------------------------------
-- 3. Lessons for the week (5 lessons per day, mix of subjects)
-- Lesson times: 2=08:00, 3=08:45, 4=09:35, 5=10:20, 6=11:10, 7=11:55
-- ----------------------------------------------------------------------------

-- MONDAY: Math, Algebra, Physics, English, History
INSERT INTO lessons (day_id, lesson_number, start_time, end_time, classroom, subject_id, teacher_id)
SELECT d.id, 2, '08:00'::time, '08:40'::time, '301', 1,  5  FROM schedule_days d WHERE d.date='2026-04-27'
UNION ALL SELECT d.id, 3, '08:45'::time, '09:25'::time, '301', 2,  5  FROM schedule_days d WHERE d.date='2026-04-27'
UNION ALL SELECT d.id, 4, '09:35'::time, '10:15'::time, '205', 4,  14 FROM schedule_days d WHERE d.date='2026-04-27'
UNION ALL SELECT d.id, 5, '10:20'::time, '11:00'::time, '108', 10, 20 FROM schedule_days d WHERE d.date='2026-04-27'
UNION ALL SELECT d.id, 6, '11:10'::time, '11:50'::time, '402', 7,  17 FROM schedule_days d WHERE d.date='2026-04-27';

-- TUESDAY: Math, Geometry, Russian, Biology, PE
INSERT INTO lessons (day_id, lesson_number, start_time, end_time, classroom, subject_id, teacher_id)
SELECT d.id, 2, '08:00'::time, '08:40'::time, '301', 1,  5  FROM schedule_days d WHERE d.date='2026-04-28'
UNION ALL SELECT d.id, 3, '08:45'::time, '09:25'::time, '301', 3,  13 FROM schedule_days d WHERE d.date='2026-04-28'
UNION ALL SELECT d.id, 4, '09:35'::time, '10:15'::time, '109', 11, 21 FROM schedule_days d WHERE d.date='2026-04-28'
UNION ALL SELECT d.id, 5, '10:20'::time, '11:00'::time, '210', 5,  15 FROM schedule_days d WHERE d.date='2026-04-28'
UNION ALL SELECT d.id, 6, '11:10'::time, '11:50'::time, 'СЗ',  6,  16 FROM schedule_days d WHERE d.date='2026-04-28';

-- WEDNESDAY: Algebra, Math, Chemistry, Informatics, English
INSERT INTO lessons (day_id, lesson_number, start_time, end_time, classroom, subject_id, teacher_id)
SELECT d.id, 2, '08:00'::time, '08:40'::time, '301', 2,  5  FROM schedule_days d WHERE d.date='2026-04-29'
UNION ALL SELECT d.id, 3, '08:45'::time, '09:25'::time, '301', 1,  5  FROM schedule_days d WHERE d.date='2026-04-29'
UNION ALL SELECT d.id, 4, '09:35'::time, '10:15'::time, '215', 8,  18 FROM schedule_days d WHERE d.date='2026-04-29'
UNION ALL SELECT d.id, 5, '10:20'::time, '11:00'::time, '305', 13, 23 FROM schedule_days d WHERE d.date='2026-04-29'
UNION ALL SELECT d.id, 6, '11:10'::time, '11:50'::time, '108', 10, 20 FROM schedule_days d WHERE d.date='2026-04-29';

-- THURSDAY: Math, Algebra, History, Geography, Kazakh
INSERT INTO lessons (day_id, lesson_number, start_time, end_time, classroom, subject_id, teacher_id)
SELECT d.id, 2, '08:00'::time, '08:40'::time, '301', 1,  5  FROM schedule_days d WHERE d.date='2026-04-30'
UNION ALL SELECT d.id, 3, '08:45'::time, '09:25'::time, '301', 2,  5  FROM schedule_days d WHERE d.date='2026-04-30'
UNION ALL SELECT d.id, 4, '09:35'::time, '10:15'::time, '402', 7,  17 FROM schedule_days d WHERE d.date='2026-04-30'
UNION ALL SELECT d.id, 5, '10:20'::time, '11:00'::time, '410', 12, 22 FROM schedule_days d WHERE d.date='2026-04-30'
UNION ALL SELECT d.id, 6, '11:10'::time, '11:50'::time, '107', 9,  19 FROM schedule_days d WHERE d.date='2026-04-30';

-- FRIDAY: Geometry, Math, Physics, PE, English
INSERT INTO lessons (day_id, lesson_number, start_time, end_time, classroom, subject_id, teacher_id)
SELECT d.id, 2, '08:00'::time, '08:40'::time, '301', 3,  13 FROM schedule_days d WHERE d.date='2026-05-01'
UNION ALL SELECT d.id, 3, '08:45'::time, '09:25'::time, '301', 1,  5  FROM schedule_days d WHERE d.date='2026-05-01'
UNION ALL SELECT d.id, 4, '09:35'::time, '10:15'::time, '205', 4,  14 FROM schedule_days d WHERE d.date='2026-05-01'
UNION ALL SELECT d.id, 5, '10:20'::time, '11:00'::time, 'СЗ',  6,  16 FROM schedule_days d WHERE d.date='2026-05-01'
UNION ALL SELECT d.id, 6, '11:10'::time, '11:50'::time, '108', 10, 20 FROM schedule_days d WHERE d.date='2026-05-01';

-- ----------------------------------------------------------------------------
-- 4. Assignments from teacher 5 to class 8А (mix of statuses)
-- ----------------------------------------------------------------------------
INSERT INTO assignments (title, description, subject_id, teacher_id, class_id, type, max_grade, deadline) VALUES
  ('Контрольная работа: квадратные уравнения',
   E'Решить контрольную работу из 8 задач. Темы: дискриминант, теорема Виета, решение неравенств. Решения должны быть оформлены аккуратно с пояснениями к каждому шагу.',
   2, 5, 2, 'sor', 100, '2026-05-12 23:59'),

  ('Домашняя работа: тригонометрические тождества',
   E'Упростить выражения и доказать тождества (упр. 245-252 из учебника). Использовать основные тригонометрические формулы.',
   1, 5, 2, 'homework', 5, '2026-05-05 23:59'),

  ('СОЧ за 3 четверть по алгебре',
   E'Итоговая работа за четверть. 6 заданий разной сложности: уравнения, неравенства, функции, текстовые задачи. Время выполнения 90 минут.',
   2, 5, 2, 'soch', 100, '2026-05-15 14:00'),

  ('Реферат: история математики',
   E'Подготовить реферат на 5-7 страниц о вкладе одного из великих математиков (на выбор: Пифагор, Евклид, Архимед, Аль-Хорезми, Эйлер, Гаусс).',
   1, 5, 2, 'homework', 5, '2026-04-25 23:59'),

  ('Тест: производные функций',
   E'Онлайн тест из 12 вопросов на тему производных. Дается 30 минут. Только одна попытка.',
   1, 5, 2, 'test', 5, '2026-05-08 18:00'),

  ('Подготовка к ЕНТ: блок 1',
   E'Решить тренировочный вариант ЕНТ по математике (блок задач №1, страницы 12-18 в сборнике).',
   1, 5, 2, 'homework', 5, '2026-05-10 23:59');

-- Capture assignment ids for use below
-- We'll reference them by title via subqueries

-- ----------------------------------------------------------------------------
-- 5. Submissions from student 25 (varied statuses)
-- ----------------------------------------------------------------------------
INSERT INTO submissions (assignment_id, student_id, file_name, file_path, file_size, submitted_at, status, comment)
SELECT id, 25, 'kazhiyakhmetov_referat_alhwarizmi.pdf', '/uploads/assignments/demo_referat.pdf', 1248320,
       '2026-04-23 19:32', 'GRADED', 'Выбрал Аль-Хорезми, добавил информацию об алгоритмах'
FROM assignments WHERE title='Реферат: история математики';

INSERT INTO submissions (assignment_id, student_id, file_name, file_path, file_size, submitted_at, status, comment)
SELECT id, 25, 'kazhiyakhmetov_homework_trig.pdf', '/uploads/assignments/demo_trig.pdf', 482103,
       '2026-05-01 21:15', 'SUBMITTED', NULL
FROM assignments WHERE title='Домашняя работа: тригонометрические тождества';

INSERT INTO submissions (assignment_id, student_id, file_name, file_path, file_size, submitted_at, status, comment)
SELECT id, 25, 'kazhiyakhmetov_kr_kvadr.pdf', '/uploads/assignments/demo_kvadr.pdf', 728940,
       '2026-04-30 18:45', 'GRADED', 'Все восемь задач решены'
FROM assignments WHERE title='Контрольная работа: квадратные уравнения';

-- ----------------------------------------------------------------------------
-- 6. Grades for graded submissions
-- ----------------------------------------------------------------------------
INSERT INTO grades (submission_id, teacher_id, grade_value, comment, graded_at)
SELECT s.id, 5, 95, 'Отличный реферат! Грамотно изложены основные идеи. Можно немного больше про Liber abaci.', '2026-04-26 11:00'
FROM submissions s
JOIN assignments a ON a.id=s.assignment_id
WHERE s.student_id=25 AND a.title='Реферат: история математики';

INSERT INTO grades (submission_id, teacher_id, grade_value, comment, graded_at)
SELECT s.id, 5, 87, 'Хорошая работа. В задаче 6 ошибка в применении теоремы Виета — пересмотри.', '2026-05-01 14:30'
FROM submissions s
JOIN assignments a ON a.id=s.assignment_id
WHERE s.student_id=25 AND a.title='Контрольная работа: квадратные уравнения';

-- ----------------------------------------------------------------------------
-- 7. Journal entries — lesson grades + attendance for student 25 (Q3)
-- Subject: Math (1) and Algebra (2), teacher 5, class 2
-- ----------------------------------------------------------------------------

-- Math lesson grades (random pattern)
INSERT INTO journal_entries (class_id, student_id, subject_id, teacher_id, quarter, lesson_date, entry_type, numeric_value, max_value, display_value, is_manual, created_at, updated_at) VALUES
  (2, 25, 1, 5, 3, '2026-01-13', 'LESSON_GRADE', 5, 5, '5', true, NOW(), NOW()),
  (2, 25, 1, 5, 3, '2026-01-20', 'LESSON_GRADE', 4, 5, '4', true, NOW(), NOW()),
  (2, 25, 1, 5, 3, '2026-01-27', 'LESSON_GRADE', 5, 5, '5', true, NOW(), NOW()),
  (2, 25, 1, 5, 3, '2026-02-03', 'LESSON_GRADE', 4, 5, '4', true, NOW(), NOW()),
  (2, 25, 1, 5, 3, '2026-02-10', 'LESSON_GRADE', 5, 5, '5', true, NOW(), NOW()),
  (2, 25, 1, 5, 3, '2026-02-17', 'LESSON_GRADE', 3, 5, '3', true, NOW(), NOW()),
  (2, 25, 1, 5, 3, '2026-02-24', 'LESSON_GRADE', 4, 5, '4', true, NOW(), NOW()),
  (2, 25, 1, 5, 3, '2026-03-03', 'LESSON_GRADE', 5, 5, '5', true, NOW(), NOW()),
  (2, 25, 1, 5, 3, '2026-03-10', 'LESSON_GRADE', 5, 5, '5', true, NOW(), NOW()),
  (2, 25, 1, 5, 3, '2026-04-07', 'LESSON_GRADE', 4, 5, '4', true, NOW(), NOW()),
  (2, 25, 1, 5, 3, '2026-04-14', 'LESSON_GRADE', 5, 5, '5', true, NOW(), NOW()),
  (2, 25, 1, 5, 3, '2026-04-21', 'LESSON_GRADE', 4, 5, '4', true, NOW(), NOW());

-- Algebra lesson grades
INSERT INTO journal_entries (class_id, student_id, subject_id, teacher_id, quarter, lesson_date, entry_type, numeric_value, max_value, display_value, is_manual, created_at, updated_at) VALUES
  (2, 25, 2, 5, 3, '2026-01-14', 'LESSON_GRADE', 5, 5, '5', true, NOW(), NOW()),
  (2, 25, 2, 5, 3, '2026-01-21', 'LESSON_GRADE', 4, 5, '4', true, NOW(), NOW()),
  (2, 25, 2, 5, 3, '2026-01-28', 'LESSON_GRADE', 5, 5, '5', true, NOW(), NOW()),
  (2, 25, 2, 5, 3, '2026-02-04', 'LESSON_GRADE', 3, 5, '3', true, NOW(), NOW()),
  (2, 25, 2, 5, 3, '2026-02-11', 'LESSON_GRADE', 4, 5, '4', true, NOW(), NOW()),
  (2, 25, 2, 5, 3, '2026-03-04', 'LESSON_GRADE', 5, 5, '5', true, NOW(), NOW()),
  (2, 25, 2, 5, 3, '2026-03-11', 'LESSON_GRADE', 4, 5, '4', true, NOW(), NOW()),
  (2, 25, 2, 5, 3, '2026-04-08', 'LESSON_GRADE', 5, 5, '5', true, NOW(), NOW()),
  (2, 25, 2, 5, 3, '2026-04-15', 'LESSON_GRADE', 4, 5, '4', true, NOW(), NOW()),
  (2, 25, 2, 5, 3, '2026-04-22', 'LESSON_GRADE', 5, 5, '5', true, NOW(), NOW());

-- Attendance marks (mostly present, a few absences)
INSERT INTO attendance_marks (class_id, student_id, subject_id, teacher_id, quarter, lesson_date, status, created_at, updated_at) VALUES
  (2, 25, 1, 5, 3, '2026-01-13', 'PRESENT', NOW(), NOW()),
  (2, 25, 1, 5, 3, '2026-01-20', 'PRESENT', NOW(), NOW()),
  (2, 25, 1, 5, 3, '2026-01-27', 'PRESENT', NOW(), NOW()),
  (2, 25, 1, 5, 3, '2026-02-03', 'PRESENT', NOW(), NOW()),
  (2, 25, 1, 5, 3, '2026-02-10', 'SICK', NOW(), NOW()),
  (2, 25, 1, 5, 3, '2026-02-17', 'PRESENT', NOW(), NOW()),
  (2, 25, 1, 5, 3, '2026-02-24', 'EXCUSED', NOW(), NOW()),
  (2, 25, 1, 5, 3, '2026-03-03', 'PRESENT', NOW(), NOW()),
  (2, 25, 1, 5, 3, '2026-03-10', 'PRESENT', NOW(), NOW()),
  (2, 25, 1, 5, 3, '2026-04-07', 'PRESENT', NOW(), NOW()),
  (2, 25, 1, 5, 3, '2026-04-14', 'ABSENT', NOW(), NOW()),
  (2, 25, 1, 5, 3, '2026-04-21', 'PRESENT', NOW(), NOW()),
  (2, 25, 2, 5, 3, '2026-01-14', 'PRESENT', NOW(), NOW()),
  (2, 25, 2, 5, 3, '2026-01-21', 'PRESENT', NOW(), NOW()),
  (2, 25, 2, 5, 3, '2026-01-28', 'PRESENT', NOW(), NOW()),
  (2, 25, 2, 5, 3, '2026-02-04', 'PRESENT', NOW(), NOW()),
  (2, 25, 2, 5, 3, '2026-02-11', 'SICK', NOW(), NOW()),
  (2, 25, 2, 5, 3, '2026-03-04', 'PRESENT', NOW(), NOW()),
  (2, 25, 2, 5, 3, '2026-03-11', 'PRESENT', NOW(), NOW()),
  (2, 25, 2, 5, 3, '2026-04-08', 'PRESENT', NOW(), NOW()),
  (2, 25, 2, 5, 3, '2026-04-15', 'PRESENT', NOW(), NOW()),
  (2, 25, 2, 5, 3, '2026-04-22', 'PRESENT', NOW(), NOW());

-- ----------------------------------------------------------------------------
-- 8. Quarter final grades (Q3) for student 25
-- ----------------------------------------------------------------------------
INSERT INTO journal_final_grades (class_id, student_id, subject_id, teacher_id, quarter, quarter_grade, calculated_quarter_grade, is_quarter_manual, updated_at) VALUES
  (2, 25, 1, 5, 3, 5, 4.6, true, NOW()),
  (2, 25, 2, 5, 3, 4, 4.4, true, NOW());

-- ----------------------------------------------------------------------------
-- 9. Achievements catalog
-- ----------------------------------------------------------------------------
INSERT INTO achievements (name, description, icon, achievement_type, required_value, xp_reward) VALUES
  ('Первый шаг',           'Сдать первое задание',                       '🎯', 'ASSIGNMENTS_COUNT', 1,   50),
  ('Прилежный ученик',     'Сдать 10 заданий',                           '📚', 'ASSIGNMENTS_COUNT', 10,  150),
  ('Серия из 5',           'Получить 5 пятёрок подряд',                  '🔥', 'STREAK_COUNT',      5,   100),
  ('Отличник',             'Получить 50 пятёрок',                        '🌟', 'PERFECT_GRADES',    50,  500),
  ('Без прогулов',         'Не пропустить ни одного урока за месяц',     '✅', 'ATTENDANCE',        20,  200),
  ('Олимпиец',             'Принять участие в олимпиаде',                '🏆', 'OLYMPIAD',          1,   300),
  ('Знаток математики',    'Получить пятёрку за 10 заданий по математике','➗', 'SUBJECT_MATH',      10,  250),
  ('Активный участник',    'Активность 30 дней подряд',                  '⚡', 'STREAK_COUNT',      30,  400)
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 10. Student stats + unlocked achievements + xp history for student 25
-- ----------------------------------------------------------------------------
INSERT INTO student_stats (student_id, total_xp, level, current_streak, max_streak, completed_assignments, perfect_assignments, rank_position) VALUES
  (25, 1240, 5, 7, 14, 23, 12, 3)
ON CONFLICT (student_id) DO UPDATE SET
  total_xp=EXCLUDED.total_xp, level=EXCLUDED.level, current_streak=EXCLUDED.current_streak,
  max_streak=EXCLUDED.max_streak, completed_assignments=EXCLUDED.completed_assignments,
  perfect_assignments=EXCLUDED.perfect_assignments, rank_position=EXCLUDED.rank_position;

INSERT INTO student_achievements (student_id, achievement_id, unlocked_at, progress_value)
SELECT 25, id, NOW() - INTERVAL '15 days', required_value FROM achievements WHERE name='Первый шаг'
ON CONFLICT DO NOTHING;
INSERT INTO student_achievements (student_id, achievement_id, unlocked_at, progress_value)
SELECT 25, id, NOW() - INTERVAL '8 days',  required_value FROM achievements WHERE name='Прилежный ученик'
ON CONFLICT DO NOTHING;
INSERT INTO student_achievements (student_id, achievement_id, unlocked_at, progress_value)
SELECT 25, id, NOW() - INTERVAL '4 days',  required_value FROM achievements WHERE name='Серия из 5'
ON CONFLICT DO NOTHING;

-- XP history (recent events)
INSERT INTO xp_event (student_id, source, source_id, xp_change, total_xp_after, created_at) VALUES
  (25, 'ASSIGNMENT_GRADE',  NULL,  95, 1145, NOW() - INTERVAL '6 days'),
  (25, 'PERFECT_GRADE',     NULL,  50, 1195, NOW() - INTERVAL '6 days'),
  (25, 'ACHIEVEMENT',       NULL, 100, 1295, NOW() - INTERVAL '4 days'),
  (25, 'ASSIGNMENT_GRADE',  NULL,  87, 1382, NOW() - INTERVAL '1 day'),
  (25, 'ATTENDANCE_BONUS',  NULL,  10, 1392, NOW() - INTERVAL '12 hours');

-- ----------------------------------------------------------------------------
-- 11. Tags for student 25
-- ----------------------------------------------------------------------------
INSERT INTO student_tags (student_id, tag_id) VALUES
  (25, 2),  -- Юный программист
  (25, 3),  -- Начинающий ученый
  (25, 8)   -- Технарь
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 12. Notifications for student 25 + parent 26
-- ----------------------------------------------------------------------------
INSERT INTO notifications (user_id, type, message, is_read, hidden, created_at) VALUES
  (25, 'GRADE',      'Получена оценка 95/100 по заданию "Реферат: история математики"', false, false, NOW() - INTERVAL '6 days'),
  (25, 'GRADE',      'Получена оценка 87/100 по контрольной "Квадратные уравнения"',     false, false, NOW() - INTERVAL '1 day'),
  (25, 'ASSIGNMENT', 'Новое задание: "СОЧ за 3 четверть по алгебре" — срок 15 мая',      true,  false, NOW() - INTERVAL '4 days'),
  (25, 'ASSIGNMENT', 'Срок задания "Домашняя работа: тригонометрические тождества" истекает через 2 дня', false, false, NOW() - INTERVAL '12 hours'),
  (25, 'ACHIEVEMENT','Открыто достижение: "Серия из 5" 🔥',                              false, false, NOW() - INTERVAL '4 days'),
  (26, 'GRADE',      'Оценка ребёнка (Нурбол): 95/100 по реферату по математике',        false, false, NOW() - INTERVAL '6 days'),
  (26, 'GRADE',      'Оценка ребёнка (Нурбол): 87/100 по контрольной работе',            false, false, NOW() - INTERVAL '1 day'),
  (26, 'INFO',       'Родительское собрание 8А состоится 10 мая в 18:00, кабинет 301',   true,  false, NOW() - INTERVAL '2 days');

-- ----------------------------------------------------------------------------
-- 13. Survey from admin
-- ----------------------------------------------------------------------------
INSERT INTO surveys (active, is_active, title, description, created_by, for_students, for_teachers, created_at)
VALUES (true, true,
  'Удовлетворенность качеством образования',
  'Помогите нам стать лучше — пройдите короткий опрос (3 минуты). Ваши ответы анонимны.',
  4, true, false, NOW() - INTERVAL '3 days');

INSERT INTO survey_questions (survey_id, order_index, required, text, type, question_type)
SELECT s.id, 0, true, 'Как вы оцениваете качество преподавания в этом году?', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE'
FROM surveys s WHERE s.title='Удовлетворенность качеством образования';

INSERT INTO survey_options (question_id, order_index, text)
SELECT q.id, n, txt FROM survey_questions q,
  (VALUES (0, 'Отлично'), (1, 'Хорошо'), (2, 'Удовлетворительно'), (3, 'Плохо')) AS opts(n, txt)
WHERE q.text='Как вы оцениваете качество преподавания в этом году?';

INSERT INTO survey_questions (survey_id, order_index, required, text, type, question_type)
SELECT s.id, 1, true, 'Какие предметы вам нравятся больше всего?', 'MULTI_CHOICE', 'MULTIPLE_CHOICE'
FROM surveys s WHERE s.title='Удовлетворенность качеством образования';

INSERT INTO survey_options (question_id, order_index, text)
SELECT q.id, n, txt FROM survey_questions q,
  (VALUES (0, 'Математика'), (1, 'Физика'), (2, 'Химия'), (3, 'Биология'), (4, 'История'), (5, 'Литература'), (6, 'Информатика'), (7, 'Иностранные языки'))
  AS opts(n, txt)
WHERE q.text='Какие предметы вам нравятся больше всего?';

INSERT INTO survey_questions (survey_id, order_index, required, text, type, question_type)
SELECT s.id, 2, false, 'Что бы вы хотели улучшить в школе?', 'TEXT', 'TEXT'
FROM surveys s WHERE s.title='Удовлетворенность качеством образования';

COMMIT;

-- Show seed summary
SELECT 'Lessons in week' AS metric, COUNT(*) AS value FROM lessons l
JOIN schedule_days sd ON sd.id=l.day_id WHERE sd.date BETWEEN '2026-04-27' AND '2026-05-01'
UNION ALL SELECT 'Assignments for class 8А',     COUNT(*) FROM assignments WHERE class_id=2
UNION ALL SELECT 'Submissions by student 25',    COUNT(*) FROM submissions WHERE student_id=25
UNION ALL SELECT 'Journal entries (Q3) student', COUNT(*) FROM journal_entries WHERE student_id=25 AND quarter=3
UNION ALL SELECT 'Attendance marks (Q3) student',COUNT(*) FROM attendance_marks WHERE student_id=25 AND quarter=3
UNION ALL SELECT 'Final grades (Q3) student',    COUNT(*) FROM journal_final_grades WHERE student_id=25 AND quarter=3
UNION ALL SELECT 'Achievements unlocked',        COUNT(*) FROM student_achievements WHERE student_id=25
UNION ALL SELECT 'XP events',                    COUNT(*) FROM xp_event WHERE student_id=25
UNION ALL SELECT 'Tags',                         COUNT(*) FROM student_tags WHERE student_id=25
UNION ALL SELECT 'Notifications student 25',     COUNT(*) FROM notifications WHERE user_id=25
UNION ALL SELECT 'Notifications parent 26',      COUNT(*) FROM notifications WHERE user_id=26;
