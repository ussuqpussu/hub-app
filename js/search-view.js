// Общий поиск: окно с одной строкой и подсказками по всему хабу. Всё считается на устройстве.
import { el, ICONS } from './ui.js';
import { load, save } from './storage.js';
import { mergedProjects, mark } from './projects-view.js';
import { getProjectsState, onProjects, loadProjects } from './projects-data.js';
import { allQuestions } from './questions-view.js';
import { buildFeed } from './feed-calc.js';
import { ruporPosts } from './rupor-view.js';
import { noteTitle } from './notes-calc.js';
import { STATUS_LABEL } from './projects-calc.js';
import { buildIndex, search, matchCompanies } from './search-calc.js';

const KIND = { project: 'Проекты', task: 'Задачи', note: 'Заметки и ссылки', question: 'Открытые вопросы', event: 'События', post: 'Рупор', inbox: 'Входящие', sub: 'Подписки', goal: 'Цели' };
const ORDER = ['project', 'task', 'question', 'note', 'event', 'post', 'goal', 'sub', 'inbox'];
const PER_KIND = 5;

export function buildDocs(store) {
  const projects = mergedProjects(store);
  const docs = [];
  projects.forEach((p) => docs.push({ id: `p:${p.id}`, kind: 'project', title: p.name, text: [p.company, (p.types || []).join(' '), p.role, p.summary, p.nextAction].filter(Boolean).join(' '), tags: p.tags || [], hash: `#/projects/${encodeURIComponent(p.id)}`, meta: [p.company, STATUS_LABEL[p.status]].filter(Boolean).join(' · ') }));
  store.list('tasks').forEach((t) => docs.push({ id: `t:${t.id}`, kind: 'task', title: t.title, text: t.project || '', tags: [], hash: '#/tasks', meta: [t.done ? 'сделано' : t.due || '', t.project].filter(Boolean).join(' · ') }));
  store.list('goals').forEach((g) => docs.push({ id: `g:${g.id}`, kind: 'goal', title: g.title, text: g.area || '', tags: [], hash: '#/tasks', meta: `${g.progress}%` }));
  store.list('inbox').filter((i) => !i.resolved).forEach((i) => docs.push({ id: `i:${i.id}`, kind: 'inbox', title: i.text, text: '', tags: [], hash: '#/tasks', meta: i.type }));
  store.list('notes').forEach((n) => docs.push({ id: `n:${n.id}`, kind: 'note', title: noteTitle(n), text: `${n.text || ''} ${n.url || ''}`, tags: n.tags || [], hash: '#/notes', meta: n.kind === 'link' ? 'Ссылка' : 'Заметка' }));
  store.list('subs').forEach((s) => docs.push({ id: `s:${s.id}`, kind: 'sub', title: s.name, text: s.category || '', tags: [], hash: '#/subscriptions', meta: s.status === 'active' ? 'активна' : '' }));
  allQuestions(store, projects).forEach((q, i) => docs.push({ id: `q:${i}:${q.text}`, kind: 'question', title: q.text, text: q.project || '', tags: [], hash: '#/tasks', meta: q.project || '' }));
  buildFeed(projects).slice(0, 400).forEach((e, i) => docs.push({ id: `e:${i}`, kind: 'event', title: e.text, text: e.project, tags: [], hash: `#/projects/${encodeURIComponent(e.projectId)}`, meta: `${e.project} · ${e.date}` }));
  ruporPosts(store).forEach((p) => docs.push({ id: `r:${p.id}`, kind: 'post', title: p.title, text: [p.topic, p.rubric, p.texts.dzen.text].join(' '), tags: p.hashtags.map((h) => h.slice(1)), post: p.id, meta: p.date }));
  return { docs, projects };
}

const siteOf = (p) => (p.links || []).find((l) => /сайт|site|web/i.test(l.title || '') || (!/t\.me|telegram|vk\.|dzen/i.test(l.url) && /^https?:/.test(l.url)));

