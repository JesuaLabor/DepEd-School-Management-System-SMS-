import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout        from "@/components/Layout";
import Login         from "@/pages/Login";
import Dashboard     from "@/pages/Dashboard";
import StudentList   from "@/pages/students/StudentList";
import UserManagement from "@/pages/users/UserManagement";
import Profile       from "@/pages/Profile";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected — any authenticated user */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="/students" element={<StudentList />} />
              <Route path="/profile"  element={<Profile />} />

              {/* Admin-only */}
              <Route element={<ProtectedRoute allowedRoles={["super_admin", "registrar"]} />}>
                <Route path="/users" element={<UserManagement />} />
              </Route>
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
