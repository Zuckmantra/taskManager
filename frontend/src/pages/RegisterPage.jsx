import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage({ onSwitchToLogin }) {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await register(username, email, password);
      setSuccess('Cuenta creada exitosamente. Ahora puedes iniciar sesión.');
      setUsername('');
      setEmail('');
      setPassword('');
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
          <div className="auth-logo">🚀</div>
          <p className="eyebrow">Task Manager</p>
          <h1>Crea tu cuenta</h1>
          <p className="subtext">Comienza a organizar tu trabajo diario</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="reg-username" className="form-label">
              <span className="label-icon">👤</span>
              Nombre de usuario
            </label>
            <input
              id="reg-username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Tu nombre"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">
              <span className="label-icon">📧</span>
              Correo electrónico
            </label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@email.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-password" className="form-label">
              <span className="label-icon">🔒</span>
              Contraseña
            </label>
            <input
              id="reg-password"
              type="password"
              value={password}
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                Creando cuenta...
              </>
            ) : (
              <>
                Crear mi cuenta
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

        {success && (
          <div className="success-alert">
            <span className="alert-icon">✅</span>
            <span>{success}</span>
          </div>
        )}

        <div className="auth-footer">
          <p className="auth-switch">
            ¿Ya tienes cuenta?{' '}
            <button className="link-btn" type="button" onClick={onSwitchToLogin}>
              Inicia sesión
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