export function initSearch({ store, button, extraButtons = [] }) {
  const dlg = el('dialog', { class: 'sheet sheet--tall searchbox', 'aria-label': 'Поиск по хабу' });
  const input = el('input', { class: 'field', type: 'text', role: 'searchbox', inputmode: 'search', enterkeyhint: 'search', 'aria-label': 'Поиск по хабу', placeholder: 'Проекты, задачи, заметки, посты…', autocomplete: 'off' });
  const out = el('div', { class: 'stack searchbox__out', role: 'region', 'aria-live': 'polite', 'aria-label': 'Результаты поиска' });
  const closeBtn = el('button', { type: 'button', class: 'iconbtn2', 'aria-label': 'Закрыть поиск', html: ICONS.close });
  dlg.append(el('div', { class: 'sheet__head' }, [el('h2', { text: 'Поиск' }), closeBtn]), input, out);
  document.body.append(dlg);
  let built = null;
  let dirty = true;
  store.on(() => { dirty = true; });
  onProjects(() => { dirty = true; });
  const close = () => { if (dlg.open) dlg.close(); };
  closeBtn.addEventListener('click', close);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });

  function go(d) {
    close();
    if (d.post) {
      const ui = load('hub.projectsUi', {}) || {};
      save('hub.projectsUi', { ...ui, tab: 'rupor', rSub: 'posts', rPost: d.post });
      location.hash = '#/projects';
      if (location.hash === '#/projects') window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else location.hash = d.hash;
  }

  function companyBlock(name, projects) {
    const list = projects.filter((p) => (p.company || '') === name);
    const box = el('section', { class: 'card stack stack--tight searchco' }, [el('h3', { text: name })]);
    list.forEach((p) => {
      const site = siteOf(p);
      const open = el('button', { type: 'button', class: 'btn btn--s', text: 'Открыть карточку' });
      open.addEventListener('click', () => go({ hash: `#/projects/${encodeURIComponent(p.id)}` }));
      const row = el('div', { class: 'searchco__proj' }, [
        el('div', { class: 'searchco__head' }, [mark(p), el('span', { class: 'qhead__text' }, [el('strong', { text: p.name }), el('span', { class: 'muted', text: STATUS_LABEL[p.status] })])]),
      ]);
      const about = p.role || (p.summary || '').split('\n')[0];
      if (about) row.append(el('p', { class: 'muted', text: about }));
      const evs = (p.events || []).slice(0, 2);
      if (evs.length) row.append(el('ul', { class: 'hist' }, evs.map((e) => el('li', { text: `${e.date}: ${e.text}` }))));
      const qs = (p.questions || []).slice(0, 3);
      if (qs.length) row.append(el('div', {}, [el('span', { class: 'qtile__kind', text: 'Открытые вопросы' }), el('ul', { class: 'hist' }, qs.map((q) => el('li', { text: q })))]));
      const btns = [open];
      if (site) btns.push(el('a', { class: 'btn btn--s btn--ghost', href: site.url, target: '_blank', rel: 'noopener noreferrer', text: 'Открыть сайт' }));
      row.append(el('div', { class: 'pillrow' }, btns));
      box.append(row);
    });
    return box;
  }

  function paint() {
    const q = input.value;
    out.replaceChildren();
    if (!q.trim()) { out.append(el('p', { class: 'muted', text: 'Начни печатать: ищу по проектам, задачам, вопросам, заметкам, событиям, постам «Рупора», целям и подпискам. Всё на этом устройстве, без сети.' })); return; }
    if (dirty || !built) { const b = buildDocs(store); built = { index: buildIndex(b.docs), projects: b.projects }; dirty = false; }
    const names = [...new Set(built.projects.map((p) => p.company).filter(Boolean))];
    const cos = matchCompanies(names, q).slice(0, 2);
    cos.forEach((c) => out.append(companyBlock(c, built.projects)));
    const found = search(built.index, q, { limit: 120 });
    const by = new Map();
    found.forEach((d) => { if (!by.has(d.kind)) by.set(d.kind, []); by.get(d.kind).push(d); });
    if (!found.length && !cos.length) { out.append(el('div', { class: 'empty' }, [el('strong', { text: 'Ничего не найдено' }), el('span', { text: 'Попробуй другое слово или часть слова.' })])); return; }
    ORDER.filter((k) => by.has(k)).forEach((k) => {
      const items = by.get(k);
      out.append(el('section', { class: 'stack stack--tight' }, [
        el('h3', { class: 'searchbox__kind', text: `${KIND[k]} · ${items.length}` }),
        el('ul', { class: 'searchlist' }, items.slice(0, PER_KIND).map((d) => {
          const b = el('button', { type: 'button', class: 'searchrow' }, [el('span', { class: 'searchrow__title', text: d.title }), d.meta ? el('span', { class: 'muted', text: d.meta }) : '']);
          b.addEventListener('click', () => go(d));
          return el('li', {}, [b]);
        })),
      ]));
    });
  }
  input.addEventListener('input', paint);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Enter') { const first = out.querySelector('.searchrow'); if (first) first.click(); }
  });

  function open() {
    if (!dlg.open) { if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', ''); }
    loadProjects({ refresh: false });
    input.focus();
    input.select();
    paint();
  }
  [button, ...extraButtons].filter(Boolean).forEach((b) => b.addEventListener('click', open));
  document.addEventListener('keydown', (e) => {
    const typing = /^(input|textarea|select)$/i.test(document.activeElement && document.activeElement.tagName) || (document.activeElement && document.activeElement.isContentEditable);
    if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing && !document.querySelector('dialog[open]'))) { e.preventDefault(); open(); }
  });
  return { open, close };
}
