import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/admin/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
}