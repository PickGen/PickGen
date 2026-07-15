import type { User } from '../types';

export type View = 'generator' | 'gallery' | 'pricing' | 'account';

const NAV: { id: View; label: string }[] = [
  { id: 'generator', label: 'Генератор' },
  { id: 'gallery', label: 'Галерея' },
  { id: 'pricing', label: 'Тарифы' },
  { id: 'account', label: 'Аккаунт' },
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
  return (
    <header className="header">
      <div className="logo">
        <span className="logo-mark">✦</span> Pick<span className="logo-grad">Gen</span>
      </div>
      <nav className="nav">
        {NAV.map((n) => (
          <button key={n.id} className={view === n.id ? 'active' : ''} onClick={() => onNav(n.id)}>
            {n.label}
          </button>
        ))}
      </nav>
      <div className="header-right">
        <button className="credits-pill" onClick={() => onNav('pricing')} title="Купить кредиты">
          <span>💎</span> <b>{user.credits}</b>
        </button>
        <button className="icon-btn" onClick={onToggleTheme} title="Сменить тему">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
