import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage({ onSwitch, onForgot }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-background">
        <div className="auth-shape shape-1"></div>
        <div className="auth-shape shape-2"></div>
        <div className="auth-shape shape-3"></div>
      </div>

      <section className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">📋</div>
          <p className="eyebrow">Task Manager</p>
          <h1>Bienvenido de nuevo</h1>
          <p className="subtext">Inicia sesión para gestionar tus tareas</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">
              <span className="label-icon">📧</span>
              Correo electrónico
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@email.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password" className="form-label">
              <span className="label-icon">🔒</span>
              Contraseña
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                Entrando...
              </>
            ) : (
              <>
                Iniciar sesión
                <span className="btn-arrow">→</span>
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="error-alert">
            <span className="alert-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="auth-footer">
          <button className="auth-link-btn" type="button" onClick={onForgot}>
            ¿Olvidaste tu contraseña?
          </button>
          <p className="auth-switch">
            ¿No tienes cuenta?{' '}
            <button className="link-btn" type="button" onClick={onSwitch}>
              Regístrate gratis
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
