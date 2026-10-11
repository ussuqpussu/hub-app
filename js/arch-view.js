// Схема проекта: рисунок (SVG), панель узла и окно правки. Рисуется нашим кодом, без внешних сервисов.
import { el } from './ui.js';
import { NODE_TYPES, NODE_STATUS, computeLayout, groupNameOf, nodeSize } from './arch-calc.js';

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, kids = []) => {
  const n = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
  [].concat(kids).forEach((k) => n.append(k));
  return n;
};
// Простые значки (рисунок 24×24, линии), свои, не копии чужих наборов
const ICON = {
  site: 'M3 5h18v14H3zM3 9h18M7 7h.01',
  domain: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  server: 'M4 5h16v5H4zM4 14h16v5H4zM8 7.5h.01M8 16.5h.01',
  repo: 'M7 4v16M7 8a3 3 0 100-.01M17 12a3 3 0 100-.01M7 16c0-4 10-1 10-4',
  crm: 'M4 5h16v14H4zM4 10h16M10 10v9',
  analytics: 'M4 20V10M10 20V4M16 20v-8M21 20H3',
  bot: 'M6 8h12v10H6zM12 4v4M9 13h.01M15 13h.01M9 16h6',
  userbot: 'M12 8a3 3 0 100-.01M5 20c0-4 3-6 7-6s7 2 7 6M18 4l2 2-2 2',
  db: 'M5 6c0-2 14-2 14 0v12c0 2-14 2-14 0zM5 6c0 2 14 2 14 0M5 12c0 2 14 2 14 0',
  payment: 'M3 6h18v12H3zM3 10h18M7 15h4',
  service: 'M7 18a4 4 0 010-8 5 5 0 019-1 4 4 0 011 9z',
  device: 'M8 3h8v18H8zM11 18h2',
  other: 'M5 5h14v14H5z',
};
const typeColor = (t) => `var(--chart-${(Object.keys(NODE_TYPES).indexOf(t) % 7) + 1})`;
const cut = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

