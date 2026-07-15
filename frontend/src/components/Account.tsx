import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Payment, User } from '../types';
import { SUPPORT_TELEGRAM, SUPPORT_TELEGRAM_URL } from '../support';
import { useLang } from '../i18n';

export function Account({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { t, lang } = useLang();
  const [payments, setPayments] = useState<Payment[]>([]);
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';

  useEffect(() => {
    api.payments().then((r) => setPayments(r.payments)).catch(() => {});
  }, []);

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="section-head"><h1>{t('account.title')}</h1></div>

      <div className="card panel">
        <div style={{ display: 'grid', gap: 10 }}>
          <Row label={t('account.email')} value={user.email} />
          <Row label={t('account.plan')} value={<span className="badge">{user.plan}</span>} />
          <Row label={t('account.balance')} value={<b>{user.credits} 💎</b>} />
          <Row label={t('account.registered')} value={new Date(user.createdAt).toLocaleDateString(locale)} />
        </div>
        <button className="btn btn-danger" style={{ marginTop: 18 }} onClick={onLogout}>{t('account.logout')}</button>
      </div>

      <div className="card panel" style={{ marginTop: 20 }}>
        <h2>{t('account.support')}</h2>
        <div className="hint" style={{ marginTop: 8 }}>{t('account.supportText')}</div>
        <a
          className="btn btn-primary"
          style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8 }}
          href={SUPPORT_TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('account.writeTelegram')} @{SUPPORT_TELEGRAM}
        </a>
      </div>

      <div className="card panel" style={{ marginTop: 20 }}>
        <h2>{t('account.payments')}</h2>
        {payments.length === 0 ? (
          <div className="hint" style={{ marginTop: 8 }}>{t('account.noPayments')}</div>
        ) : (
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            {payments.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{new Date(p.createdAt).toLocaleString(locale)} · {p.provider}</span>
                <span>
                  <span style={{ color: p.status === 'refunded' ? 'var(--danger)' : 'var(--success)' }}>{p.credits > 0 ? `+${p.credits}` : p.credits} 💎</span>
                  {' '}· ${p.amount} · {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
