import { defaultWeekRange, lessonSlots, weekDays } from "../../../../shared/constants/schedule";
import { mapScheduleEntries } from "../../../../shared/lib/utils/schedule";
import WeeklyScheduleTable from "../../../../shared/ui/WeeklyScheduleTable/WeeklyScheduleTable";

const schedule = {
  monday: [
    { subject: "Алгебра", className: "10-А", room: "203 каб" },
    { subject: "Геометрия", className: "9-Б", room: "205 каб" },
    null,
    { subject: "ЕНТ-практика", className: "11-А", room: "306 каб" },
    { subject: "Классный час", className: "10-А", room: "Актовый зал" },
    { subject: "Консультация", className: "11-А", room: "310 каб" },
    null,
    null,
  ],
  tuesday: [
    { subject: "Математика", className: "8-В", room: "204 каб" },
    { subject: "Геометрия", className: "10-А", room: "205 каб" },
    { subject: "Алгебра", className: "9-Б", room: "203 каб" },
    null,
    { subject: "Проверка ДЗ", className: "9-Б", room: "Метод. кабинет" },
    { subject: "Факультатив", className: "10-А", room: "306 каб" },
    null,
    null,
  ],
  wednesday: [
    { subject: "ЕНТ-практика", className: "11-А", room: "306 каб" },
    { subject: "Математика", className: "8-В", room: "204 каб" },
    { subject: "Алгебра", className: "10-А", room: "203 каб" },
    { subject: "Алгебра", className: "9-Б", room: "203 каб" },
    null,
    { subject: "Консультация", className: "11-А", room: "310 каб" },
    null,
    null,
  ],
  thursday: [
    { subject: "Геометрия", className: "10-А", room: "205 каб" },
    null,
    { subject: "Математика", className: "8-В", room: "204 каб" },
    { subject: "Геометрия", className: "9-Б", room: "205 каб" },
    { subject: "Разбор тестов", className: "11-А", room: "306 каб" },
    null,
    null,
    null,
  ],
  friday: [
    { subject: "Классный час", className: "10-А", room: "213 каб" },
    { subject: "ЕНТ-практика", className: "11-А", room: "306 каб" },
    { subject: "Алгебра", className: "10-А", room: "203 каб" },
    { subject: "Алгебра", className: "9-Б", room: "203 каб" },
    { subject: "Методсовет", className: "Кафедра", room: "203 каб" },
    { subject: "Проверка тетрадей", className: "9-Б", room: "Учительская" },
    { subject: "Консультация", className: "10-А", room: "310 каб" },
    null,
  ],
};

const normalizedSchedule = mapScheduleEntries(schedule, (lesson) => ({
  subject: lesson.subject,
  metaLine: lesson.className,
  extraLine: lesson.room,
}));

export default function TeacherSchedulePage() {
  return (
    <WeeklyScheduleTable
      title="Мое расписание"
      weekRange={defaultWeekRange}
      weekDays={weekDays}
      slots={lessonSlots}
      schedule={normalizedSchedule}
      actionLabel="Методический календарь"
      emptyLabel="Окно"
    />
  );
}