// opts: selected, selectedEdge, linkFrom, draggable, onNode(n), onEdge(i), onMove(id, x, y, done)
export function renderDiagram(arch, { onNode, onEdge, onMove, selected, selectedEdge, linkFrom, draggable } = {}) {
  const L = computeLayout(arch);
  const root = svg('svg', { class: `arch${draggable ? ' arch--drag' : ''}`, viewBox: `0 0 ${L.width} ${L.height}`, width: L.width, height: L.height, role: 'group', 'aria-label': 'Схема проекта' });
  root.append(svg('defs', {}, [svg('marker', { id: 'arch-arrow', viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '8', markerHeight: '8', orient: 'auto-start-reverse' }, [svg('path', { d: 'M0,0 L10,5 L0,10 z', class: 'arch__arrowhead' })])]));
  L.groups.forEach((g) => {
    root.append(svg('g', { class: 'arch__group' }, [
      svg('rect', { x: g.x, y: g.y, width: g.w, height: g.h, rx: '6' }),
      Object.assign(svg('text', { x: g.x + 10, y: g.y + 17 }), { textContent: cut(g.name, 40) }),
    ]));
  });
  L.edges.forEach((e, i) => {
    const g = svg('g', { class: 'arch__edge', 'data-sel': String(selectedEdge === i) }, [svg('path', { d: e.d, 'marker-end': 'url(#arch-arrow)' })]);
    if (e.label) {
      const t = Object.assign(svg('text', { x: e.lx, y: e.ly, 'text-anchor': 'middle' }), { textContent: cut(e.label, 26) });
      g.append(svg('rect', { class: 'arch__labelbg', x: e.lx - Math.min(e.label.length, 26) * 3.4 - 4, y: e.ly - 12, width: Math.min(e.label.length, 26) * 6.8 + 8, height: 16, rx: '3' }), t);
    }
    if (onEdge) {
      const hit = svg('path', { class: 'arch__hit', d: e.d });
      hit.addEventListener('click', () => onEdge(i));
      g.append(hit);
    }
    root.append(g);
  });
  const byId = new Map(arch.nodes.map((n) => [n.id, n]));
  L.nodes.forEach((p) => {
    const n = byId.get(p.id);
    const g = svg('g', { class: 'arch__node', 'data-status': n.status, 'data-id': n.id, 'data-link': String(linkFrom === n.id), 'aria-pressed': String(selected === n.id), role: 'button', tabindex: '0', 'aria-label': `${n.name}. ${NODE_TYPES[n.type]}. ${NODE_STATUS[n.status]}` });
    g.style.setProperty('--node-color', typeColor(n.type));
    g.append(
      svg('title', {}, [document.createTextNode(`${n.name} (${NODE_TYPES[n.type]}, ${NODE_STATUS[n.status].toLowerCase()})`)]),
      svg('rect', { class: 'arch__box', x: p.x, y: p.y, width: p.w, height: p.h, rx: '8' }),
      svg('rect', { class: 'arch__strip', x: p.x, y: p.y, width: '5', height: p.h, rx: '2' }),
      svg('path', { class: 'arch__icon', d: ICON[n.type] || ICON.other, transform: `translate(${p.x + 14},${p.y + p.h / 2 - 11}) scale(0.95)` }),
      ...nodeSize(n).lines.map((line, i) => Object.assign(svg('text', { class: 'arch__name', x: p.x + 46, y: p.y + 26 + i * 18 }), { textContent: line })),
      Object.assign(svg('text', { class: 'arch__type', x: p.x + 46, y: p.y + p.h - 20 }), { textContent: cut(NODE_TYPES[n.type], 32) }),
      svg('circle', { class: 'arch__dot', cx: p.x + p.w - 14, cy: p.y + 14, r: '5' }),
    );
    const fire = () => onNode && onNode(n);
    // Нажал, потянул, отпустил: плашка идёт за мышью (или пальцем), стрелки следуют за ней. Без сдвига это обычный клик.
    g.addEventListener('pointerdown', (ev) => {
      if (ev.button > 0) return;
      if (!draggable) return void fire();
      ev.preventDefault();
      const scale = root.getBoundingClientRect().width / L.width || 1;
      const sx = ev.clientX;
      const sy = ev.clientY;
      let moved = false;
      const mv = (e) => {
        const dx = (e.clientX - sx) / scale;
        const dy = (e.clientY - sy) / scale;
        if (!moved && Math.hypot(dx, dy) * scale < 5) return;
        moved = true;
        onMove(n.id, Math.max(8, Math.round(p.x + dx)), Math.max(8, Math.round(p.y + dy)), false);
      };
      const up = () => {
        document.removeEventListener('pointermove', mv);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);
        if (moved) onMove(n.id, null, null, true);
        else fire();
      };
      document.addEventListener('pointermove', mv);
      document.addEventListener('pointerup', up);
      document.addEventListener('pointercancel', up);
    });
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); } });
    root.append(g);
  });
  return root;
}

