export function mapScheduleEntries(schedule, mapper) {
  return Object.fromEntries(
    Object.entries(schedule).map(([day, lessons]) => [
      day,
      lessons.map((lesson) => (lesson ? mapper(lesson) : null)),
    ]),
  );
}
