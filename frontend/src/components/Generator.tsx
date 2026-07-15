import { useState } from 'react';
import { api, ApiError } from '../api';
import type { AppConfig, Generation, ModeId, User } from '../types';
import { useLang } from '../i18n';

const EXAMPLES: Record<string, string[]> = {
  ru: [
    'рыжий кот в очках на закате',
    'уютная кофейня в дождливый вечер',
    'минималистичный логотип горы',
    'киберпанк-город, неон, ночь',
  ],
  en: [
    'a ginger cat in glasses at sunset',
    'a cozy coffee shop on a rainy evening',
    'minimalist mountain logo',
    'cyberpunk city, neon, night',
  ],
};

export function Generator({
  config,
  user,
  prefill,
  onUser,
  onGenerated,
  onNav,
  notify,
}: {
  config: AppConfig;
  user: User;
  prefill?: Generation | null;
  onUser: (u: User) => void;
  onGenerated: (g: Generation) => void;
  onNav: (v: 'pricing') => void;
  notify: (msg: string) => void;
}) {
  const { t, lang } = useLang();
  const [prompt, setPrompt] = useState(prefill?.prompt ?? '');
  const [negative, setNegative] = useState('');
  const [seed, setSeed] = useState(prefill?.seed != null ? String(prefill.seed) : '');
  const [mode, setMode] = useState<ModeId>((prefill?.mode as ModeId) ?? config.defaultMode);
  const [style, setStyle] = useState(prefill?.style ?? config.styles[0]?.id ?? 'photo');
  const [format, setFormat] = useState(prefill?.format ?? config.formats[0]?.id ?? 'square');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Generation | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  const modeSpec = config.modes.find((m) => m.id === mode)!;
  const freeDraft = mode === 'draft' && user.plan === 'free' && config.freeDailyDrafts > 0;
  const examples = EXAMPLES[lang] ?? EXAMPLES.en;

  async function generate() {
    if (prompt.trim().length < 2) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload = {
        prompt: prompt.trim(),
        negativePrompt: negative.trim() || undefined,
        mode,
        style,
        format,
        seed: seed.trim() ? Number(seed) : undefined,
      };
      const res = await api.generate(payload);
      setResult(res.generation);
      onUser(res.user);
      onGenerated(res.generation);
      if (res.usedFreeDaily) notify(t('toast.usedFreeDaily'));
    } catch (err) {
      if (err instanceof ApiError) setError({ code: err.code, message: err.message });
      else setError({ code: 'error', message: t('gen.somethingWrong') });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gen-grid">
      {/* ── Controls ── */}
      <div className="card panel">
        <h2>{t('gen.title')}</h2>
        <div className="hint">{t('gen.hint')}</div>

        <div className="field">
          <label>{t('gen.prompt')}</label>
          <textarea
            rows={3}
            placeholder={t('gen.promptPlaceholder')}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="examples">
            {examples.map((ex) => (
              <button key={ex} className="example-btn" onClick={() => setPrompt(ex)}>
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>{t('gen.mode')}</label>
          <div className="mode-cards">
            {config.modes.map((m) => (
              <button
                key={m.id}
                className={`mode-card ${mode === m.id ? 'active' : ''}`}
                onClick={() => setMode(m.id)}
              >
                <div className="m-label">{t(`mode.${m.id}`)}</div>
                <div className="m-cost">{m.cost} 💎</div>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>{t('gen.style')}</label>
          <div className="chips">
            {config.styles.map((s) => (
              <button key={s.id} className={`chip ${style === s.id ? 'active' : ''}`} onClick={() => setStyle(s.id)}>
                {t(`style.${s.id}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>{t('gen.format')}</label>
          <div className="chips">
            {config.formats.map((f) => (
              <button key={f.id} className={`chip ${format === f.id ? 'active' : ''}`} onClick={() => setFormat(f.id)}>
                {t(`format.${f.id}`)}
              </button>
            ))}
          </div>
        </div>

        <details className="advanced">
          <summary>{t('gen.advanced')}</summary>
          <div className="field">
            <label>{t('gen.negative')}</label>
            <input type="text" value={negative} onChange={(e) => setNegative(e.target.value)} placeholder={t('gen.negativePlaceholder')} />
          </div>
          <div className="field">
            <label>{t('gen.seed')}</label>
            <input type="number" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder={t('gen.seedPlaceholder')} />
          </div>
        </details>

        <div className="gen-cta">
          <button className="btn btn-primary btn-block btn-lg" onClick={generate} disabled={loading || prompt.trim().length < 2}>
            {loading ? t('gen.generating') : t('gen.generate')}
          </button>
          <div className="gen-cost-note">
            {freeDraft ? t('gen.freeDaily') : t('gen.willSpend', { n: modeSpec.cost })} · {t('gen.balance', { n: user.credits })}
          </div>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="card canvas">
        {loading && (
          <div className="loading-wrap">
            <div className="spinner" />
            <div>{t('gen.creating')}</div>
          </div>
        )}

        {!loading && error?.code === 'no_credits' && (
          <div style={{ maxWidth: 340 }}>
            <div className="banner banner-nocredits">
              <b>{t('gen.noCredits')}</b>
              <span>{error.message}</span>
              <button className="btn btn-primary btn-block" style={{ marginTop: 8 }} onClick={() => onNav('pricing')}>
                {t('gen.topUp')}
              </button>
            </div>
          </div>
        )}

        {!loading && error && error.code !== 'no_credits' && (
          <div style={{ maxWidth: 380 }}>
            <div className="banner banner-error">⚠️ {error.message}</div>
            <button className="btn btn-block" onClick={generate}>{t('gen.retry')}</button>
          </div>
        )}

        {!loading && !error && result && (
          <div style={{ textAlign: 'center', width: '100%' }}>
            <img src={result.imageUrl} alt={result.prompt} />
            <div className="result-actions">
              <a className="btn" href={result.imageUrl} download={`pickgen-${result.id}.png`}>{t('gen.download')}</a>
              <button className="btn" onClick={() => { navigator.clipboard.writeText(result.prompt); notify(t('toast.promptCopied')); }}>
                {t('gen.copyPrompt')}
              </button>
              <button className="btn" onClick={generate}>{t('gen.repeat')}</button>
            </div>
          </div>
        )}

        {!loading && !error && !result && (
          <div className="canvas-empty">
            <div className="big">🎨</div>
            <div>{t('gen.empty')}</div>
          </div>
        )}
      </div>
    </div>
  );
}
