import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../features/auth/model/AuthProvider'
import { AcademyProvider } from '../entities/academy/model/AcademyProvider'
import { useAcademy } from '../entities/academy/model/useAcademy'
import { useAuth } from '../features/auth/model/useAuth'
import { ApplicationPage } from '../pages/application/ApplicationPage'
import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { HomePage } from '../pages/home/HomePage'
import { LoginPage } from '../pages/login/LoginPage'
import { NotFoundPage } from '../pages/not-found/NotFoundPage'
import { PlatformApplicationsPage } from '../pages/platform-applications/PlatformApplicationsPage'
import { RegisterPage } from '../pages/register/RegisterPage'
import { VerifyEmailPage } from '../pages/verify-email/VerifyEmailPage'
import { AppLayout } from './layout/AppLayout'
import { AcademyLayout } from './layout/AcademyLayout'
import { AcademyOverviewPage } from '../pages/academy-overview/AcademyOverviewPage'
import { GroupsPage } from '../pages/groups/GroupsPage'
import { PlayersPage } from '../pages/players/PlayersPage'
import { InvitationsPage } from '../pages/invitations/InvitationsPage'
import { AcceptInvitationPage } from '../pages/accept-invitation/AcceptInvitationPage'
import { AttendancePage } from '../pages/attendance/AttendancePage'
import { ParentPage } from '../pages/parent/ParentPage'
import { DevelopmentPage } from '../pages/development/DevelopmentPage'
import { SchedulePage } from '../pages/schedule/SchedulePage'
import { MembersPage } from '../pages/members/MembersPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <div className="page-loader">Загружаем ваш профиль…</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { account, isAuthenticated, loading } = useAuth()

  if (loading) {
    return <div className="page-loader">Проверяем права доступа…</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (account?.platformRole !== 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function AcademyAdminRoute({ children }: { children: React.ReactNode }) {
  const { academy } = useAcademy()
  if (!academy.roles.includes('ADMIN')) {
    return <Navigate to="/academy/attendance" replace />
  }
  return children
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="verify-email" element={<VerifyEmailPage />} />
            <Route path="accept-invitation" element={<AcceptInvitationPage />} />
            <Route
              path="application"
              element={
                <ProtectedRoute>
                  <ApplicationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="parent"
              element={
                <ProtectedRoute>
                  <ParentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="platform/applications"
              element={
                <SuperAdminRoute>
                  <PlatformApplicationsPage />
                </SuperAdminRoute>
              }
            />
            <Route
              path="academy"
              element={
                <ProtectedRoute>
                  <AcademyProvider>
                    <AcademyLayout />
                  </AcademyProvider>
                </ProtectedRoute>
              }
            >
              <Route index element={<AcademyOverviewPage />} />
              <Route path="groups" element={<GroupsPage />} />
              <Route path="players" element={<PlayersPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="development" element={<DevelopmentPage />} />
              <Route path="members" element={<AcademyAdminRoute><MembersPage /></AcademyAdminRoute>} />
              <Route path="invitations" element={<AcademyAdminRoute><InvitationsPage /></AcademyAdminRoute>} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
