import { Navigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthed, ready } = useAuth();
  if (!ready) return null;
  if (!isAuthed) return <Navigate to="/" replace />;
  return children;
}
