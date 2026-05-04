import { useState } from 'react';
import { api } from '../api/client';

export default function ResetPasswordPage({ initialToken = '', onBackToLogin }) {
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const tokenFromUrl = !!initialToken;

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');

    if (password !== confirmPassword) {
      setMessage('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setMessage('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword(token, password);
      setSuccess(true);
      setMessage(res.message || 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión.');
    } catch (err) {
      setMessage(err.message || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="auth-shell">
        <div className="auth-background">
          <div className="auth-shape shape-1"></div>
          <div className="auth-shape shape-2"></div>
          <div className="auth-shape shape-3"></div>
        </div>

        <section className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">🎉</div>
            <p className="eyebrow">Éxito</p>
            <h1>Contraseña actualizada</h1>
            <p className="subtext">Tu contraseña ha sido restablecida correctamente.</p>
          </div>

          <div className="success-banner">
            <span className="banner-icon">✅</span>
            <p>Ya puedes iniciar sesión con tu nueva contraseña.</p>
          </div>

          <div className="auth-footer">
            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={onBackToLogin}
            >
              Ir a iniciar sesión
              <span className="btn-arrow">→</span>
            </button>
          </div>
        </section>
      </main>
    );
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
          <div className="auth-logo">🔐</div>
          <p className="eyebrow">Recuperación</p>
          <h1>Restablecer contraseña</h1>
          <p className="subtext">
            {tokenFromUrl
              ? 'Ingresa tu nueva contraseña para completar el proceso.'
              : 'Ingresa el token recibido y tu nueva contraseña.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!tokenFromUrl && (
            <div className="form-group">
              <label htmlFor="reset-token" className="form-label">
                <span className="label-icon">🎫</span>
                Token de recuperación
              </label>
              <input
                id="reset-token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Pega aquí el token"
                required
                autoComplete="off"
              />
            </div>
          )}

          {tokenFromUrl && (
            <div className="token-verified">
              <span className="verified-icon">✓</span>
              <span>Token verificado del enlace</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="reset-password" className="form-label">
              <span className="label-icon">🔒</span>
              Nueva contraseña
            </label>
            <input
              id="reset-password"
              type="password"
              value={password}
              minLength={6}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="reset-confirm" className="form-label">
              <span className="label-icon">🔒</span>
              Confirmar contraseña
            </label>
            <input
              id="reset-confirm"
              type="password"
              value={confirmPassword}
              minLength={6}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu contraseña"
              required
              autoComplete="new-password"
            />
          </div>

          {password && confirmPassword && password !== confirmPassword && (
            <div className="password-mismatch">
              <span>⚠️</span> Las contraseñas no coinciden
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                Restableciendo...
              </>
            ) : (
              <>
                Restablecer contraseña
                <span className="btn-arrow">→</span>
              </>
            )}
          </button>
        </form>

        {message && !success && (
          <div className="error-alert">
            <span className="alert-icon">⚠️</span>
            <span>{message}</span>
          </div>
        )}

        <div className="auth-footer">
          <button className="auth-link-btn" type="button" onClick={onBackToLogin}>
            ← Volver al inicio
          </button>
        </div>
      </section>
    </main>
  );
}
