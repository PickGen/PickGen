import { useState } from 'react';
import { api } from '../api';
import type { Generation } from '../types';
import { Modal } from './Modal';

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
  const [active, setActive] = useState<Generation | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  async function remove(id: string) {
    await api.deleteGeneration(id);
    onChange(items.filter((g) => g.id !== id));
    setActive(null);
    notify('Удалено');
  }

  async function clearAll() {
    await api.clearGenerations();
    onChange([]);
    setConfirmClear(false);
    notify('История очищена');
  }

  if (items.length === 0) {
    return (
      <div>
        <div className="section-head"><h1>Галерея</h1></div>
        <div className="card panel" style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 60 }}>
          Пока пусто. Сгенерируйте первое изображение!
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-head">
        <h1>Галерея <span style={{ color: 'var(--text-faint)', fontSize: 15 }}>· {items.length}</span></h1>
        {confirmClear ? (
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Очистить всё?</span>
            <button className="btn btn-danger" onClick={clearAll}>Да, очистить</button>
            <button className="btn btn-ghost" onClick={() => setConfirmClear(false)}>Отмена</button>
          </span>
        ) : (
          <button className="btn btn-danger" onClick={() => setConfirmClear(true)}>Очистить историю</button>
        )}
      </div>

      <div className="gallery-grid">
        {items.map((g) => (
          <div key={g.id} className="card gallery-item" onClick={() => setActive(g)}>
            <img src={g.imageUrl} alt={g.prompt} />
            <div className="gi-meta">
              <div className="gi-prompt">{g.prompt}</div>
              <div className="gi-sub">{g.mode} · {g.style} · {new Date(g.createdAt).toLocaleDateString()}</div>
            </div>
          </div>
        ))}
      </div>

      {active && (
        <Modal onClose={() => setActive(null)}>
          <img src={active.imageUrl} alt={active.prompt} />
          <p style={{ marginTop: 12, marginBottom: 4 }}>{active.prompt}</p>
          <div className="gi-sub" style={{ color: 'var(--text-faint)', fontSize: 12 }}>
            {active.mode} · {active.style} · {active.format}{active.seed != null ? ` · seed ${active.seed}` : ''}
          </div>
          <div className="modal-actions">
            <a className="btn" href={active.imageUrl} download={`pickgen-${active.id}.png`}>⬇ Скачать</a>
            <button className="btn" onClick={() => { navigator.clipboard.writeText(active.prompt); notify('Промпт скопирован'); }}>⧉ Копировать промпт</button>
            <button className="btn" onClick={() => { onRepeat(active); setActive(null); }}>↻ Повторить</button>
            <button className="btn btn-danger" style={{ marginLeft: 'auto' }} onClick={() => remove(active.id)}>Удалить</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
