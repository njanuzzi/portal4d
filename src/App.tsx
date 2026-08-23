import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TherapistLayout } from './components/layout/TherapistLayout';
import { ClientLayout } from './components/layout/ClientLayout';
import { PageSpinner } from './components/ui/Spinner';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/therapist/Dashboard';
import { Clients } from './pages/therapist/Clients';
import { NewClient } from './pages/therapist/NewClient';
import { ClientDetail } from './pages/therapist/ClientDetail';
import { ClientEntries } from './pages/therapist/ClientEntries';
import { ClientReports } from './pages/therapist/ClientReports';
import { NewReport } from './pages/therapist/NewReport';
import { EditReport } from './pages/therapist/EditReport';
import { Diaries } from './pages/therapist/Diaries';
import { NewDiary } from './pages/therapist/NewDiary';
import { DiaryDetail } from './pages/therapist/DiaryDetail';
import { Reports } from './pages/therapist/Reports';
import { ReportsByClient } from './pages/therapist/ReportsByClient';
import { ClientSchemaAnalysis } from './pages/therapist/ClientSchemaAnalysis';
import { SchemaReportDetail } from './pages/therapist/SchemaReportDetail';
import { ClientFacingReportPreview } from './pages/therapist/ClientFacingReportPreview';
import { ClientAccess } from './pages/client/ClientAccess';
import { ClientDiaryForm } from './pages/client/ClientDiaryForm';
import { ClientHome } from './pages/client/ClientHome';
import { DiaryPage } from './pages/client/DiaryPage';
import { DiaryHistory } from './pages/client/DiaryHistory';
import { ClientReports as ClientReportsPage } from './pages/client/ClientReports';
import { ChangePassword } from './pages/client/ChangePassword';
import { ResetPassword } from './pages/ResetPassword';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { Scheduling } from './pages/therapist/Scheduling';
import { MarketingHome } from './pages/MarketingHome';
import { Protocolo4D } from './pages/Protocolo4D';

function AppRoutes() {
  const location = useLocation();
  const { user, profile, loading } = useAuth();
  const isClientTokenRoute = /^\/client\/[^/]+(\/diary)?\/?$/.test(location.pathname);

  // Reset password route is always public
  if (location.pathname === '/reset-password') {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    );
  }

  // Privacy policy is always public
  if (location.pathname === '/privacy') {
    return (
      <Routes>
        <Route path="/privacy" element={<PrivacyPolicy />} />
      </Routes>
    );
  }

  // Protocolo 4D explainer is always public
  if (location.pathname === '/protocolo4d') {
    return (
      <Routes>
        <Route path="/protocolo4d" element={<Protocolo4D />} />
      </Routes>
    );
  }

  if (isClientTokenRoute) {
    return (
      <Routes>
        <Route path="/client/:token" element={<ClientAccess />} />
        <Route path="/client/:token/diary" element={<ClientDiaryForm />} />
        <Route path="*" element={<Navigate to="/areamembros" replace />} />
      </Routes>
    );
  }

  if (loading) return <PageSpinner />;

  // Not logged in
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<MarketingHome />} />
        <Route path="/areamembros" element={<Login />} />
        {/* Old path, kept working in case it's already bookmarked/shared */}
        <Route path="/login" element={<Navigate to="/areamembros" replace />} />
        <Route path="*" element={<Navigate to="/areamembros" replace />} />
      </Routes>
    );
  }

  // Logged in but profile not loaded yet
  if (!profile) return <PageSpinner />;

  // Therapist routes
  if (profile.role === 'therapist') {
    return (
      <TherapistLayout>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/new" element={<NewClient />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route path="/clients/:id/entries" element={<ClientEntries />} />
          <Route path="/clients/:id/reports" element={<ClientReports />} />
          <Route path="/clients/:id/report/new" element={<NewReport />} />
          <Route path="/clients/:id/schema-analysis" element={<ClientSchemaAnalysis />} />
          <Route path="/clients/:id/schema-analysis/report/:reportId" element={<SchemaReportDetail />} />
          <Route path="/clients/:id/schema-analysis/report/:reportId/cliente" element={<ClientFacingReportPreview />} />
          <Route path="/diaries" element={<Diaries />} />
          <Route path="/diaries/new" element={<NewDiary />} />
          <Route path="/diaries/:id" element={<DiaryDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/:clientId" element={<ReportsByClient />} />
          <Route path="/reports/:clientId/new" element={<NewReport />} />
          <Route path="/reports/:clientId/edit/:reportId" element={<EditReport />} />
          <Route path="/scheduling" element={<Scheduling />} />
          <Route path="/areamembros" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </TherapistLayout>
    );
  }

  // Client routes
  if (profile.role === 'client') {
    return (
      <ClientLayout>
        <Routes>
          <Route path="/home" element={<ClientHome />} />
          <Route path="/diary" element={<DiaryPage />} />
          <Route path="/diary/history" element={<DiaryHistory />} />
          <Route path="/reports" element={<ClientReportsPage />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/areamembros" element={<Navigate to="/home" replace />} />
          <Route path="/login" element={<Navigate to="/home" replace />} />
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </ClientLayout>
    );
  }

  // Unknown role
  return (
    <Routes>
      <Route path="*" element={<Navigate to="/areamembros" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
