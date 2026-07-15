import { useState } from 'react';
import { api, ApiError } from '../api';
import type { AppConfig, User } from '../types';
import { SUPPORT_TELEGRAM, SUPPORT_TELEGRAM_URL } from '../support';

export function AuthScreen({ config, onLogin }: { config: AppConfig | null; onLogin: (u: User) => void }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { user } = await api.login(email);
      onLogin(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось войти');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card card">
        <div className="logo">
          <span className="logo-mark">✦</span> Pick<span className="logo-grad">Gen</span>
        </div>
        <p>Генерация изображений по описанию на любом языке</p>
        <form onSubmit={submit}>
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
            {busy ? 'Входим…' : 'Войти / Зарегистрироваться'}
          </button>
        </form>
        {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
        {config && (
          <p style={{ fontSize: 12, marginTop: 16 }}>
            Новым пользователям — {config.freeSignupCredits} бесплатных кредитов и{' '}
            {config.freeDailyDrafts} черновиков в день.
          </p>
        )}
        <p style={{ fontSize: 12, marginTop: 12 }}>
          Поддержка:{' '}
          <a href={SUPPORT_TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
            Telegram @{SUPPORT_TELEGRAM}
          </a>
        </p>
      </div>
    </div>
  );
}
