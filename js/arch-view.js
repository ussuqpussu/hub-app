// Схема проекта: рисунок (SVG), панель узла и окно правки. Рисуется нашим кодом, без внешних сервисов.
import { el } from './ui.js';
import { openSheet } from './subs-form.js';
import { NODE_TYPES, NODE_STATUS, normalizeArch, computeLayout, newId, removeNode, emptyArch } from './arch-calc.js';

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

export function renderDiagram(arch, { onNode, selected } = {}) {
  const L = computeLayout(arch);
  const root = svg('svg', { class: 'arch', viewBox: `0 0 ${L.width} ${L.height}`, width: L.width, height: L.height, role: 'group', 'aria-label': 'Схема проекта' });
  root.append(svg('defs', {}, [svg('marker', { id: 'arch-arrow', viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '8', markerHeight: '8', orient: 'auto-start-reverse' }, [svg('path', { d: 'M0,0 L10,5 L0,10 z', class: 'arch__arrowhead' })])]));
  L.groups.forEach((g) => {
    root.append(svg('g', { class: 'arch__group' }, [
      svg('rect', { x: g.x, y: g.y, width: g.w, height: g.h, rx: '6' }),
      Object.assign(svg('text', { x: g.x + 10, y: g.y + 17 }), { textContent: cut(g.name, 40) }),
    ]));
  });
  L.edges.forEach((e) => {
    const g = svg('g', { class: 'arch__edge' }, [svg('path', { d: e.d, 'marker-end': 'url(#arch-arrow)' })]);
    if (e.label) {
      const t = Object.assign(svg('text', { x: e.lx, y: e.ly, 'text-anchor': 'middle' }), { textContent: cut(e.label, 26) });
      g.append(svg('rect', { class: 'arch__labelbg', x: e.lx - Math.min(e.label.length, 26) * 3.4 - 4, y: e.ly - 12, width: Math.min(e.label.length, 26) * 6.8 + 8, height: 16, rx: '3' }), t);
    }
    root.append(g);
  });
  const byId = new Map(arch.nodes.map((n) => [n.id, n]));
  L.nodes.forEach((p) => {
    const n = byId.get(p.id);
    const g = svg('g', { class: 'arch__node', 'data-status': n.status, 'data-id': n.id, 'aria-pressed': String(selected === n.id), role: 'button', tabindex: '0', 'aria-label': `${n.name}. ${NODE_TYPES[n.type]}. ${NODE_STATUS[n.status]}` });
    g.style.setProperty('--node-color', typeColor(n.type));
    g.append(
      svg('title', {}, [document.createTextNode(`${n.name} (${NODE_TYPES[n.type]}, ${NODE_STATUS[n.status].toLowerCase()})`)]),
      svg('rect', { class: 'arch__box', x: p.x, y: p.y, width: p.w, height: p.h, rx: '8' }),
      svg('rect', { class: 'arch__strip', x: p.x, y: p.y, width: '5', height: p.h, rx: '2' }),
      svg('path', { class: 'arch__icon', d: ICON[n.type] || ICON.other, transform: `translate(${p.x + 14},${p.y + 20}) scale(0.95)` }),
      Object.assign(svg('text', { class: 'arch__name', x: p.x + 46, y: p.y + 28 }), { textContent: cut(n.name, 18) }),
      Object.assign(svg('text', { class: 'arch__type', x: p.x + 46, y: p.y + 46 }), { textContent: cut(NODE_TYPES[n.type], 22) }),
      svg('circle', { class: 'arch__dot', cx: p.x + p.w - 14, cy: p.y + 14, r: '5' }),
    );
    const fire = () => onNode && onNode(n);
    g.addEventListener('click', fire);
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); } });
    root.append(g);
  });
  return root;
}

