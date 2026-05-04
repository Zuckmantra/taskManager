import { useState } from 'react';
import { api } from '../api/client';

export default function ForgotPasswordPage({ onBack }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await api.forgotPassword(email);
      setMessage(res.message || 'Si el email existe, se enviaron las instrucciones de recuperación.');
    } catch (err) {
      setMessage(err.message || 'Error al enviar las instrucciones');
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
          <div className="auth-logo">🔑</div>
          <p className="eyebrow">Recuperación</p>
          <h1>¿Olvidaste tu contraseña?</h1>
          <p className="subtext">Ingresa tu correo y te enviaremos instrucciones para recuperarla.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="forgot-email" className="form-label">
              <span className="label-icon">📧</span>
              Correo electrónico
            </label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              autoComplete="email"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                Enviando instrucciones...
              </>
            ) : (
              <>
                Enviar instrucciones
                <span className="btn-arrow">→</span>
              </>
            )}
          </button>
        </form>

        {message && (
          <div className="success-alert">
            <span className="alert-icon">📨</span>
            <span>{message}</span>
          </div>
        )}

        <div className="auth-footer">
          <button className="auth-link-btn" type="button" onClick={onBack}>
            ← Volver al inicio
          </button>
        </div>
      </section>
    </main>
  );
}
