import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "../DashboardLayout";
import { teacherMenu } from "./teacherMenu";
import TeacherHomePage from "./pages/TeacherHomePage";
import TeacherClassesPage from "./pages/TeacherClassesPage";
import TeacherSchedulePage from "./pages/TeacherSchedulePage";
import TeacherHomeroomPage from "./pages/TeacherHomeroomPage";
import TeacherAssignmentsPage from "./pages/TeacherAssignmentsPage";
import TeacherExamsPage from "./pages/TeacherExamsPage";
import TeacherQuizzesPage from "./pages/TeacherQuizzesPage";
import TeacherSurveyPage from "./pages/TeacherSurveyPage";
import TeacherChatPage from "./pages/TeacherChatPage";
import TeacherGradesPage from "./pages/TeacherGradesPage";
import TeacherStatsPage from "./pages/TeacherStatsPage";
import TeacherWikiPage from "./pages/TeacherWikiPage";
import TeacherLibraryPage from "./pages/TeacherLibraryPage";
import TeacherNewsPage from "./pages/TeacherNewsPage";
import TeacherFriendsPage from "./pages/TeacherFriendsPage";
import TeacherProfilePage from "./pages/TeacherProfilePage";
import TeacherSettingsPage from "./pages/TeacherSettingsPage";
import { resolveDashboardSection } from "../shared/resolveDashboardSection";

const defaultSection = {
  title: "Главная",
  component: TeacherHomePage,
};

const sections = [
  { path: "/teacher/homeroom", title: "Мой класс", component: TeacherHomeroomPage },
  { path: "/teacher/classes", title: "Классы", component: TeacherClassesPage },
  { path: "/teacher/schedule", title: "Расписание", component: TeacherSchedulePage },
  { path: "/teacher/assignments", title: "Задачи", component: TeacherAssignmentsPage },
  { path: "/teacher/exams", title: "СОР/СОЧ", component: TeacherExamsPage },
  { path: "/teacher/quizzes", title: "Тесты", component: TeacherQuizzesPage },
  { path: "/teacher/surveys", title: "Опросы", component: TeacherSurveyPage },
  { path: "/teacher/chat", title: "Чат", component: TeacherChatPage },
  { path: "/teacher/grades", title: "Оценки", component: TeacherGradesPage },
  { path: "/teacher/wiki", title: "База знаний", component: TeacherWikiPage },
  { path: "/teacher/library", title: "Библиотека", component: TeacherLibraryPage },
  { path: "/teacher/news", title: "Новости", component: TeacherNewsPage },
  { path: "/teacher/friends", title: "Друзья", component: TeacherFriendsPage },
  { path: "/teacher/stats", title: "Статистика", component: TeacherStatsPage },
  { path: "/teacher/profile", title: "Профиль", component: TeacherProfilePage },
  { path: "/teacher/settings", title: "Настройки", component: TeacherSettingsPage },
];

export default function TeacherPage() {
  const { pathname } = useLocation();
  const section = useMemo(() => resolveDashboardSection(pathname, sections, defaultSection), [pathname]);
  const SectionComponent = section.component;

  return (
    <DashboardLayout title={section.title} menu={teacherMenu}>
      <SectionComponent />
    </DashboardLayout>
  );
}
