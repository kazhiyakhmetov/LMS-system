import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "../DashboardLayout";
import { adminMenu } from "./adminMenu";
import AdminStatsView from "./pages/AdminStatsView";
import AdminUsersView from "./pages/AdminUsersView";
import AdminRegistrationView from "./pages/AdminRegistrationView";
import AdminScheduleView from "./pages/AdminScheduleView";
import AdminSurveyView from "./pages/AdminSurveyView";
import { resolveDashboardSection } from "../shared/resolveDashboardSection";

const defaultSection = {
  title: "Админ-панель",
  component: AdminStatsView,
};

const sections = [
  {
    path: "/admin/users",
    title: "Списки пользователей",
    component: AdminUsersView,
  },
  {
    path: "/admin/registration",
    title: "Регистрация пользователей",
    component: AdminRegistrationView,
  },
  {
    path: "/admin/schedule",
    title: "Расписание",
    component: AdminScheduleView,
  },
  {
    path: "/admin/surveys",
    title: "Опросы",
    component: AdminSurveyView,
  },
];

export default function AdminPage() {
  const { pathname } = useLocation();
  const section = useMemo(() => resolveDashboardSection(pathname, sections, defaultSection), [pathname]);
  const SectionComponent = section.component;

  return (
    <DashboardLayout title={section.title} menu={adminMenu}>
      <SectionComponent />
    </DashboardLayout>
  );
}
