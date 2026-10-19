// «Знания»: хроника работы по проектам, скиллы и промпты. Данные из hub-projects/knowledge, пополняются сами:
// записи кладёт Claude в конце работы и вечерняя запланированная задача, индекс собирает GitHub Actions. В самом хабе ИИ нет.
import { el, fmtTime } from './ui.js';
import { load, save } from './storage.js';
import { SKILLS } from './data/skills-data.js';
import { copyText } from './questions-view.js';
import { buildIndex, search } from './search-calc.js';
import { getKnowledgeState, onKnowledge, loadKnowledge } from './knowledge-data.js';
import { chronicleProjects, groupByDay, dayLabel, chronicleText, doneHeading } from './knowledge-calc.js';

const KEY = 'hub.knowledgeTab';
const KEY_PROJECT = 'hub.knowledgeProject';
const PAGE = 25;
const TABS = [
  { id: 'chronicle', name: 'Хроника' },
  { id: 'skills', name: 'Скиллы' },
  { id: 'prompts', name: 'Промпты' },
];

const kb = (n) => `${Math.max(1, Math.round(n / 1024))} КБ`;
const ruDate = (ymd) => (ymd ? ymd.split('-').reverse().join('.') : '');

function textBlock(body, label) {
  const pre = el('pre', { class: 'skill__text', hidden: '' });
  pre.textContent = body;
  const open = el('button', { type: 'button', class: 'btn btn--s', text: 'Показать текст', 'aria-expanded': 'false' });
  open.addEventListener('click', () => {
    const h = pre.hasAttribute('hidden');
    if (h) pre.removeAttribute('hidden'); else pre.setAttribute('hidden', '');
    open.textContent = h ? 'Скрыть текст' : 'Показать текст';
    open.setAttribute('aria-expanded', String(h));
  });
  const cp = el('button', { type: 'button', class: 'btn btn--s', text: label });
  cp.addEventListener('click', async () => {
    const ok = await copyText(body);
    cp.textContent = ok ? 'Скопировано' : 'Не удалось скопировать';
    setTimeout(() => { cp.textContent = label; }, 1800);
  });
  return [el('div', { class: 'row' }, [open, cp]), pre];
}

// Длинное описание свёрнуто до четырёх строк, нажатие разворачивает.
function about(text) {
  const p = el('p', { class: 'kn-about', text, title: 'Нажми, чтобы развернуть' });
  if (text.length > 220) {
    p.classList.add('kn-about--clamp');
    p.addEventListener('click', () => p.classList.toggle('kn-about--clamp'));
  }
  return p;
}

function skillCard(k) {
  const meta = [k.version ? `Версия ${k.version}` : '', ruDate(k.date)].filter(Boolean).join(' · ');
  const kids = [el('h3', { text: k.name })];
  if (meta) kids.push(el('p', { class: 'muted', text: meta }));
  if (k.about) kids.push(about(k.about));
  if (k.tags && k.tags.length) kids.push(el('p', { class: 'skill__tags' }, k.tags.map((x) => el('span', { class: 'pill', text: x }))));
  kids.push(...textBlock(k.body, 'Копировать текст'));
  if (k.files && k.files.length > 1) kids.push(el('details', { class: 'skill__files' }, [el('summary', { text: `Файлы скилла (${k.files.length})` }), el('ul', {}, k.files.map(([f, n]) => el('li', { text: `${f} · ${kb(n)}` })))]));
  return el('article', { class: 'card skill', 'data-skill': k.id }, kids);
}

function promptCard(p) {
  const kids = [el('h3', { text: p.name })];
  if (p.date) kids.push(el('p', { class: 'muted', text: ruDate(p.date) }));
  if (p.about) kids.push(about(p.about));
  if (p.tags.length) kids.push(el('p', { class: 'skill__tags' }, p.tags.map((x) => el('span', { class: 'pill', text: x }))));
  kids.push(...textBlock(p.body, 'Копировать промпт'));
  return el('article', { class: 'card skill', 'data-prompt': p.id }, kids);
}

