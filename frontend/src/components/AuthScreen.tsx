import { useState } from 'react';
import { api, ApiError } from '../api';
import type { AppConfig, User } from '../types';
import { SUPPORT_TELEGRAM, SUPPORT_TELEGRAM_URL } from '../support';
import { useLang } from '../i18n';

export function AuthScreen({ config, onLogin }: { config: AppConfig | null; onLogin: (u: User) => void }) {
  const { t, lang, setLang } = useLang();
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
      setError(err instanceof ApiError ? err.message : t('auth.error'));
    } finally {
      setBusy(false);
    }
  }

  const drafts = config?.freeDailyDrafts ?? 0;

  return (
    <div className="auth-wrap">
      <div className="auth-card card">
        <button
          className="icon-btn"
          style={{ position: 'absolute', top: 16, right: 16 }}
          onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
          title={t('header.lang')}
        >
          {lang === 'ru' ? 'EN' : 'RU'}
        </button>
        <div className="logo">
          <span className="logo-mark">✦</span> Pick<span className="logo-grad">Gen</span>
        </div>
        <p>{t('auth.tagline')}</p>
        <form onSubmit={submit}>
          <input
            type="email"
            placeholder={t('auth.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
            {busy ? t('auth.submitting') : t('auth.submit')}
          </button>
        </form>
        {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
        {config && (
          <p style={{ fontSize: 12, marginTop: 16 }}>
            {drafts === 0 ? (
              t('auth.freePaid')
            ) : (
              <>
                {t(drafts === 1 ? 'auth.freeDrafts' : 'auth.freeDraftsPlural', { n: drafts })}
                {config.freeSignupCredits > 0
                  ? t('auth.freeCredits', { n: config.freeSignupCredits })
                  : t('auth.freeMore')}
              </>
            )}
          </p>
        )}
        <p style={{ fontSize: 12, marginTop: 12 }}>
          {t('auth.support')}{' '}
          <a href={SUPPORT_TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
            Telegram @{SUPPORT_TELEGRAM}
          </a>
        </p>
      </div>
    </div>
  );
}
