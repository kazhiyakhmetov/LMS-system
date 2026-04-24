import { useMemo, useState } from "react";
import { defaultWeekRange, lessonSlots, weekDays } from "../../../../shared/constants/schedule";
import { mapScheduleEntries } from "../../../../shared/lib/utils/schedule";
import WeeklyScheduleTable from "../../../../shared/ui/WeeklyScheduleTable/WeeklyScheduleTable";

const children = [
  { id: "aliya", label: "Алия Есенова • 10-А" },
  { id: "timur", label: "Тимур Есенов • 6-Б" },
];

const schedules = {
  aliya: {
    monday: [
      { subject: "Физика", room: "112 каб", teacher: "Н. Садыкова" },
      { subject: "Алгебра", room: "203 каб", teacher: "К. Муханова" },
      { subject: "История", room: "108 каб", teacher: "Д. Турсынбек" },
      { subject: "Информатика", room: "210 каб", teacher: "А. Жанибек" },
      { subject: "Английский", room: "307 каб", teacher: "A. White" },
      null,
      null,
      null,
    ],
    tuesday: [
      { subject: "Физика", room: "112 каб", teacher: "Н. Садыкова" },
      { subject: "Геометрия", room: "205 каб", teacher: "К. Муханова" },
      { subject: "Литература", room: "109 каб", teacher: "Л. Толеу" },
      { subject: "История", room: "108 каб", teacher: "Д. Турсынбек" },
      { subject: "Химия", room: "116 каб", teacher: "С. Рахим" },
      null,
      null,
      null,
    ],
    wednesday: [
      { subject: "Алгебра", room: "203 каб", teacher: "К. Муханова" },
      { subject: "Физика", room: "112 каб", teacher: "Н. Садыкова" },
      { subject: "Информатика", room: "210 каб", teacher: "А. Жанибек" },
      { subject: "География", room: "118 каб", teacher: "Г. Абдулла" },
      { subject: "Английский", room: "307 каб", teacher: "A. White" },
      null,
      null,
      null,
    ],
    thursday: [
      { subject: "Физика", room: "112 каб", teacher: "Н. Садыкова" },
      { subject: "Алгебра", room: "203 каб", teacher: "К. Муханова" },
      { subject: "Казахский", room: "304 каб", teacher: "Ж. Аблай" },
      { subject: "Английский", room: "307 каб", teacher: "A. White" },
      { subject: "Информатика", room: "210 каб", teacher: "А. Жанибек" },
      null,
      null,
      null,
    ],
    friday: [
      { subject: "Биология", room: "114 каб", teacher: "А. Нурали" },
      { subject: "Геометрия", room: "205 каб", teacher: "К. Муханова" },
      { subject: "Физика", room: "112 каб", teacher: "Н. Садыкова" },
      { subject: "Химия", room: "116 каб", teacher: "С. Рахим" },
      { subject: "История", room: "108 каб", teacher: "Д. Турсынбек" },
      null,
      null,
      null,
    ],
  },
  timur: {
    monday: [
      { subject: "Математика", room: "104 каб", teacher: "С. Ермекова" },
      { subject: "Русский язык", room: "110 каб", teacher: "Л. Толеу" },
      { subject: "История", room: "101 каб", teacher: "Д. Турсынбек" },
      { subject: "Биология", room: "114 каб", teacher: "А. Нурали" },
      null,
      null,
      null,
      null,
    ],
    tuesday: [
      { subject: "Казахский", room: "109 каб", teacher: "Ж. Аблай" },
      { subject: "Математика", room: "104 каб", teacher: "С. Ермекова" },
      { subject: "Информатика", room: "209 каб", teacher: "А. Жанибек" },
      { subject: "География", room: "115 каб", teacher: "Г. Абдулла" },
      null,
      null,
      null,
      null,
    ],
    wednesday: [
      { subject: "Математика", room: "104 каб", teacher: "С. Ермекова" },
      { subject: "Английский", room: "307 каб", teacher: "A. White" },
      { subject: "География", room: "115 каб", teacher: "Г. Абдулла" },
      { subject: "Русский язык", room: "110 каб", teacher: "Л. Толеу" },
      null,
      null,
      null,
      null,
    ],
    thursday: [
      { subject: "История", room: "101 каб", teacher: "Д. Турсынбек" },
      { subject: "Математика", room: "104 каб", teacher: "С. Ермекова" },
      { subject: "Казахский", room: "109 каб", teacher: "Ж. Аблай" },
      { subject: "Биология", room: "114 каб", teacher: "А. Нурали" },
      null,
      null,
      null,
      null,
    ],
    friday: [
      { subject: "Математика", room: "104 каб", teacher: "С. Ермекова" },
      { subject: "Информатика", room: "209 каб", teacher: "А. Жанибек" },
      { subject: "Русский язык", room: "110 каб", teacher: "Л. Толеу" },
      null,
      null,
      null,
      null,
      null,
    ],
  },
};

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

export default function ParentSchedulePage() {
  const [childId, setChildId] = useState(children[0].id);

  const selectedSchedule = useMemo(() => schedules[childId], [childId]);

  const normalizedSchedule = useMemo(
    () =>
      mapScheduleEntries(selectedSchedule, (lesson) => ({
        subject: lesson.subject,
        metaLine: lesson.room,
        extraLine: lesson.teacher,
      })),
    [selectedSchedule],
  );

  return (
    <WeeklyScheduleTable
      title="Расписание ребенка"
      weekRange={defaultWeekRange}
      weekDays={weekDays}
      slots={lessonSlots}
      schedule={normalizedSchedule}
      actionLabel="Календарь родителя"
      rightControls={
        <select style={childSelectStyle} value={childId} onChange={(event) => setChildId(event.target.value)}>
          {children.map((child) => (
            <option key={child.id} value={child.id}>
              {child.label}
            </option>
          ))}
        </select>
      }
    />
  );
}
