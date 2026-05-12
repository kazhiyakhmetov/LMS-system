import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "../DashboardLayout";
import { parentMenu } from "./parentMenu";
import ParentHomePage from "./pages/ParentHomePage";
import ParentChildrenPage from "./pages/ParentChildrenPage";
import ParentSchedulePage from "./pages/ParentSchedulePage";
import ParentChatPage from "./pages/ParentChatPage";
import ParentGradesPage from "./pages/ParentGradesPage";
import ParentJournalPage from "./pages/ParentJournalPage";
import ParentAssignmentsPage from "./pages/ParentAssignmentsPage";
import ParentNewsPage from "./pages/ParentNewsPage";
import ParentFriendsPage from "./pages/ParentFriendsPage";
import ParentProfilePage from "./pages/ParentProfilePage";
import ParentSettingsPage from "./pages/ParentSettingsPage";
import { resolveDashboardSection } from "../shared/resolveDashboardSection";

const defaultSection = {
  title: "Главная",
  component: ParentHomePage,
};

const sections = [
  { path: "/parent/children", title: "Мои дети", component: ParentChildrenPage },
  { path: "/parent/schedule", title: "Расписание", component: ParentSchedulePage },
  { path: "/parent/grades", title: "Оценки", component: ParentGradesPage },
  { path: "/parent/journal", title: "Журнал", component: ParentJournalPage },
  { path: "/parent/assignments", title: "Задания", component: ParentAssignmentsPage },
  { path: "/parent/chat", title: "Чат", component: ParentChatPage },
  { path: "/parent/news", title: "Новости", component: ParentNewsPage },
  { path: "/parent/friends", title: "Друзья", component: ParentFriendsPage },
  { path: "/parent/profile", title: "Профиль", component: ParentProfilePage },
  { path: "/parent/settings", title: "Настройки", component: ParentSettingsPage },
];

export default function ParentPage() {
  const { pathname } = useLocation();
  const section = useMemo(() => resolveDashboardSection(pathname, sections, defaultSection), [pathname]);
  const SectionComponent = section.component;

  return (
    <DashboardLayout title={section.title} menu={parentMenu}>
      <SectionComponent />
    </DashboardLayout>
  );
}
