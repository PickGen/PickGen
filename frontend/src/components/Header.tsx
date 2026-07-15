import type { User } from '../types';
import { useLang } from '../i18n';

export type View = 'generator' | 'gallery' | 'pricing' | 'account';

const NAV: { id: View; key: string }[] = [
  { id: 'generator', key: 'nav.generator' },
  { id: 'gallery', key: 'nav.gallery' },
  { id: 'pricing', key: 'nav.pricing' },
  { id: 'account', key: 'nav.account' },
];

export function Header({
  user,
  view,
  onNav,
  theme,
  onToggleTheme,
}: {
  user: User;
  view: View;
  onNav: (v: View) => void;
  theme: string;
  onToggleTheme: () => void;
}) {
  const { t, lang, setLang } = useLang();
  return (
    <header className="header">
      <div className="logo">
        <span className="logo-mark">✦</span> Pick<span className="logo-grad">Gen</span>
      </div>
      <nav className="nav">
        {NAV.map((n) => (
          <button key={n.id} className={view === n.id ? 'active' : ''} onClick={() => onNav(n.id)}>
            {t(n.key)}
          </button>
        ))}
      </nav>
      <div className="header-right">
        <button className="credits-pill" onClick={() => onNav('pricing')} title={t('header.credits')}>
          <span>💎</span> <b>{user.credits}</b>
        </button>
        <button
          className="icon-btn"
          onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
          title={t('header.lang')}
        >
          {lang === 'ru' ? 'EN' : 'RU'}
        </button>
        <button className="icon-btn" onClick={onToggleTheme} title={t('header.theme')}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
