import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../features/auth/model/AuthProvider'
import { AcademyProvider } from '../entities/academy/model/AcademyProvider'
import { useAcademy } from '../entities/academy/model/useAcademy'
import { useAuth } from '../features/auth/model/useAuth'
import { AppLayout } from './layout/AppLayout'
import { AcademyLayout } from './layout/AcademyLayout'
import { useI18n } from '../shared/i18n/useI18n'

const HomePage = lazy(() => import('../pages/home/HomePage').then((module) => ({ default: module.HomePage })))
const LoginPage = lazy(() => import('../pages/login/LoginPage').then((module) => ({ default: module.LoginPage })))
const ForgotPasswordPage = lazy(() => import('../pages/forgot-password/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('../pages/reset-password/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })))
const RegisterPage = lazy(() => import('../pages/register/RegisterPage').then((module) => ({ default: module.RegisterPage })))
const VerifyEmailPage = lazy(() => import('../pages/verify-email/VerifyEmailPage').then((module) => ({ default: module.VerifyEmailPage })))
const AcceptInvitationPage = lazy(() => import('../pages/accept-invitation/AcceptInvitationPage').then((module) => ({ default: module.AcceptInvitationPage })))
const ApplicationPage = lazy(() => import('../pages/application/ApplicationPage').then((module) => ({ default: module.ApplicationPage })))
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const ParentPage = lazy(() => import('../pages/parent/ParentPage').then((module) => ({ default: module.ParentPage })))
const PlatformApplicationsPage = lazy(() => import('../pages/platform-applications/PlatformApplicationsPage').then((module) => ({ default: module.PlatformApplicationsPage })))
const PlatformAcademiesPage = lazy(() => import('../pages/platform-academies/PlatformAcademiesPage').then((module) => ({ default: module.PlatformAcademiesPage })))
const PlatformAcademyPage = lazy(() => import('../pages/platform-academy/PlatformAcademyPage').then((module) => ({ default: module.PlatformAcademyPage })))
const AcademyOverviewPage = lazy(() => import('../pages/academy-overview/AcademyOverviewPage').then((module) => ({ default: module.AcademyOverviewPage })))
const GroupsPage = lazy(() => import('../pages/groups/GroupsPage').then((module) => ({ default: module.GroupsPage })))
const PlayersPage = lazy(() => import('../pages/players/PlayersPage').then((module) => ({ default: module.PlayersPage })))
const PlayerProfilePage = lazy(() => import('../pages/player-profile/PlayerProfilePage').then((module) => ({ default: module.PlayerProfilePage })))
const AttendancePage = lazy(() => import('../pages/attendance/AttendancePage').then((module) => ({ default: module.AttendancePage })))
const SchedulePage = lazy(() => import('../pages/schedule/SchedulePage').then((module) => ({ default: module.SchedulePage })))
const DevelopmentPage = lazy(() => import('../pages/development/DevelopmentPage').then((module) => ({ default: module.DevelopmentPage })))
const MembersPage = lazy(() => import('../pages/members/MembersPage').then((module) => ({ default: module.MembersPage })))
const InvitationsPage = lazy(() => import('../pages/invitations/InvitationsPage').then((module) => ({ default: module.InvitationsPage })))
const NotFoundPage = lazy(() => import('../pages/not-found/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const { t } = useI18n()

  if (loading) {
    return <div className="page-loader">{t('app.loadingProfile')}</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { account, isAuthenticated, loading } = useAuth()
  const { t } = useI18n()

  if (loading) {
    return <div className="page-loader">{t('app.checkingAccess')}</div>
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
  const { academy, academyPath } = useAcademy()
  if (!academy.roles.includes('ADMIN')) {
    return <Navigate to={academyPath('attendance')} replace />
  }
  return children
}

function AcademyEntryRoute() {
  const { academies, loading } = useAuth()
  const { t } = useI18n()
  if (loading) return <div className="page-loader">{t('app.openingAcademy')}</div>
  const academy = academies.find((item) => item.roles.includes('ADMIN') || item.roles.includes('COACH'))
  return academy ? <Navigate to={`/academy/${academy.academyId}`} replace /> : <Navigate to="/dashboard" replace />
}

function App() {
  const { t } = useI18n()
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div className="page-loader">{t('common.loading')}</div>}><Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
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
            <Route path="platform/academies" element={<SuperAdminRoute><PlatformAcademiesPage /></SuperAdminRoute>} />
            <Route path="platform/academies/:academyId" element={<SuperAdminRoute><PlatformAcademyPage /></SuperAdminRoute>} />
            <Route
              path="academy"
              element={<ProtectedRoute><AcademyEntryRoute /></ProtectedRoute>}
            />
            <Route
              path="academy/:academyId"
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
              <Route path="players/:playerId" element={<PlayerProfilePage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="development" element={<DevelopmentPage />} />
              <Route path="members" element={<AcademyAdminRoute><MembersPage /></AcademyAdminRoute>} />
              <Route path="invitations" element={<AcademyAdminRoute><InvitationsPage /></AcademyAdminRoute>} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes></Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
