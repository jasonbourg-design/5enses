import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

export default function AuthPage({ mode = 'login' }) {
  const [isLogin, setIsLogin] = useState(mode === 'login');
  const [form, setForm] = useState({ username: '', email: '', password: '', display_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    let result;
    if (isLogin) {
      result = await login(form.email, form.password);
    } else {
      result = await register(form.username, form.email, form.password, form.display_name);
    }
    setLoading(false);
    if (result.success) navigate('/home');
    else setError(result.error);
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
      </div>

      <div className="auth-container">
        <div className="auth-logo">
          <div className="logo-mark">5</div>
          <div className="logo-text">
            <span className="logo-title">5enses</span>
            <span className="logo-sub">Experience everything</span>
          </div>
        </div>

        <div className="auth-card card">
          <div className="auth-tabs">
            <button className={`auth-tab ${isLogin ? 'active' : ''}`} onClick={() => setIsLogin(true)}>Sign In</button>
            <button className={`auth-tab ${!isLogin ? 'active' : ''}`} onClick={() => setIsLogin(false)}>Join</button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <>
                <div className="field-group">
                  <label>Display Name</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Your name"
                    value={form.display_name}
                    onChange={e => update('display_name', e.target.value)}
                    required={!isLogin}
                  />
                </div>
                <div className="field-group">
                  <label>Username</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="@username"
                    value={form.username}
                    onChange={e => update('username', e.target.value)}
                    required={!isLogin}
                    minLength={3}
                  />
                </div>
              </>
            )}
            <div className="field-group">
              <label>Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                required
              />
            </div>
            <div className="field-group">
              <label>Password</label>
              <input
                className="input"
                type="password"
                placeholder={isLogin ? 'Your password' : 'At least 8 characters'}
                value={form.password}
                onChange={e => update('password', e.target.value)}
                required
                minLength={isLogin ? 1 : 8}
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading
                ? <span className="spinner" style={{ width: 20, height: 20 }} />
                : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="auth-senses-hint">
            <p>Rate places through sight, sound, smell, taste & touch 🎯</p>
          </div>
        </div>
      </div>
    </div>
  );
}
