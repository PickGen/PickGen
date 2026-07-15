import { useState } from 'react';
import { api, ApiError } from '../api';
import type { AppConfig, Generation, ModeId, User } from '../types';

const EXAMPLES = [
  'рыжий кот в очках на закате',
  'уютная кофейня в дождливый вечер',
  'минималистичный логотип горы',
  'киберпанк-город, неон, ночь',
];

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
  const freeDraft = mode === 'draft' && user.plan === 'free';

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
      if (res.usedFreeDaily) notify('Использован бесплатный дневной черновик');
    } catch (err) {
      if (err instanceof ApiError) setError({ code: err.code, message: err.message });
      else setError({ code: 'error', message: 'Что-то пошло не так' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gen-grid">
      {/* ── Controls ── */}
      <div className="card panel">
        <h2>Создать изображение</h2>
        <div className="hint">Пишите на любом языке — мы переведём и улучшим запрос.</div>

        <div className="field">
          <label>Описание</label>
          <textarea
            rows={3}
            placeholder="Например: рыжий кот в очках на закате"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="examples">
            {EXAMPLES.map((ex) => (
              <button key={ex} className="example-btn" onClick={() => setPrompt(ex)}>
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Режим</label>
          <div className="mode-cards">
            {config.modes.map((m) => (
              <button
                key={m.id}
                className={`mode-card ${mode === m.id ? 'active' : ''}`}
                onClick={() => setMode(m.id)}
              >
                <div className="m-label">{m.label}</div>
                <div className="m-cost">{m.cost} 💎</div>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Стиль</label>
          <div className="chips">
            {config.styles.map((s) => (
              <button key={s.id} className={`chip ${style === s.id ? 'active' : ''}`} onClick={() => setStyle(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Формат</label>
          <div className="chips">
            {config.formats.map((f) => (
              <button key={f.id} className={`chip ${format === f.id ? 'active' : ''}`} onClick={() => setFormat(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <details className="advanced">
          <summary>Дополнительно</summary>
          <div className="field">
            <label>Негативный промпт (чего быть не должно)</label>
            <input type="text" value={negative} onChange={(e) => setNegative(e.target.value)} placeholder="напр.: размытие, текст" />
          </div>
          <div className="field">
            <label>Seed (для повторяемости)</label>
            <input type="number" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="случайный" />
          </div>
        </details>

        <div className="gen-cta">
          <button className="btn btn-primary btn-block btn-lg" onClick={generate} disabled={loading || prompt.trim().length < 2}>
            {loading ? 'Генерируем…' : `Сгенерировать`}
          </button>
          <div className="gen-cost-note">
            {freeDraft ? 'Бесплатный дневной черновик' : `Спишется ${modeSpec.cost} 💎`} · баланс {user.credits} 💎
          </div>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="card canvas">
        {loading && (
          <div className="loading-wrap">
            <div className="spinner" />
            <div>Создаём изображение…</div>
          </div>
        )}

        {!loading && error?.code === 'no_credits' && (
          <div style={{ maxWidth: 340 }}>
            <div className="banner banner-nocredits">
              <b>Недостаточно кредитов</b>
              <span>{error.message}</span>
              <button className="btn btn-primary btn-block" style={{ marginTop: 8 }} onClick={() => onNav('pricing')}>
                Пополнить баланс
              </button>
            </div>
          </div>
        )}

        {!loading && error && error.code !== 'no_credits' && (
          <div style={{ maxWidth: 380 }}>
            <div className="banner banner-error">⚠️ {error.message}</div>
            <button className="btn btn-block" onClick={generate}>Повторить</button>
          </div>
        )}

        {!loading && !error && result && (
          <div style={{ textAlign: 'center', width: '100%' }}>
            <img src={result.imageUrl} alt={result.prompt} />
            <div className="result-actions">
              <a className="btn" href={result.imageUrl} download={`pickgen-${result.id}.png`}>⬇ Скачать</a>
              <button className="btn" onClick={() => { navigator.clipboard.writeText(result.prompt); notify('Промпт скопирован'); }}>
                ⧉ Копировать промпт
              </button>
              <button className="btn" onClick={generate}>↻ Повторить</button>
            </div>
          </div>
        )}

        {!loading && !error && !result && (
          <div className="canvas-empty">
            <div className="big">🎨</div>
            <div>Введите описание и нажмите «Сгенерировать»</div>
          </div>
        )}
      </div>
    </div>
  );
}
