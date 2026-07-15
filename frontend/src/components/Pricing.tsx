import { useState } from 'react';
import { api, ApiError } from '../api';
import type { AppConfig, Package, User } from '../types';
import { useLang } from '../i18n';

export function Pricing({
  config,
  onUser,
  notify,
}: {
  config: AppConfig;
  onUser: (u: User) => void;
  notify: (msg: string) => void;
}) {
  const { t } = useLang();
  const [busy, setBusy] = useState<string | null>(null);

  const standard = config.packages.filter((p) => p.line === 'standard');
  const quality = config.packages.filter((p) => p.line === 'quality');

  async function buy(pkg: Package) {
    setBusy(pkg.id);
    try {
      const { checkout } = await api.checkout(pkg.id);
      if (checkout.provider === 'mock') {
        const res = await api.mockComplete(pkg.id);
        onUser(res.user);
        notify(t('toast.testPaid', { n: res.creditsAdded }));
      } else {
        window.location.href = checkout.url;
      }
    } catch (err) {
      notify(err instanceof ApiError ? err.message : t('toast.payError'));
    } finally {
      setBusy(null);
    }
  }

  const renderLine = (title: string, sub: string, pkgs: Package[], accent?: boolean) => (
    <div className="card panel price-line">
      <h3>{title} {accent && <span className="badge">{t('pricing.noAds')}</span>}</h3>
      <div className="pl-sub">{sub}</div>
      {pkgs.map((p) => (
        <div key={p.id} className={`card pkg ${p.credits === 500 ? 'best' : ''}`}>
          {p.credits === 500 && <span className="badge-best">{t('pricing.best')}</span>}
          <div>
            <div className="pkg-credits">{p.credits} {t('pricing.gens')}</div>
            <div className="pkg-per">${(p.priceUsd / p.credits).toFixed(3)} {t('pricing.perGen')}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="pkg-price">${p.priceUsd}</div>
            <button className="btn btn-primary" style={{ marginTop: 6 }} disabled={busy === p.id} onClick={() => buy(p)}>
              {busy === p.id ? '…' : t('pricing.buy')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const d = config.freeDailyDrafts;

  return (
    <div>
      <div className="section-head"><h1>{t('pricing.title')}</h1></div>
      <div className="card panel" style={{ marginBottom: 20, background: 'var(--bg-sunken)' }}>
        {d === 0 ? (
          <>
            <b>{t('pricing.freePaid')}</b> {t('pricing.freePaidRest')}
          </>
        ) : (
          <>
            <b>{t('pricing.freeNote')}</b> — {d}{' '}
            {t(d === 1 ? 'pricing.freeNoteDraft' : 'pricing.freeNoteDrafts')} {t('pricing.freeNoteRest')}
          </>
        )}
      </div>
      <div className="pricing-lines">
        {renderLine(t('pricing.lineStandard'), t('pricing.subStandard'), standard)}
        {renderLine(t('pricing.lineQuality'), t('pricing.subQuality'), quality, true)}
      </div>
    </div>
  );
}
