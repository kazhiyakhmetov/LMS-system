import { useMemo, useState } from "react";
import { lessonSlots, weekDays } from "../../../../shared/constants/schedule";
import WeeklyScheduleTable from "../../../../shared/ui/WeeklyScheduleTable/WeeklyScheduleTable";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { scheduleApi } from "../../../../shared/lib/api";
import { addDaysISO, formatWeekRange, getMondayISO } from "../../../../shared/lib/utils/date";
import { useT } from "../../../../shared/lib/i18n";

function emptyGrid() {
  return Object.fromEntries(weekDays.map((d) => [d.key, lessonSlots.map(() => null)]));
}

function buildSchedule(days, t) {
  const grid = emptyGrid();
  if (!Array.isArray(days)) return grid;
  days.forEach((day) => {
    const key = day?.dayOfWeek?.toLowerCase();
    if (!grid[key]) return;
    (day.lessons || []).forEach((lesson) => {
      const idx = (lesson.lessonNumber ?? 1) - 1;
      if (idx < 0 || idx >= grid[key].length) return;
      grid[key][idx] = {
        subject: lesson.subjectName || "",
        metaLine: lesson.classroom ? t("student.home.classroomShort", { room: lesson.classroom }) : "",
        extraLine: lesson.teacherName || "",
      };
    });
  });
  return grid;
}

export default function StudentSchedulePage() {
  const { t } = useT();
  const [startDate, setStartDate] = useState(() => getMondayISO());

  const { data, loading, error } = useApi(
    () => scheduleApi.studentWeek(startDate),
    [startDate],
  );

  const schedule = useMemo(() => buildSchedule(data, t), [data, t]);
  const weekRange = useMemo(() => formatWeekRange(startDate), [startDate]);

  if (loading && !data) {
    return <div style={{ padding: 24, color: "var(--muted)" }}>{t("student.schedule.loading")}</div>;
  }
  if (error) {
    return (
      <div
        style={{
          margin: 16,
          padding: 16,
          border: "1px solid var(--danger)",
          borderRadius: "var(--radius-sm)",
          background: "var(--danger-soft)",
          color: "var(--danger-strong)",
          fontSize: 13,
        }}
      >
        {t("common.error")}: {error.message}
      </div>
    );
  }

  return (
    <WeeklyScheduleTable
      title={t("student.schedule.title")}
      weekRange={weekRange}
      weekDays={weekDays}
      slots={lessonSlots}
      schedule={schedule}
      actionLabel={t("student.schedule.examsBtn")}
      onPrevWeek={() => setStartDate(addDaysISO(startDate, -7))}
      onNextWeek={() => setStartDate(addDaysISO(startDate, 7))}
      onToday={() => setStartDate(getMondayISO())}
      todayLabel={t("student.schedule.todayBtn")}
    />
  );
}
