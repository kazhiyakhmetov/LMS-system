import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "../DashboardLayout";
import { adminMenu } from "./adminMenu";
import AdminStatsView from "./pages/AdminStatsView";
import AdminUsersView from "./pages/AdminUsersView";
import AdminRegistrationView from "./pages/AdminRegistrationView";
import AdminClassesView from "./pages/AdminClassesView";
import AdminTeachingView from "./pages/AdminTeachingView";
import AdminScheduleView from "./pages/AdminScheduleView";
import AdminSurveyView from "./pages/AdminSurveyView";
import AdminNewsView from "./pages/AdminNewsView";
import AdminBannersView from "./pages/AdminBannersView";
import AdminGradeFormulaView from "./pages/AdminGradeFormulaView";
import AdminSettingsView from "./pages/AdminSettingsView";
import { resolveDashboardSection } from "../shared/resolveDashboardSection";

const defaultSection = {
  title: "Админ-панель",
  component: AdminStatsView,
};

const sections = [
  { path: "/admin/users", title: "Пользователи", component: AdminUsersView },
  { path: "/admin/registration", title: "Регистрация", component: AdminRegistrationView },
  { path: "/admin/classes", title: "Классы", component: AdminClassesView },
  { path: "/admin/teaching", title: "Назначения учителей", component: AdminTeachingView },
  { path: "/admin/schedule", title: "Расписание", component: AdminScheduleView },
  { path: "/admin/surveys", title: "Опросы", component: AdminSurveyView },
  { path: "/admin/news", title: "Новости", component: AdminNewsView },
  { path: "/admin/banners", title: "Уведомления", component: AdminBannersView },
  { path: "/admin/grade-formula", title: "Формула оценок", component: AdminGradeFormulaView },
  { path: "/admin/settings", title: "Настройки", component: AdminSettingsView },
];

export default function AdminPage() {
  const { pathname } = useLocation();
  const section = useMemo(() => resolveDashboardSection(pathname, sections, defaultSection), [pathname]);
  const SectionComponent = section.component;

  return (
    <DashboardLayout title={section.title} menu={adminMenu} showBanners={false}>
      <SectionComponent />
    </DashboardLayout>
  );
}
