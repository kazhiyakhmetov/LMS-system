import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "../DashboardLayout";
import { parentMenu } from "./parentMenu";
import ParentHomePage from "./pages/ParentHomePage";
import ParentSchedulePage from "./pages/ParentSchedulePage";
import ParentChatPage from "./pages/ParentChatPage";
import ParentGradesPage from "./pages/ParentGradesPage";
import { resolveDashboardSection } from "../shared/resolveDashboardSection";

const defaultSection = {
  title: "Главная",
  component: ParentHomePage,
};

const sections = [
  { path: "/parent/schedule", title: "Расписание", component: ParentSchedulePage },
  { path: "/parent/chat", title: "Чат", component: ParentChatPage },
  { path: "/parent/grades", title: "Оценки", component: ParentGradesPage },
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
