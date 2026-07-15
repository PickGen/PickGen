import { useState } from 'react';
import { api } from '../api';
import type { Generation } from '../types';
import { Modal } from './Modal';
import { useLang } from '../i18n';

export function Gallery({
  items,
  onChange,
  notify,
  onRepeat,
}: {
  items: Generation[];
  onChange: (items: Generation[]) => void;
  notify: (msg: string) => void;
  onRepeat: (g: Generation) => void;
}) {
  const { t, lang } = useLang();
  const [active, setActive] = useState<Generation | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';

  async function remove(id: string) {
    await api.deleteGeneration(id);
    onChange(items.filter((g) => g.id !== id));
    setActive(null);
    notify(t('toast.deleted'));
  }

  async function clearAll() {
    await api.clearGenerations();
    onChange([]);
    setConfirmClear(false);
    notify(t('toast.historyCleared'));
  }

  if (items.length === 0) {
    return (
      <div>
        <div className="section-head"><h1>{t('gallery.title')}</h1></div>
        <div className="card panel" style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 60 }}>
          {t('gallery.emptyTitle')}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-head">
        <h1>{t('gallery.title')} <span style={{ color: 'var(--text-faint)', fontSize: 15 }}>· {items.length}</span></h1>
        {confirmClear ? (
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{t('gallery.clearConfirm')}</span>
            <button className="btn btn-danger" onClick={clearAll}>{t('gallery.clearYes')}</button>
            <button className="btn btn-ghost" onClick={() => setConfirmClear(false)}>{t('gallery.cancel')}</button>
          </span>
        ) : (
          <button className="btn btn-danger" onClick={() => setConfirmClear(true)}>{t('gallery.clear')}</button>
        )}
      </div>

      <div className="gallery-grid">
        {items.map((g) => (
          <div key={g.id} className="card gallery-item" onClick={() => setActive(g)}>
            <img src={g.imageUrl} alt={g.prompt} />
            <div className="gi-meta">
              <div className="gi-prompt">{g.prompt}</div>
              <div className="gi-sub">{t(`mode.${g.mode}`)} · {t(`style.${g.style}`)} · {new Date(g.createdAt).toLocaleDateString(locale)}</div>
            </div>
          </div>
        ))}
      </div>

      {active && (
        <Modal onClose={() => setActive(null)}>
          <img src={active.imageUrl} alt={active.prompt} />
          <p style={{ marginTop: 12, marginBottom: 4 }}>{active.prompt}</p>
          <div className="gi-sub" style={{ color: 'var(--text-faint)', fontSize: 12 }}>
            {t(`mode.${active.mode}`)} · {t(`style.${active.style}`)} · {t(`format.${active.format}`)}{active.seed != null ? ` · seed ${active.seed}` : ''}
          </div>
          <div className="modal-actions">
            <a className="btn" href={active.imageUrl} download={`pickgen-${active.id}.png`}>{t('gen.download')}</a>
            <button className="btn" onClick={() => { navigator.clipboard.writeText(active.prompt); notify(t('toast.promptCopied')); }}>{t('gen.copyPrompt')}</button>
            <button className="btn" onClick={() => { onRepeat(active); setActive(null); }}>{t('gen.repeat')}</button>
            <button className="btn btn-danger" style={{ marginLeft: 'auto' }} onClick={() => remove(active.id)}>{t('gallery.delete')}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
