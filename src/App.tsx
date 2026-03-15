import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useNotifications } from './hooks/useNotifications';
import Loading from './components/Loading';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import AddBoleto from './pages/AddBoleto';
import EditBoleto from './pages/EditBoleto';
import BoletoDetails from './pages/BoletoDetails';
import MonthlyReport from './pages/MonthlyReport';
import './App.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading fullScreen />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  useNotifications();

  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/scanner" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
      <Route path="/boleto/novo" element={<ProtectedRoute><AddBoleto /></ProtectedRoute>} />
      <Route path="/boleto/editar/:id" element={<ProtectedRoute><EditBoleto /></ProtectedRoute>} />
      <Route path="/boleto/:id" element={<ProtectedRoute><BoletoDetails /></ProtectedRoute>} />
      <Route path="/resumo" element={<ProtectedRoute><MonthlyReport /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import InstallPrompt from './components/InstallPrompt';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <InstallPrompt />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
