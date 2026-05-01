import { useEffect, useMemo, useState } from "react";
import { lessonSlots, weekDays } from "../../../../shared/constants/schedule";
import WeeklyScheduleTable from "../../../../shared/ui/WeeklyScheduleTable/WeeklyScheduleTable";
import { useApi } from "../../../../shared/lib/hooks/useApi";
import { parentApi } from "../../../../shared/lib/api";
import { addDaysISO, formatWeekRange, getMondayISO } from "../../../../shared/lib/utils/date";

const childSelectStyle = {
  height: "42px",
  borderRadius: "999px",
  border: "1px solid rgba(29, 99, 230, 0.32)",
  background: "#ffffff",
  padding: "0 14px",
  fontSize: "14px",
  fontWeight: 600,
  color: "#123469",
};

function emptyGrid() {
  return Object.fromEntries(weekDays.map((d) => [d.key, lessonSlots.map(() => null)]));
}

function dayOfWeekFromISO(iso) {
  const d = new Date(iso);
  const map = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return map[d.getDay()];
}

function buildScheduleFromMap(scheduleMap) {
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
        metaLine: lesson.classroom ? `${lesson.classroom} каб` : "",
        extraLine: lesson.teacherName || "",
      };
    });
  });
  return grid;
}

export default function ParentSchedulePage() {
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

  const schedule = useMemo(() => buildScheduleFromMap(scheduleQuery.data), [scheduleQuery.data]);
  const weekRange = useMemo(() => formatWeekRange(startDate), [startDate]);

  if (childrenQuery.loading && !children.length) {
    return <div style={{ padding: 24 }}>Загрузка…</div>;
  }
  if (!children.length) {
    return <div style={{ padding: 24 }}>К вашему аккаунту не привязаны дети.</div>;
  }

  return (
    <WeeklyScheduleTable
      title="Расписание ребенка"
      weekRange={weekRange}
      weekDays={weekDays}
      slots={lessonSlots}
      schedule={schedule}
      actionLabel="Календарь родителя"
      rightControls={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select style={childSelectStyle} value={childId ?? ""} onChange={(e) => setChildId(e.target.value)}>
            {children.map((c) => (
              <option key={c.id} value={c.id}>{c.fio} ({c.className || "—"})</option>
            ))}
          </select>
          <button type="button" onClick={() => setStartDate(addDaysISO(startDate, -7))}>← неделя</button>
          <button type="button" onClick={() => setStartDate(getMondayISO())}>Сегодня</button>
          <button type="button" onClick={() => setStartDate(addDaysISO(startDate, 7))}>неделя →</button>
        </div>
      }
    />
  );
}
