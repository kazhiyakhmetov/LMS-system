import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "../DashboardLayout";
import { studentMenu } from "./studentMenu";
import StudentHomePage from "./pages/StudentHomePage";
import StudentGamificationPage from "./pages/StudentGamificationPage";
import StudentSchedulePage from "./pages/StudentSchedulePage";
import StudentAssignmentsPage from "./pages/StudentAssignmentsPage";
import StudentQuizPage from "./pages/StudentQuizPage";
import StudentChatPage from "./pages/StudentChatPage";
import StudentGradesPage from "./pages/StudentGradesPage";
import StudentSurveyPage from "./pages/StudentSurveyPage";
import StudentWikiPage from "./pages/StudentWikiPage";
import StudentProfilePage from "./pages/StudentProfilePage";
import StudentSettingsPage from "./pages/StudentSettingsPage";
import { resolveDashboardSection } from "../shared/resolveDashboardSection";

const defaultSection = {
  title: "Главная",
  component: StudentHomePage,
};

const sections = [
  { path: "/student/gamification", title: "Геймификация", component: StudentGamificationPage },
  { path: "/student/schedule", title: "Расписание", component: StudentSchedulePage },
  { path: "/student/assignments", title: "Задания", component: StudentAssignmentsPage },
  { path: "/student/quizzes", title: "Квизы", component: StudentQuizPage },
  { path: "/student/chat", title: "Чат", component: StudentChatPage },
  { path: "/student/grades", title: "Оценки", component: StudentGradesPage },
  { path: "/student/wiki", title: "База знаний", component: StudentWikiPage },
  { path: "/student/surveys", title: "Опросы", component: StudentSurveyPage },
  { path: "/student/profile", title: "Профиль", component: StudentProfilePage },
  { path: "/student/settings", title: "Настройки", component: StudentSettingsPage },
];

export default function StudentPage() {
  const { pathname } = useLocation();
  const section = useMemo(() => resolveDashboardSection(pathname, sections, defaultSection), [pathname]);
  const SectionComponent = section.component;

  return (
    <DashboardLayout title={section.title} menu={studentMenu}>
      <SectionComponent />
    </DashboardLayout>
  );
}
