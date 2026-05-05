import { useEffect, useMemo, useState } from "react";
import { lessonSlots, weekDays } from "../../../../shared/constants/schedule";
import WeeklyScheduleTable from "../../../../shared/ui/WeeklyScheduleTable/WeeklyScheduleTable";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { parentApi } from "../../../../shared/lib/api";
import { addDaysISO, formatWeekRange, getMondayISO } from "../../../../shared/lib/utils/date";
import { useT } from "../../../../shared/lib/i18n";

const childSelectStyle = {
  height: 36,
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--stroke)",
  background: "var(--panel)",
  color: "var(--text)",
  padding: "0 12px",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "inherit",
};

function emptyGrid() {
  return Object.fromEntries(weekDays.map((d) => [d.key, lessonSlots.map(() => null)]));
}

function dayOfWeekFromISO(iso) {
  const d = new Date(iso);
  const map = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return map[d.getDay()];
}

function buildScheduleFromMap(scheduleMap, t) {
  const grid = emptyGrid();
  if (!scheduleMap || typeof scheduleMap !== "object") return grid;
  Object.entries(scheduleMap).forEach(([dateStr, lessons]) => {
    const dayKey = dayOfWeekFromISO(dateStr);
    if (!grid[dayKey]) return;
    (lessons || []).forEach((lesson) => {
      const idx = (lesson.lessonNumber ?? 1) - 1;
      if (idx < 0 || idx >= grid[dayKey].length) return;
      grid[dayKey][idx] = {
        subject: lesson.subjectName || "",
        metaLine: lesson.classroom ? t("parent.common.classroomShort", { room: lesson.classroom }) : "",
        extraLine: lesson.teacherName || "",
      };
    });
  });
  return grid;
}

export default function ParentSchedulePage() {
  const { t } = useT();
  const [startDate, setStartDate] = useState(() => getMondayISO());

  const childrenQuery = useApi(() => parentApi.children(), []);
  const children = useMemo(() => Array.isArray(childrenQuery.data) ? childrenQuery.data : [], [childrenQuery.data]);

  const [childId, setChildId] = useState(null);
  useEffect(() => {
    if (childId == null && children.length) setChildId(children[0].id);
  }, [children, childId]);

  const scheduleQuery = useApi(
    () => (childId ? parentApi.childScheduleWeek(childId, startDate) : Promise.resolve(null)),
    [childId, startDate],
    { immediate: Boolean(childId) },
  );

  const schedule = useMemo(() => buildScheduleFromMap(scheduleQuery.data, t), [scheduleQuery.data, t]);
  const weekRange = useMemo(() => formatWeekRange(startDate), [startDate]);

  if (childrenQuery.loading && !children.length) {
    return <div style={{ padding: 24, color: "var(--muted)" }}>{t("parent.common.loading")}</div>;
  }
  if (!children.length) {
    return <div style={{ padding: 24, color: "var(--muted)" }}>{t("parent.common.noChildren")}</div>;
  }

  return (
    <WeeklyScheduleTable
      title={t("parent.schedule.title")}
      weekRange={weekRange}
      weekDays={weekDays}
      slots={lessonSlots}
      schedule={schedule}
      actionLabel=""
      onPrevWeek={() => setStartDate(addDaysISO(startDate, -7))}
      onNextWeek={() => setStartDate(addDaysISO(startDate, 7))}
      onToday={() => setStartDate(getMondayISO())}
      todayLabel={t("parent.schedule.todayBtn")}
      rightControls={
        <select style={childSelectStyle} value={childId ?? ""} onChange={(e) => setChildId(e.target.value)}>
          {children.map((c) => (
            <option key={c.id} value={c.id}>{c.fio} {c.className ? `(${c.className})` : ""}</option>
          ))}
        </select>
      }
    />
  );
}