const row = (k, v, link) => (v ? [el('dt', { text: k }), el('dd', {}, [link && /^https?:\/\//i.test(v) ? el('a', { href: v, target: '_blank', rel: 'noopener noreferrer', text: v }) : v])] : []);

export function nodePanel(n, { onEdit } = {}) {
  const box = el('section', { class: 'card stack nodepanel', 'aria-label': `Узел: ${n.name}` });
  const edit = onEdit ? el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Изменить схему' }) : '';
  if (edit) edit.addEventListener('click', onEdit);
  box.append(
    el('div', { class: 'listhead' }, [el('h3', { text: n.name }), el('span', { class: 'listhead__count' }), edit]),
    el('p', { class: 'muted', text: `${NODE_TYPES[n.type]} · ${NODE_STATUS[n.status]}` }),
    el('dl', { class: 'kv' }, [...row('Адрес', n.url, true), ...row('Где размещено', n.host), ...row('Репозиторий', n.repo), ...row('Как выкладывается', n.deploy), ...row('Где лежат ключи', n.keys), ...row('Заметка', n.note)]),
  );
  if (n.questions.length) box.append(el('div', { class: 'stack stack--tight' }, [el('h4', { text: 'Открытые вопросы' }), el('ul', { class: 'hist' }, n.questions.map((q) => el('li', { text: q })))]));
  return box;
}

// Окно правки: узлы, связи, группы. Ключи и пароли не вводятся: поле «Где лежат ключи» только про место.
export function archSheet({ arch, onSave }) {
  openSheet((close) => {
    let a = normalizeArch(JSON.parse(JSON.stringify(arch || emptyArch())));
    const f = el('form', { class: 'sheet__form sub-form arch-form' });
    const err = el('p', { class: 'err', role: 'alert' });
    const body = el('div', { class: 'stack' });
    const sel = (label, value, opts, set) => {
      const s = el('select', { class: 'field', 'aria-label': label }, opts.map(([v, t]) => el('option', { value: v, text: t })));
      s.value = value;
      s.addEventListener('change', () => set(s.value));
      return s;
    };
    const inp = (label, value, set, attrs = {}) => {
      const i = el('input', { class: 'field', 'aria-label': label, placeholder: label, value: value || '', ...attrs });
      i.addEventListener('input', () => set(i.value));
      return i;
    };
    const nodeOpts = () => a.nodes.map((n) => [n.id, n.name]);
    const paint = () => {
      body.replaceChildren();
      // Узлы
      const nodes = el('div', { class: 'stack stack--tight' }, [el('h3', { text: 'Узлы' })]);
      a.nodes.forEach((n) => {
        const d = el('details', { class: 'archrow' }, [el('summary', { text: `${n.name} · ${NODE_TYPES[n.type]}` })]);
        const del = el('button', { type: 'button', class: 'btn btn--danger btn--s', text: 'Убрать узел' });
        del.addEventListener('click', () => { a = removeNode(a, n.id); paint(); });
        d.append(
          inp('Название', n.name, (v) => { n.name = v; d.firstChild.textContent = `${v || '…'} · ${NODE_TYPES[n.type]}`; }, { maxlength: '60' }),
          el('div', { class: 'task-form__row' }, [sel('Тип', n.type, Object.entries(NODE_TYPES), (v) => { n.type = v; }), sel('Статус', n.status, Object.entries(NODE_STATUS), (v) => { n.status = v; })]),
          inp('Адрес (http…)', n.url, (v) => { n.url = v; }),
          inp('Где размещено', n.host, (v) => { n.host = v; }),
          inp('Репозиторий', n.repo, (v) => { n.repo = v; }),
          inp('Как выкладывается', n.deploy, (v) => { n.deploy = v; }),
          inp('Где лежат ключи (только место, без самих ключей)', n.keys, (v) => { n.keys = v; }),
          inp('Заметка', n.note, (v) => { n.note = v; }),
          inp('Открытые вопросы через точку с запятой', n.questions.join('; '), (v) => { n.questions = v.split(';').map((x) => x.trim()).filter(Boolean); }),
          del,
        );
        nodes.append(d);
      });
      const addN = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Добавить узел' });
      addN.addEventListener('click', () => { a.nodes.push({ id: newId(a, 'узел'), type: 'site', name: 'Новый узел', status: 'unknown', url: '', host: '', repo: '', deploy: '', keys: '', note: '', questions: [] }); paint(); });
      nodes.append(addN);
      // Связи
      const edges = el('div', { class: 'stack stack--tight' }, [el('h3', { text: 'Связи (стрелки)' })]);
      a.edges.forEach((e, i) => {
        const del = el('button', { type: 'button', class: 'iconbtn2', 'aria-label': 'Убрать связь', text: '×' });
        del.addEventListener('click', () => { a.edges.splice(i, 1); paint(); });
        edges.append(el('div', { class: 'edgerow' }, [sel('Откуда', e.from, nodeOpts(), (v) => { e.from = v; }), sel('Куда', e.to, nodeOpts(), (v) => { e.to = v; }), inp('Подпись', e.label, (v) => { e.label = v; }, { maxlength: '60' }), del]));
      });
      const addE = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Добавить связь' });
      addE.addEventListener('click', () => {
        if (a.nodes.length < 2) return void (err.textContent = 'Для связи нужно хотя бы два узла.');
        err.textContent = '';
        a.edges.push({ from: a.nodes[0].id, to: a.nodes[1].id, label: '' });
        paint();
      });
      edges.append(addE);
      // Группы
      const groups = el('div', { class: 'stack stack--tight' }, [el('h3', { text: 'Группы (общая рамка)' })]);
      a.groups.forEach((g, gi) => {
        const del = el('button', { type: 'button', class: 'btn btn--danger btn--s', text: 'Убрать группу' });
        del.addEventListener('click', () => { a.groups.splice(gi, 1); paint(); });
        const chips = el('div', { class: 'chips' }, a.nodes.map((n) => {
          const b = el('button', { type: 'button', class: 'chip', 'aria-pressed': String(g.nodes.includes(n.id)), text: n.name });
          b.addEventListener('click', () => { g.nodes = g.nodes.includes(n.id) ? g.nodes.filter((x) => x !== n.id) : [...g.nodes, n.id]; b.setAttribute('aria-pressed', String(g.nodes.includes(n.id))); });
          return b;
        }));
        groups.append(el('div', { class: 'archrow archrow--open stack stack--tight' }, [inp('Название группы', g.name, (v) => { g.name = v; }, { maxlength: '60' }), chips, del]));
      });
      const addG = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Добавить группу' });
      addG.addEventListener('click', () => { a.groups.push({ id: newId(a, 'группа'), name: 'Новая группа', nodes: [] }); paint(); });
      groups.append(addG);
      body.append(nodes, edges, groups);
    };
    paint();
    const save = el('button', { type: 'submit', class: 'btn btn--primary', text: 'Сохранить схему' });
    const cancel = el('button', { type: 'button', class: 'btn btn--ghost', text: 'Отмена' });
    cancel.addEventListener('click', close);
    f.append(el('div', { class: 'sheet__head' }, [el('h2', { text: 'Схема проекта' })]), body, err, el('div', { class: 'task-form__row' }, [save, cancel]));
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (a.nodes.some((n) => !n.name.trim())) return void (err.textContent = 'У каждого узла должно быть название.');
      if (a.nodes.some((n) => n.url && !/^https?:\/\//i.test(n.url))) return void (err.textContent = 'Адрес узла должен начинаться с http:// или https://.');
      save.disabled = true;
      try {
        await onSave(normalizeArch(a));
        close();
      } catch (ex) {
        err.textContent = ex.message || 'Не удалось сохранить';
        save.disabled = false;
      }
    });
    return f;
  });
}