function empty(title, text) {
  return el('div', { class: 'empty' }, [el('strong', { text: title }), el('span', { text: text })]);
}

function entryCard(e, onProject) {
  const proj = el('button', { type: 'button', class: 'pill kn-entry__project', text: e.project, title: `Показать только «${e.project}»` });
  proj.addEventListener('click', () => onProject(e.project));
  const head = el('div', { class: 'kn-entry__head' }, [proj]);
  if (e.source) head.append(el('span', { class: 'muted kn-entry__src', text: e.source }));
  const kids = [head];
  if (e.title) kids.push(el('h3', { class: 'kn-entry__title', text: e.title }));
  for (const s of e.sections) {
    kids.push(el('p', { class: 'kn-entry__sec', text: `${s.name === 'Сделано' ? doneHeading(e) : s.name}:` }));
    kids.push(el('ul', { class: 'kn-list' }, s.items.map((t) => el('li', { text: t }))));
  }
  return el('article', { class: 'card kn-entry', 'data-entry': e.id }, kids);
}

function chroniclePanel(data, ui, rerender) {
  const list = data ? data.chronicle : [];
  if (!list.length) {
    return [empty('Хроника пока пуста', 'Записи появляются сами: Claude добавляет их в конце работы, а вечерняя задача в 23:49 по Москве собирает всё за день. Руками ничего класть не нужно.')];
  }
  const projects = chronicleProjects(list);
  if (ui.project && !projects.some((p) => p.name === ui.project)) ui.project = '';
  const q = el('input', { class: 'field', type: 'search', placeholder: 'Поиск по хронике', 'aria-label': 'Поиск по хронике', value: ui.q });
  const chips = el('div', { class: 'kn-chips', role: 'group', 'aria-label': 'Проект' });
  const pick = (name) => { ui.project = name; ui.shown = PAGE; save(KEY_PROJECT, name); rerender(); };
  const chip = (name, label) => {
    const b = el('button', { type: 'button', class: 'chip', text: label, 'aria-pressed': String(ui.project === name) });
    b.addEventListener('click', () => pick(name));
    return b;
  };
  chips.append(chip('', `Все · ${list.length}`), ...projects.map((p) => chip(p.name, `${p.name} · ${p.count}`)));
  const out = el('div', { class: 'stack' });
  const draw = () => {
    let shown = ui.project ? list.filter((e) => e.project === ui.project) : list;
    if (ui.q.trim()) {
      const found = new Set(search(buildIndex(shown.map((e) => ({ id: e.id, title: `${e.project} ${e.title}`, text: chronicleText(e), tags: [], e }))), ui.q, { limit: 500 }).map((d) => d.id));
      shown = shown.filter((e) => found.has(e.id));
    }
    if (!shown.length) { out.replaceChildren(empty('Ничего не найдено', 'Попробуй другое слово или выбери «Все».')); return; }
    const page = shown.slice(0, ui.shown);
    const kids = [];
    for (const g of groupByDay(page)) {
      kids.push(el('h2', { class: 'kn-day', text: dayLabel(g.date) }));
      g.entries.forEach((e) => kids.push(entryCard(e, pick)));
    }
    if (shown.length > page.length) {
      const more = el('button', { type: 'button', class: 'btn', text: `Показать ещё (${shown.length - page.length})` });
      more.addEventListener('click', () => { ui.shown += PAGE; draw(); });
      kids.push(more);
    }
    out.replaceChildren(...kids);
  };
  q.addEventListener('input', () => { ui.q = q.value; ui.shown = PAGE; draw(); });
  draw();
  return [q, chips, out];
}

