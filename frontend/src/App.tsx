import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider }   from "@/context/AuthContext";
import ProtectedRoute     from "@/components/ProtectedRoute";
import Layout             from "@/components/Layout";
import Login              from "@/pages/Login";
import Dashboard          from "@/pages/Dashboard";
import StudentList        from "@/pages/students/StudentList";
import UserManagement     from "@/pages/users/UserManagement";
import Profile            from "@/pages/Profile";
import EnrollmentPage     from "@/pages/enrollment/EnrollmentPage";
import AttendancePage     from "@/pages/attendance/AttendancePage";
import SectionListPage    from "@/pages/sections/SectionListPage";
import SectionDetailPage  from "@/pages/sections/SectionDetailPage";
import GradingSheetPage   from "@/pages/grading/GradingSheetPage";
import StudentSF9Page     from "@/pages/grading/StudentSF9Page";
import SchoolFormsHubPage from "@/pages/school-forms/SchoolFormsHubPage";

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
              <Route path="/students"     element={<StudentList />} />
              <Route path="/sections"     element={<SectionListPage />} />
              <Route path="/sections/:id" element={<SectionDetailPage />} />
              <Route path="/attendance"   element={<AttendancePage />} />
              <Route path="/grading"      element={<GradingSheetPage />} />
              <Route path="/sf9"          element={<StudentSF9Page />} />
              <Route path="/school-forms" element={<SchoolFormsHubPage />} />
              <Route path="/profile"      element={<Profile />} />

              {/* Admin / Registrar only */}
              <Route element={<ProtectedRoute allowedRoles={["super_admin", "registrar"]} />}>
                <Route path="/enrollments" element={<EnrollmentPage />} />
                <Route path="/users"       element={<UserManagement />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