const row = (k, v, link) => (v ? [el('dt', { text: k }), el('dd', {}, [link && /^https?:\/\//i.test(v) ? el('a', { href: v, target: '_blank', rel: 'noopener noreferrer', text: v }) : v])] : []);

export function nodePanel(n, { onEdit } = {}) {
  const box = el('section', { class: 'card stack nodepanel', 'aria-label': `Узел: ${n.name}` });
  const edit = onEdit ? el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Изменить плашку' }) : '';
  if (edit) edit.addEventListener('click', onEdit);
  box.append(
    el('div', { class: 'listhead' }, [el('h3', { text: n.name }), el('span', { class: 'listhead__count' }), edit]),
    el('p', { class: 'muted', text: `${NODE_TYPES[n.type]} · ${NODE_STATUS[n.status]}` }),
    el('dl', { class: 'kv' }, [...row('Адрес', n.url, true), ...row('Где размещено', n.host), ...row('Репозиторий', n.repo), ...row('Как выкладывается', n.deploy), ...row('Где лежат ключи', n.keys), ...row('Заметка', n.note)]),
  );
  if (n.questions.length) box.append(el('div', { class: 'stack stack--tight' }, [el('h4', { text: 'Открытые вопросы' }), el('ul', { class: 'hist' }, n.questions.map((q) => el('li', { text: q })))]));
  return box;
}

const labeled = (text, control) => el('label', { class: 'fieldrow' }, [el('span', { class: 'fieldrow__label', text }), control]);

// Редактор плашки прямо под схемой. onChange(redrawDiagramOnly), onGroup(name), onDelete.
export function nodeEditor(arch, n, { onChange, onGroup, onDelete }) {
  const inp = (key, attrs = {}) => {
    const i = el('input', { class: 'field', value: n[key] || '', ...attrs });
    i.addEventListener('input', () => { n[key] = i.value; onChange(); });
    return i;
  };
  const sel = (key, map) => {
    const s = el('select', { class: 'field' }, Object.entries(map).map(([v, t]) => el('option', { value: v, text: t })));
    s.value = n[key];
    s.addEventListener('change', () => { n[key] = s.value; onChange(); });
    return s;
  };
  const group = el('input', { class: 'field', value: groupNameOf(arch, n.id), list: 'arch-groups', placeholder: 'Например: Сервер' });
  group.addEventListener('change', () => onGroup(group.value));
  const qs = el('input', { class: 'field', value: n.questions.join('; '), placeholder: 'Через точку с запятой' });
  qs.addEventListener('input', () => { n.questions = qs.value.split(';').map((x) => x.trim()).filter(Boolean); });
  const del = el('button', { type: 'button', class: 'btn btn--danger btn--s', text: 'Удалить плашку' });
  del.addEventListener('click', onDelete);
  return el('section', { class: 'card stack nodeeditor', 'aria-label': 'Правка плашки' }, [
    el('h3', { text: 'Плашка' }),
    labeled('Название', inp('name', { maxlength: '60', 'aria-label': 'Название плашки' })),
    el('div', { class: 'task-form__row' }, [labeled('Что это', sel('type', NODE_TYPES)), labeled('Состояние', sel('status', NODE_STATUS))]),
    labeled('Адрес (http…)', inp('url', { placeholder: 'https://' })),
    labeled('Где размещено', inp('host')),
    labeled('Репозиторий', inp('repo')),
    labeled('Как выкладывается', inp('deploy')),
    labeled('Где лежат ключи (только место, без самих ключей)', inp('keys')),
    labeled('Заметка', inp('note', { maxlength: '400' })),
    labeled('Открытые вопросы', qs),
    labeled('Общая рамка (группа)', group),
    el('datalist', { id: 'arch-groups' }, arch.groups.map((g) => el('option', { value: g.name }))),
    del,
  ]);
}

// Редактор стрелки: подпись, развернуть, удалить.
export function edgeEditor(arch, e, { onChange, onSwap, onDelete }) {
  const name = (id) => (arch.nodes.find((n) => n.id === id) || {}).name || id;
  const label = el('input', { class: 'field', value: e.label || '', maxlength: '60', placeholder: 'Например: заявки', 'aria-label': 'Подпись стрелки' });
  label.addEventListener('input', () => { e.label = label.value; onChange(); });
  const swap = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Развернуть стрелку' });
  swap.addEventListener('click', onSwap);
  const del = el('button', { type: 'button', class: 'btn btn--danger btn--s', text: 'Удалить стрелку' });
  del.addEventListener('click', onDelete);
  return el('section', { class: 'card stack nodeeditor', 'aria-label': 'Правка стрелки' }, [
    el('h3', { text: `${name(e.from)} → ${name(e.to)}` }),
    labeled('Подпись', label),
    el('div', { class: 'task-form__row' }, [swap, del]),
  ]);
}
