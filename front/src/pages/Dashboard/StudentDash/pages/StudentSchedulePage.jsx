import { defaultWeekRange, lessonSlots, weekDays } from "../../../../shared/constants/schedule";
import { mapScheduleEntries } from "../../../../shared/lib/utils/schedule";
import WeeklyScheduleTable from "../../../../shared/ui/WeeklyScheduleTable/WeeklyScheduleTable";

const schedule = {
  monday: [
    { subject: "Физика", room: "112 каб", teacher: "Н. Садыкова" },
    { subject: "Алгебра", room: "203 каб", teacher: "К. Муханова" },
    { subject: "История", room: "108 каб", teacher: "Д. Турсынбек" },
    { subject: "Информатика", room: "210 каб", teacher: "А. Жанибек" },
    { subject: "Английский", room: "307 каб", teacher: "A. White" },
    { subject: "Биология", room: "114 каб", teacher: "А. Нурали" },
    { subject: "Казахский", room: "304 каб", teacher: "Ж. Аблай" },
    null,
  ],
  tuesday: [
    { subject: "Физика", room: "112 каб", teacher: "Н. Садыкова" },
    { subject: "Геометрия", room: "205 каб", teacher: "К. Муханова" },
    { subject: "Литература", room: "109 каб", teacher: "Л. Толеу" },
    { subject: "История", room: "108 каб", teacher: "Д. Турсынбек" },
    { subject: "Химия", room: "116 каб", teacher: "С. Рахим" },
    { subject: "Физкультура", room: "Спортзал", teacher: "И. Ким" },
    null,
    null,
  ],
  wednesday: [
    { subject: "Алгебра", room: "203 каб", teacher: "К. Муханова" },
    { subject: "Физика", room: "112 каб", teacher: "Н. Садыкова" },
    { subject: "Информатика", room: "210 каб", teacher: "А. Жанибек" },
    { subject: "География", room: "118 каб", teacher: "Г. Абдулла" },
    { subject: "Английский", room: "307 каб", teacher: "A. White" },
    { subject: "Биология", room: "114 каб", teacher: "А. Нурали" },
    { subject: "Классный час", room: "213 каб", teacher: "Куратор" },
    null,
  ],
  thursday: [
    { subject: "Физика", room: "112 каб", teacher: "Н. Садыкова" },
    { subject: "Алгебра", room: "203 каб", teacher: "К. Муханова" },
    { subject: "Казахский", room: "304 каб", teacher: "Ж. Аблай" },
    { subject: "Английский", room: "307 каб", teacher: "A. White" },
    { subject: "Информатика", room: "210 каб", teacher: "А. Жанибек" },
    { subject: "История", room: "108 каб", teacher: "Д. Турсынбек" },
    null,
    null,
  ],
  friday: [
    { subject: "Биология", room: "114 каб", teacher: "А. Нурали" },
    { subject: "Геометрия", room: "205 каб", teacher: "К. Муханова" },
    { subject: "Физика", room: "112 каб", teacher: "Н. Садыкова" },
    { subject: "Химия", room: "116 каб", teacher: "С. Рахим" },
    { subject: "История", room: "108 каб", teacher: "Д. Турсынбек" },
    { subject: "Английский", room: "307 каб", teacher: "A. White" },
    { subject: "Казахский", room: "304 каб", teacher: "Ж. Аблай" },
    { subject: "Факультатив", room: "215 каб", teacher: "П. Нурбек" },
  ],
};

const normalizedSchedule = mapScheduleEntries(schedule, (lesson) => ({
  subject: lesson.subject,
  metaLine: lesson.room,
  extraLine: lesson.teacher,
}));

export default function StudentSchedulePage() {
  return (
    <WeeklyScheduleTable
      title="Расписание уроков"
      weekRange={defaultWeekRange}
      weekDays={weekDays}
      slots={lessonSlots}
      schedule={normalizedSchedule}
      actionLabel="Расписание экзаменов"
    />
  );
}
