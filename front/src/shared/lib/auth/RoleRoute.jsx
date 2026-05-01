import { Navigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { roleToPath } from "./roleRedirect";

export default function RoleRoute({ allow = [], children }) {
  const { user, isAuthed, ready } = useAuth();

  if (!ready) return null;
  if (!isAuthed) return <Navigate to="/" replace />;

  const role = user?.role;
  if (!role) return <Navigate to="/" replace />;

  if (allow.length && !allow.includes(role)) {
    return <Navigate to={roleToPath(role)} replace />;
  }

  return children;
}
