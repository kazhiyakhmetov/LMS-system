import { useMemo, useState } from "react";
import { lessonSlots, weekDays } from "../../../../shared/constants/schedule";
import WeeklyScheduleTable from "../../../../shared/ui/WeeklyScheduleTable/WeeklyScheduleTable";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { scheduleApi } from "../../../../shared/lib/api";
import { addDaysISO, formatWeekRange, getMondayISO } from "../../../../shared/lib/utils/date";

function emptyGrid() {
  return Object.fromEntries(weekDays.map((d) => [d.key, lessonSlots.map(() => null)]));
}

function buildSchedule(lessons) {
  const grid = emptyGrid();
  if (!Array.isArray(lessons)) return grid;
  lessons.forEach((lesson) => {
    const key = lesson?.dayOfWeek?.toLowerCase();
    if (!grid[key]) return;
    const idx = (lesson.lessonNumber ?? 1) - 1;
    if (idx < 0 || idx >= grid[key].length) return;
    grid[key][idx] = {
      subject: lesson.subjectName || "",
      metaLine: lesson.className || "",
      extraLine: lesson.classroom ? `${lesson.classroom} каб` : "",
    };
  });
  return grid;
}

export default function TeacherSchedulePage() {
  const [startDate, setStartDate] = useState(() => getMondayISO());

  const { data, loading, error } = useApi(
    () => scheduleApi.teacherWeek(startDate),
    [startDate],
  );

  const schedule = useMemo(() => buildSchedule(data), [data]);
  const weekRange = useMemo(() => formatWeekRange(startDate), [startDate]);

  if (loading && !data) return <div style={{ padding: 24 }}>Загрузка расписания…</div>;
  if (error) return <div style={{ padding: 24, color: "var(--danger)" }}>Ошибка: {error.message}</div>;

  return (
    <WeeklyScheduleTable
      title="Мое расписание"
      weekRange={weekRange}
      weekDays={weekDays}
      slots={lessonSlots}
      schedule={schedule}
      actionLabel="Методический календарь"
      emptyLabel="Окно"
      rightControls={
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setStartDate(addDaysISO(startDate, -7))}>← неделя</button>
          <button type="button" onClick={() => setStartDate(getMondayISO())}>Сегодня</button>
          <button type="button" onClick={() => setStartDate(addDaysISO(startDate, 7))}>неделя →</button>
        </div>
      }
    />
  );
}
