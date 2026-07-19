import { useState } from 'react';
import { api, ApiError } from '../api';
import type { AppConfig, User } from '../types';
import { SUPPORT_TELEGRAM, SUPPORT_TELEGRAM_URL } from '../support';
import { useLang } from '../i18n';

const HERO_IMAGES = ['cyberpunk', 'lion', 'coffee-shop', 'astronaut-cat', 'fox-watercolor', 'castle'];
const USE_CASES = ['marketing', 'design', 'art', 'content', 'business', 'other'];

export function AuthScreen({ config, onLogin }: { config: AppConfig | null; onLogin: (u: User) => void }) {
  const { t, lang, setLang } = useLang();
  const [step, setStep] = useState<'email' | 'profile'>('email');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [useCase, setUseCase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api.login({ email });
      if (res.user) onLogin(res.user);
      else if (res.needsProfile) setStep('profile');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.error'));
    } finally {
      setBusy(false);
    }
  }

  async function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api.login({ email, firstName, lastName, username, useCase });
      if (res.user) onLogin(res.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('auth.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="onboard">
      {/* ── Left: hero ── */}
      <div className="onboard-hero">
        <div className="onboard-hero-collage">
          {HERO_IMAGES.map((n) => (
            <img key={n} src={`/examples/${n}.jpg`} alt="" />
          ))}
        </div>
        <div className="onboard-hero-inner">
          <div className="logo">
            <span className="logo-mark">✦</span> Pick<span className="logo-grad">Gen</span>
          </div>
          <h1 className="onboard-hero-title">{t('auth.heroTitle')}</h1>
          <ul className="onboard-feats">
            <li><span>✦</span> {t('auth.feat1')}</li>
            <li><span>◆</span> {t('auth.feat2')}</li>
            <li><span>✓</span> {t('auth.feat3')}</li>
          </ul>
        </div>
      </div>

      {/* ── Right: form ── */}
      <div className="onboard-form-wrap">
        <button
          className="icon-btn onboard-lang"
          onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
          title={t('header.lang')}
        >
          {lang === 'ru' ? 'EN' : 'RU'}
        </button>

        {step === 'email' ? (
          <div className="onboard-form">
            <h2>PickGen</h2>
            <p className="onboard-sub">{t('auth.emailSub')}</p>
            <form onSubmit={submitEmail}>
              <label className="field-label">{'Email'}</label>
              <input
                type="email"
                placeholder={t('auth.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
              <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 16 }} disabled={busy}>
                {busy ? t('auth.submitting') : t('auth.continue')}
              </button>
            </form>
            {config && (
              <p className="onboard-note">
                {config.freeDailyDrafts === 0
                  ? t('auth.freePaid')
                  : t(config.freeDailyDrafts === 1 ? 'auth.freeDrafts' : 'auth.freeDraftsPlural', {
                      n: config.freeDailyDrafts,
                    })}
              </p>
            )}
          </div>
        ) : (
          <div className="onboard-form">
            <button className="link-back" onClick={() => setStep('email')}>{t('auth.back')}</button>
            <h2>{t('auth.profileTitle')}</h2>
            <p className="onboard-sub">{t('auth.profileSub')}</p>
            <form onSubmit={submitProfile}>
              <div className="field-row">
                <div>
                  <label className="field-label">{t('auth.firstName')}</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoFocus />
                </div>
                <div>
                  <label className="field-label">{t('auth.lastName')}</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <label className="field-label">{t('auth.username')}</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@" />
              <label className="field-label">{t('auth.useCase')}</label>
              <select className="onboard-select" value={useCase} onChange={(e) => setUseCase(e.target.value)}>
                <option value="">{t('auth.useCasePlaceholder')}</option>
                {USE_CASES.map((u) => (
                  <option key={u} value={u}>{t(`usecase.${u}`)}</option>
                ))}
              </select>
              <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 18 }} disabled={busy}>
                {busy ? t('auth.submitting') : t('auth.createAccount')}
              </button>
            </form>
          </div>
        )}

        {error && <p style={{ color: 'var(--danger)', fontSize: 13, textAlign: 'center' }}>{error}</p>}
        <p className="onboard-support">
          {t('auth.support')}{' '}
          <a href={SUPPORT_TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
            Telegram @{SUPPORT_TELEGRAM}
          </a>
        </p>
      </div>
    </div>
  );
}
