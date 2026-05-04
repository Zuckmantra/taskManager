import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import TasksPage from './pages/TasksPage';

export default function App() {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState('login');
  const [resetToken, setResetToken] = useState('');

  // Detectar token de reset en URL al cargar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    const urlReset = params.get('reset');
    const token = urlToken || urlReset;

    if (token) {
      setResetToken(token);
      setView('reset');
      // Limpiar URL sin recargar
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  if (isAuthenticated) {
    return <TasksPage />;
  }

  if (view === 'register') {
    return <RegisterPage onSwitchToLogin={() => setView('login')} />;
  }

  if (view === 'forgot') {
    return (
      <ForgotPasswordPage
        onBack={() => setView('login')}
        onGoReset={(token) => { setResetToken(token); setView('reset'); }}
      />
    );
  }

  if (view === 'reset') {
    return (
      <ResetPasswordPage
        initialToken={resetToken}
        onBackToLogin={() => { setResetToken(''); setView('login'); }}
      />
    );
  }

  return (
    <LoginPage
      onSwitch={() => setView('register')}
      onForgot={() => setView('forgot')}
    />
  );
}
