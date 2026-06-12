'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';
import styles from './page.module.css';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { access_token, admin } = await login(email, password);
      localStorage.setItem('av_token', access_token);
      localStorage.setItem('av_admin', JSON.stringify(admin));
      router.push('/admin/dashboard');
    } catch {
      setError('Credenciais inválidas. Verifique e-mail e senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandName}>André Valença</span>
          <span className={styles.brandSub}>Painel Administrativo</span>
        </div>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              id="admin-email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              id="admin-password"
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }} id="admin-login-btn">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className={styles.hint}>admin@andrevendas.com / admin123</p>
      </div>
    </div>
  );
}
