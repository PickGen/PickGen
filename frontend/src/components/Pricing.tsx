import { useState } from 'react';
import { api, ApiError } from '../api';
import type { AppConfig, Package, User } from '../types';

export function Pricing({
  config,
  onUser,
  notify,
}: {
  config: AppConfig;
  onUser: (u: User) => void;
  notify: (msg: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const standard = config.packages.filter((p) => p.line === 'standard');
  const quality = config.packages.filter((p) => p.line === 'quality');

  async function buy(pkg: Package) {
    setBusy(pkg.id);
    try {
      const { checkout } = await api.checkout(pkg.id);
      if (checkout.provider === 'mock') {
        // Dev flow: complete the simulated purchase (mimics MoR webhook success).
        const res = await api.mockComplete(pkg.id);
        onUser(res.user);
        notify(`Тестовая оплата · начислено ${res.creditsAdded} кредитов`);
      } else {
        window.location.href = checkout.url;
      }
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Ошибка оплаты');
    } finally {
      setBusy(null);
    }
  }

  const renderLine = (title: string, sub: string, pkgs: Package[], accent?: boolean) => (
    <div className="card panel price-line">
      <h3>{title} {accent && <span className="badge">без рекламы</span>}</h3>
      <div className="pl-sub">{sub}</div>
      {pkgs.map((p) => (
        <div key={p.id} className={`card pkg ${p.credits === 500 ? 'best' : ''}`}>
          {p.credits === 500 && <span className="badge-best">выгодно</span>}
          <div>
            <div className="pkg-credits">{p.label}</div>
            <div className="pkg-per">${(p.priceUsd / p.credits).toFixed(3)} за генерацию</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="pkg-price">${p.priceUsd}</div>
            <button className="btn btn-primary" style={{ marginTop: 6 }} disabled={busy === p.id} onClick={() => buy(p)}>
              {busy === p.id ? '…' : 'Купить'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="section-head"><h1>Тарифы</h1></div>
      <div className="card panel" style={{ marginBottom: 20, background: 'var(--bg-sunken)' }}>
        {config.freeDailyDrafts === 0 ? (
          <>
            <b>Доступ по пакетам.</b> Выберите пакет ниже, чтобы начать генерировать. Кредиты списываются по режиму:
            черновик 1 · качество 5 · текст 10.
          </>
        ) : (
          <>
            <b>Бесплатно</b> — {config.freeDailyDrafts}{' '}
            {config.freeDailyDrafts === 1 ? 'черновик' : 'черновика'} в день (с рекламой). Платные пакеты отключают
            рекламу и дают доступ к режимам «Качество» и «Текст». Кредиты списываются по режиму: черновик 1 · качество 5 ·
            текст 10.
          </>
        )}
      </div>
      <div className="pricing-lines">
        {renderLine('Стандарт', 'Для набросков, идей и экспериментов (Flux Schnell / Pro).', standard)}
        {renderLine('Качество', 'Максимальное качество Flux 2 Pro — для работы и печати.', quality, true)}
      </div>
    </div>
  );
}
