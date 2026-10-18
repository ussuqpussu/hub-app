// Перетаскивание карточек между колонками (из motion-kit). Карточка «поднимается» (масштаб, наклон по движению, тень),
// колонка под ней подсвечивается. Мышью тянется вся карточка, пальцем за ручку (чтобы страница листалась).
// Альтернатива жесту: стрелки влево и вправо на сфокусированной карточке.
// Саму перестановку делает onMove (меняет данные); после перерисовки карточки плавно переезжают (FLIP делает вызывающий код по data-flip).
import { motionAllowed } from './appearance.js';

export function initKanban(root, { onMove, say = () => {} }) {
  const cols = [...root.querySelectorAll('[data-col]')];
  if (!cols.length) return;
  const keyOf = (col) => col.dataset.col;
  const colAt = (x, y) => cols.find((c) => { const r = c.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; });
  const home = (card, dur = 350) => {
    if (!motionAllowed()) return;
    const from = card.style.transform || 'none';
    card.style.transform = '';
    card.animate([{ transform: from }, { transform: 'none' }], { duration: dur, easing: 'cubic-bezier(.22,1,.36,1)' });
  };
  root.querySelectorAll('.kc').forEach((card) => {
    const from = card.closest('[data-col]');
    card.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const to = cols[cols.indexOf(card.closest('[data-col]')) + (e.key === 'ArrowRight' ? 1 : -1)];
      if (!to) return;
      e.preventDefault();
      const ok = onMove(card.dataset.id, keyOf(to));
      if (ok !== false) say(`Перенесено: ${to.getAttribute('aria-label') || ''}`);
    });
    const start = (e) => {
      if (e.button > 0) return;
      if (e.target.closest && e.target.closest('button:not(.kc__grip), a')) return;
      if (e.pointerType === 'touch' && !e.target.closest('.kc__grip')) return;
      e.preventDefault();
      card.setPointerCapture(e.pointerId);
      card.classList.add('drag');
      const sx = e.clientX;
      const sy = e.clientY;
      const move = (ev) => {
        const dx = ev.clientX - sx;
        const dy = ev.clientY - sy;
        card.style.transform = `translate(${dx}px, ${dy}px) scale(1.04) rotate(${Math.max(-4, Math.min(4, dx / 30))}deg)`;
        const over = colAt(ev.clientX, ev.clientY);
        cols.forEach((c) => c.classList.toggle('over', c === over));
      };
      const up = (ev) => {
        card.removeEventListener('pointermove', move);
        card.removeEventListener('pointerup', up);
        card.removeEventListener('pointercancel', up);
        const target = ev.type === 'pointercancel' ? null : colAt(ev.clientX, ev.clientY);
        cols.forEach((c) => c.classList.remove('over'));
        card.classList.remove('drag');
        if (target && target !== from) {
          const ok = onMove(card.dataset.id, keyOf(target));
          if (ok === false) home(card);
          else say(`Перенесено: ${target.getAttribute('aria-label') || ''}`);
        } else home(card);
      };
      card.addEventListener('pointermove', move);
      card.addEventListener('pointerup', up);
      card.addEventListener('pointercancel', up);
    };
    card.addEventListener('pointerdown', start);
  });
}
