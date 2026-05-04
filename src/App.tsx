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
import { Diaries } from './pages/therapist/Diaries';
import { NewDiary } from './pages/therapist/NewDiary';
import { DiaryDetail } from './pages/therapist/DiaryDetail';
import { Reports } from './pages/therapist/Reports';
import { ClientAccess } from './pages/client/ClientAccess';
import { DiaryPage } from './pages/client/DiaryPage';
import { DiaryHistory } from './pages/client/DiaryHistory';
import { ClientReports as ClientReportsPage } from './pages/client/ClientReports';

function AppRoutes() {
  const location = useLocation();
  const { user, profile, loading } = useAuth();
  const isClientTokenRoute = /^\/client\/[^/]+\/?$/.test(location.pathname);

  if (isClientTokenRoute) {
    return (
      <Routes>
        <Route path="/client/:token" element={<ClientAccess />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (loading) return <PageSpinner />;

  // Not logged in
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
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
          <Route path="/diaries" element={<Diaries />} />
          <Route path="/diaries/new" element={<NewDiary />} />
          <Route path="/diaries/:id" element={<DiaryDetail />} />
          <Route path="/reports" element={<Reports />} />
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
          <Route path="/diary" element={<DiaryPage />} />
          <Route path="/diary/history" element={<DiaryHistory />} />
          <Route path="/reports" element={<ClientReportsPage />} />
          <Route path="/login" element={<Navigate to="/diary" replace />} />
          <Route path="/" element={<Navigate to="/diary" replace />} />
          <Route path="*" element={<Navigate to="/diary" replace />} />
        </Routes>
      </ClientLayout>
    );
  }

  // Unknown role
  return (
    <Routes>
      <Route path="*" element={<Navigate to="/login" replace />} />
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
