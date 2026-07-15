import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import type { AppConfig, Generation, User } from './types';
import { useTheme } from './useTheme';
import { Header, type View } from './components/Header';
import { AuthScreen } from './components/AuthScreen';
import { Generator } from './components/Generator';
import { Gallery } from './components/Gallery';
import { Pricing } from './components/Pricing';
import { Account } from './components/Account';
import { Legal, type LegalDoc } from './components/Legal';
import { SUPPORT_TELEGRAM, SUPPORT_TELEGRAM_URL } from './support';
import { useLang } from './i18n';

export function App() {
  const { t } = useLang();
  const [theme, toggleTheme] = useTheme();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [view, setView] = useState<View>('generator');
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [prefill, setPrefill] = useState<Generation | null>(null);
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  // navigate to an app view and leave any open legal document
  const goTo = useCallback((v: View) => {
    setLegalDoc(null);
    setView(v);
  }, []);

  const openLegal = useCallback((d: LegalDoc) => {
    setLegalDoc(d);
    window.scrollTo({ top: 0 });
  }, []);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  // boot: load config + restore session
  useEffect(() => {
    (async () => {
      try {
        const [cfg, me] = await Promise.allSettled([api.config(), api.me()]);
        if (cfg.status === 'fulfilled') setConfig(cfg.value);
        if (me.status === 'fulfilled') setUser(me.value.user);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  // Returned from a Lemon Squeezy checkout — confirm and refresh the balance
  // (the webhook credits it; re-fetch shortly after in case of slight delay).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('paid') !== '1') return;
    notify(t('toast.paid'));
    window.history.replaceState({}, '', window.location.pathname);
    const refresh = () => api.me().then((r) => setUser(r.user)).catch(() => {});
    refresh();
    const timer = window.setTimeout(refresh, 2500);
    return () => window.clearTimeout(timer);
  }, [notify, t]);

  // load gallery once logged in
  useEffect(() => {
    if (user) api.generations().then((r) => setGenerations(r.generations)).catch(() => {});
  }, [user?.id]);

  async function logout() {
    await api.logout().catch(() => {});
    setUser(null);
    setGenerations([]);
    setView('generator');
  }

  if (booting) {
    return <div className="center-loading"><div className="spinner" /></div>;
  }

  if (!user) {
    return <AuthScreen config={config} onLogin={setUser} />;
  }

  if (!config) {
    return <div className="center-loading">{t('app.configError')}</div>;
  }

  return (
    <div className="app">
      <Header user={user} view={view} onNav={goTo} theme={theme} onToggleTheme={toggleTheme} />
      <main className="main">
        {config.aiProvider === 'mock' && <div className="demo-banner">{t('app.demo')}</div>}
        {legalDoc ? (
          <Legal initial={legalDoc} />
        ) : (
          <>
            {view === 'generator' && (
              <Generator
                key={prefill?.id ?? 'fresh'}
                config={config}
                user={user}
                prefill={prefill}
                onUser={setUser}
                onGenerated={(g) => setGenerations((prev) => [g, ...prev])}
                onNav={goTo}
                notify={notify}
              />
            )}
            {view === 'gallery' && (
              <Gallery
                items={generations}
                onChange={setGenerations}
                notify={notify}
                onRepeat={(g) => { setPrefill(g); goTo('generator'); }}
              />
            )}
            {view === 'pricing' && <Pricing config={config} onUser={setUser} notify={notify} />}
            {view === 'account' && <Account user={user} onLogout={logout} />}

            {user.plan === 'free' && (view === 'generator' || view === 'gallery') && (
              <div className="ad-banner">{t('app.ad')}</div>
            )}
          </>
        )}
      </main>
      <footer className="footer">
        <span>© {new Date().getFullYear()} PickGen</span>
        <span className="footer-sep">·</span>
        <button className="footer-link" onClick={() => openLegal('terms')}>{t('footer.terms')}</button>
        <button className="footer-link" onClick={() => openLegal('privacy')}>{t('footer.privacy')}</button>
        <button className="footer-link" onClick={() => openLegal('refund')}>{t('footer.refund')}</button>
        <button className="footer-link" onClick={() => openLegal('content')}>{t('footer.content')}</button>
        <span className="footer-sep">·</span>
        <a href={SUPPORT_TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
          {t('footer.support')}: @{SUPPORT_TELEGRAM}
        </a>
      </footer>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