function catalogPanel(items, card, { placeholder, emptyTitle, emptyText, note }) {
  const kids = [];
  if (note) kids.push(el('p', { class: 'muted', text: note }));
  if (!items.length) return [...kids, empty(emptyTitle, emptyText)];
  const q = el('input', { class: 'field', type: 'search', placeholder, 'aria-label': placeholder });
  const list = el('div', { class: 'stack' });
  const draw = () => {
    const w = q.value.trim().toLowerCase();
    const f = items.filter((k) => !w || `${k.name} ${k.about} ${(k.tags || []).join(' ')} ${k.body}`.toLowerCase().includes(w));
    list.replaceChildren(...(f.length ? f.map(card) : [empty('Ничего не найдено', 'Попробуй другое слово.')]));
  };
  q.addEventListener('input', draw);
  draw();
  return [...kids, q, list];
}

export function knowledgeView() {
  const root = el('section', { class: 'view' }, [el('div', { class: 'view__head' }, [el('h1', { text: 'Знания' }), el('p', { class: 'muted', text: 'Что сделано по каждому проекту, твои скиллы и промпты. Пополняется само из hub-projects.' })])]);
  const ui = { tab: load(KEY, 'chronicle'), project: load(KEY_PROJECT, ''), q: '', shown: PAGE };
  if (ui.tab === 'prompts-skills') ui.tab = 'skills';
  if (!TABS.some((t) => t.id === ui.tab)) ui.tab = 'chronicle';
  const status = el('div', { class: 'kn-status' });
  const seg = el('div', { class: 'seg kn-seg', role: 'group', 'aria-label': 'Раздел знаний' });
  const body = el('section', { class: 'stack' });

  function renderStatus(st) {
    const line = st.busy ? 'Обновляю…' : st.error ? st.error : st.fetchedAt ? `Обновлено ${fmtTime(st.fetchedAt)}` : st.loaded ? 'Ещё не загружалось: нужен токен с доступом к hub-projects' : 'Загружаю…';
    const btn = el('button', { type: 'button', class: 'btn btn--s', text: 'Обновить' });
    btn.disabled = st.busy;
    btn.addEventListener('click', () => loadKnowledge());
    status.replaceChildren(el('span', { class: st.error ? 'kn-status__err' : 'muted', role: 'status', text: line }), btn);
  }

  function render() {
    const st = getKnowledgeState();
    const data = st.data;
    renderStatus(st);
    const skills = data && data.skills.length ? data.skills : SKILLS;
    const counts = { chronicle: data ? data.chronicle.length : 0, skills: skills.length, prompts: data ? data.prompts.length : 0 };
    seg.replaceChildren(...TABS.map((t) => {
      const b = el('button', { type: 'button', text: counts[t.id] ? `${t.name} · ${counts[t.id]}` : t.name, 'aria-pressed': String(t.id === ui.tab) });
      b.addEventListener('click', () => { ui.tab = t.id; save(KEY, t.id); render(); });
      return b;
    }));
    if (ui.tab === 'skills') {
      body.replaceChildren(...catalogPanel(skills, skillCard, {
        placeholder: 'Поиск по скиллам', emptyTitle: 'Скиллов пока нет', emptyText: '',
        note: data && data.skills.length ? 'Новые и изменённые скиллы попадают сюда сами, вечерней задачей.' : 'Показан снимок от 14.10: папка knowledge ещё не загружена.',
      }));
    } else if (ui.tab === 'prompts') {
      body.replaceChildren(...catalogPanel(data ? data.prompts : [], promptCard, {
        placeholder: 'Поиск по промптам', emptyTitle: 'Промптов пока нет', emptyText: 'Скажи Claude «сохрани этот промпт в хаб», и он появится здесь.',
      }));
    } else {
      body.replaceChildren(...chroniclePanel(data, ui, render));
    }
  }

  let seen = false;
  const off = onKnowledge(() => {
    if (root.isConnected) { seen = true; render(); } else if (seen) off();
  });
  render();
  root.append(status, seg, body);
  loadKnowledge();
  return root;
}
