import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TasksPage from './pages/TasksPage';

export default function App() {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState('login');

  if (isAuthenticated) {
    return <TasksPage />;
  }

  if (view === 'register') {
    return <RegisterPage onSwitchToLogin={() => setView('login')} />;
  }

  return <LoginPage onSwitch={() => setView('register')} />;
}
