import LoginPage from "../pages/Login/LoginPage";

import ProtectedRoute from "../shared/lib/auth/ProtectedRoute";
import RoleRoute from "../shared/lib/auth/RoleRoute";

import AdminPage from "../pages/Dashboard/AdminDash/AdminPage";
import TeacherPage from "../pages/Dashboard/TeacherDash/TeacherPage";
import ParentPage from "../pages/Dashboard/ParentDash/ParentPage";
import StudentPage from "../pages/Dashboard/StudentDash/StudentPage";

export const routes = [
  { path: "/", element: <LoginPage /> },

  {
    path: "/admin/*",
    element: (
      <ProtectedRoute>
        <RoleRoute allow={["ADMIN"]}>
          <AdminPage />
        </RoleRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/teacher/*",
    element: (
      <ProtectedRoute>
        <RoleRoute allow={["TEACHER"]}>
          <TeacherPage />
        </RoleRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/parent/*",
    element: (
      <ProtectedRoute>
        <RoleRoute allow={["PARENT"]}>
          <ParentPage />
        </RoleRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/student/*",
    element: (
      <ProtectedRoute>
        <RoleRoute allow={["STUDENT"]}>
          <StudentPage />
        </RoleRoute>
      </ProtectedRoute>
    ),
  },
];
