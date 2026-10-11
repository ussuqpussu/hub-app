// Вкладка «Проекты»: карточки с признаками, фильтры, группировка, сортировка, поиск, плитки и список.
import { el } from './ui.js';
import { todayYmd } from './dates.js';
import { load, save } from './storage.js';
import { openSheet, confirmSheet, readLogoFile } from './subs-form.js';
import { logoNode, dateText } from './subs-parts.js';
import { loadProjects, onProjects, getProjectsState, saveCard, deleteCard } from './projects-data.js';
import { fmtTime } from './ui.js';
import { STATUS_LABEL, STATUS_ORDER, SORTS, GROUPS, NO_COMPANY, NO_TYPE, normalizeProject, filterProjects, sortProjects, groupProjects, companies, typeOptions, parseTags, lastActivity, colorIndex, gaps } from './projects-calc.js';

const KEY = 'hub.projectsUi';
const ui0 = { group: 'none', sort: 'recent', mode: 'tiles', company: null, type: null, status: null };

function select(label, value, options, onChange) {
  const s = el('select', { class: 'field', 'aria-label': label }, options.map(([v, t]) => el('option', { value: v, text: t })));
  s.value = value;
  s.addEventListener('change', () => onChange(s.value));
  return s;
}

function mark(p) {
  const box = logoNode(p);
  if (!p.logo) box.style.setProperty('--logo-bg', `var(--chart-${colorIndex(p.name)})`);
  box.classList.toggle('logo--color', !p.logo);
  return box;
}

function projectSheet({ project, companyList, types, onSave, onDelete, external = false }) {
  openSheet((close) => {
    const f = el('form', { class: 'sheet__form sub-form' });
    const inp = (label, attrs) => el('input', { class: 'field', 'aria-label': label, placeholder: label, ...attrs });
    const name = inp('Название', { type: 'text', maxlength: '80', value: project ? project.name : '' });
    const company = inp('Компания или заказчик', { type: 'text', maxlength: '60', value: project ? project.company : '', list: 'proj-companies' });
    const dl = el('datalist', { id: 'proj-companies' }, companyList.map((c) => el('option', { value: c })));
    const status = select('Статус', project ? project.status : 'active', STATUS_ORDER.map((k) => [k, STATUS_LABEL[k]]), () => {});
    const tags = inp('Теги через запятую', { type: 'text', value: project ? project.tags.join(', ') : '' });
    const summary = el('textarea', { class: 'field field--area', 'aria-label': 'Сводка', placeholder: 'Сводка: что это и в каком состоянии (3–5 строк)', rows: '3', maxlength: '600' });
    summary.value = project ? project.summary : '';
    const next = inp('Следующее действие', { type: 'text', maxlength: '120', value: project ? project.nextAction : '' });
    const links = el('textarea', { class: 'field field--area', 'aria-label': 'Ссылки', placeholder: 'Ссылки, по одной в строке: адрес или «название | адрес»', rows: '2' });
    links.value = project ? project.links.map((l) => (l.title ? `${l.title} | ${l.url}` : l.url)).join('\n') : '';
    const err = el('p', { class: 'err', role: 'alert' });

    let chosen = new Set(project ? project.types : []);
    const extra = types.filter((t) => project && project.types.includes(t) === false).length ? types : types;
    const chips = el('div', { class: 'chips', role: 'group', 'aria-label': 'Тип проекта' });
    const paint = () => chips.replaceChildren(...[...new Set([...types, ...chosen])].map((t) => {
      const b = el('button', { type: 'button', class: 'chip', 'aria-pressed': String(chosen.has(t)), text: t });
      b.addEventListener('click', () => { chosen.has(t) ? chosen.delete(t) : chosen.add(t); paint(); });
      return b;
    }));
    paint();
    const newType = inp('Свой тип', { type: 'text', maxlength: '30' });
    const addType = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Добавить тип' });
    addType.addEventListener('click', () => { const v = newType.value.trim(); if (v) { chosen.add(v); newType.value = ''; paint(); } });

    let logo = project ? project.logo || '' : '';
    const logoPrev = el('span', { class: 'logo logo--l' });
    const paintLogo = () => logoPrev.replaceChildren(mark({ name: name.value || '?', logo }).firstChild || '');
    const logoIn = el('input', { type: 'file', accept: 'image/*', 'aria-label': 'Логотип проекта' });
    const logoBtn = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Логотип' });
    logoBtn.addEventListener('click', () => logoIn.click());
    const logoClear = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Убрать' });
    logoClear.addEventListener('click', () => { logo = ''; paintLogo(); });
    logoIn.addEventListener('change', async () => {
      try { if (logoIn.files[0]) logo = await readLogoFile(logoIn.files[0]); err.textContent = ''; } catch (e) { err.textContent = e.message; }
      logoIn.value = '';
      paintLogo();
    });
    paintLogo();

    // События: новые сверху, добавляются прямо в карточке и сохраняются вместе с ней
    let events = project ? [...project.events] : [];
    const evBox = el('ul', { class: 'hist' });
    const paintEv = () => evBox.replaceChildren(...events.slice(0, 8).map((e, i) => {
      const x = el('button', { type: 'button', class: 'iconbtn2', 'aria-label': 'Удалить событие', text: '×' });
      x.addEventListener('click', () => { events.splice(i, 1); paintEv(); });
      return el('li', { class: 'evline' }, [el('span', { text: `${dateText(e.date)}: ${e.text}` }), x]);
    }));
    const evText = inp('Новое событие', { type: 'text', maxlength: '160' });
    const evAdd = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Добавить событие' });
    evAdd.addEventListener('click', () => {
      const t = evText.value.trim();
      if (!t) return;
      events = [{ date: todayYmd(), text: t, at: Date.now() }, ...events];
      evText.value = '';
      paintEv();
    });
    paintEv();

    const saveBtn = el('button', { type: 'submit', class: 'btn btn--primary', text: project ? 'Сохранить' : 'Добавить проект' });
    const cancel = el('button', { type: 'button', class: 'btn btn--ghost', text: 'Отмена' });
    cancel.addEventListener('click', close);
    const lbl = (t, k) => el('div', { class: 'stack stack--tight' }, [el('span', { class: 'muted', text: t }), k]);
    f.append(
      el('div', { class: 'sheet__head' }, [el('h2', { text: project ? 'Проект' : 'Новый проект' })]),
      external ? el('p', { class: 'sched-note', text: `Эта карточка хранится в Obsidian (${project.path}). Изменения сохранятся в тот же файл на GitHub. Перед правками в Obsidian на компьютере сделай git pull.` }) : '',
      name, company, dl, lbl('Статус', status), lbl('Тип (можно несколько)', chips),
      el('div', { class: 'task-form__row' }, [newType, addType]),
      tags, summary, next,
      lbl('События', el('div', { class: 'stack stack--tight' }, [evBox, el('div', { class: 'task-form__row' }, [evText, evAdd])])),
      links,
      external ? '' : el('div', { class: 'row' }, [logoPrev, el('div', { class: 'task-form__row' }, [logoBtn, logoClear]), logoIn]),
      err, el('div', { class: 'task-form__row' }, [saveBtn, cancel]),
    );
    if (project) {
      const del = el('button', { type: 'button', class: 'btn btn--danger', text: 'Удалить проект' });
      del.addEventListener('click', () => { close(); onDelete(project); });
      f.append(del);
    }
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nm = name.value.trim();
      if (!nm) return void ((err.textContent = 'Напиши название.'), name.focus());
      const ls = links.value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
        const [a, b] = l.includes('|') ? l.split('|').map((x) => x.trim()) : ['', l];
        return { title: a, url: b };
      });
      if (ls.some((l) => !/^https?:\/\//i.test(l.url))) return void ((err.textContent = 'Каждая ссылка должна начинаться с http:// или https://.'), links.focus());
      saveBtn.disabled = true;
      try {
        await onSave({ name: nm, company: company.value.trim(), types: [...chosen], status: status.value, tags: parseTags(tags.value), summary: summary.value.trim(), nextAction: next.value.trim(), events, links: ls, logo, questions: project && project.questions ? project.questions : [] }, project);
        close();
      } catch (ex) {
        err.textContent = ex.message || 'Не удалось сохранить';
        saveBtn.disabled = false;
      }
    });
    return f;
  });
}

export function projectsView({ store, subscribe }) {
  const root = el('section', { class: 'view' }, [el('div', { class: 'view__head' }, [el('h1', { text: 'Проекты' }), el('p', { class: 'muted', text: 'Сайты, боты и всё остальное, что ты делаешь.' })])]);
  let ui = { ...ui0, ...(load(KEY, {}) || {}) };
  let query = '';
  const body = el('div', { class: 'stack' });
  const all = () => [...store.list('projects').map((p) => normalizeProject({ ...p, source: 'hub' })), ...getProjectsState().cards.map(normalizeProject)];
  const persist = () => save(KEY, ui);
  const set = (patch) => { ui = { ...ui, ...patch }; persist(); render(); };
  const onSave = async (fields, prev) => { const { questions, ...rest } = fields; return prev ? store.update('projects', prev.id, rest) : store.add('projects', rest); };
  const askDelete = (p) => confirmSheet({ title: 'Удалить проект?', text: `Карточка «${p.name}» исчезнет. Это нельзя отменить.`, action: 'Удалить', onConfirm: () => store.remove('projects', p.id) });
  const askDeleteCard = (p) => confirmSheet({ title: 'Удалить карточку из Obsidian?', text: `Файл «${p.path}» будет удалён из репозитория hub-projects. На компьютере он исчезнет после git pull. Вернуть можно из истории GitHub.`, action: 'Удалить', onConfirm: async () => { try { await deleteCard(p); } catch (ex) { alert2(ex.message); } } });
  const alert2 = (m) => confirmSheet({ title: 'Не получилось', text: m, action: 'Понятно', onConfirm: () => {} });
  const open = (p) => {
    const list = all();
    const base = { companyList: companies(list), types: typeOptions(list) };
    if (p && p.source === 'obsidian') return projectSheet({ ...base, project: p, external: true, onSave: (fields) => saveCard(p, fields), onDelete: askDeleteCard });
    return projectSheet({ ...base, project: p, onSave, onDelete: askDelete });
  };

  function card(p) {
    const today = todayYmd();
    const ev = p.events[0];
    const g = gaps(p);
    const b = el('button', { type: 'button', class: 'pcard', 'data-status': p.status, 'aria-label': `${p.name}. ${STATUS_LABEL[p.status]}. Открыть` }, [
      el('span', { class: 'pcard__top' }, [mark(p), el('span', { class: 'pcard__title' }, [el('span', { class: 'pcard__name', text: p.name }), el('span', { class: 'muted', text: [p.company || NO_COMPANY, p.types.join(', ') || NO_TYPE].join(' · ') })])]),
      el('span', { class: 'pillrow' }, [el('span', { class: 'pill', text: STATUS_LABEL[p.status] }), p.source === 'obsidian' ? el('span', { class: 'pill pill--src', text: 'Obsidian' }) : '']),
      p.nextAction ? el('span', { class: 'pcard__next' }, [el('b', { text: 'Дальше: ' }), p.nextAction]) : '',
      ev ? el('span', { class: 'muted pcard__ev', text: `${dateText(ev.date, today)}: ${ev.text}` }) : p.summary ? el('span', { class: 'muted pcard__ev', text: p.summary }) : '',
      g.length ? el('span', { class: 'sched-note', text: `Не заполнено: ${g.join(', ')}` }) : '',
    ]);
    b.addEventListener('click', () => open(p));
    return b;
  }

  function render() {
    const list = all();
    const cs = companies(list);
    const ts = typeOptions(list).filter((t) => list.some((p) => p.types.includes(t)));
    const shown = sortProjects(filterProjects(list, { company: ui.company, type: ui.type, status: ui.status, query }), ui.sort);
    const wrap = el('div', { class: 'stack' });
    const add = el('button', { type: 'button', class: 'btn btn--primary btn--s', text: 'Добавить' });
    add.addEventListener('click', () => open(null));
    const search = el('input', { class: 'field', type: 'search', 'aria-label': 'Поиск по названию и тегам', placeholder: 'Поиск по названию и тегам', value: query, autocomplete: 'off' });
    search.addEventListener('input', () => { query = search.value; const pos = search.selectionStart; render(); const s2 = root.querySelector('input[type="search"]'); if (s2) { s2.focus(); s2.setSelectionRange(pos, pos); } });
    const ps = getProjectsState();
    const refresh = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: ps.busy ? 'Обновляю…' : 'Обновить', ...(ps.busy ? { disabled: '' } : {}) });
    refresh.addEventListener('click', () => loadProjects());
    wrap.append(el('div', { class: 'listhead' }, [el('h2', { text: 'Карточки' }), el('span', { class: 'listhead__count', text: String(shown.length) }), refresh, add]), search);
    const line = ps.error ? `Obsidian: ${ps.error}.${ps.cards.length ? ` Показана копия от ${fmtTime(Date.parse(ps.fetchedAt))}.` : ''}` : ps.fetchedAt ? `Из Obsidian: ${ps.cards.length}, обновлено ${fmtTime(Date.parse(ps.fetchedAt))}.${ps.skipped ? ` Заметок без блока свойств пропущено: ${ps.skipped}.` : ''}` : 'Obsidian: ещё не загружено.';
    wrap.append(el('p', { class: ps.error ? 'err' : 'sched-note', role: ps.error ? 'alert' : 'status', text: line }));
    if (list.length) {
      const companyOpts = [['', 'Все компании'], [NO_COMPANY, NO_COMPANY], ...cs.map((c) => [c, c])];
      const typeOpts = [['', 'Все типы'], [NO_TYPE, NO_TYPE], ...ts.map((t) => [t, t])];
      const statusOpts = [['', 'Все статусы'], ...STATUS_ORDER.map((k) => [k, STATUS_LABEL[k]])];
      const filtered = ui.company !== null || ui.type !== null || ui.status !== null;
      const reset = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Сбросить', ...(filtered ? {} : { disabled: '' }) });
      reset.addEventListener('click', () => set({ company: null, type: null, status: null }));
      wrap.append(
        el('div', { class: 'pfilters' }, [
          select('Компания', ui.company ?? '', companyOpts, (v) => set({ company: v || null })),
          select('Тип', ui.type ?? '', typeOpts, (v) => set({ type: v || null })),
          select('Статус', ui.status ?? '', statusOpts, (v) => set({ status: v || null })),
          reset,
        ]),
        el('div', { class: 'pfilters' }, [
          select('Группировать по', ui.group, Object.entries(GROUPS), (v) => set({ group: v })),
          select('Сортировка', ui.sort, Object.entries(SORTS), (v) => set({ sort: v })),
          select('Вид', ui.mode, [['tiles', 'Плитки'], ['list', 'Список']], (v) => set({ mode: v })),
        ]),
      );
    }
    if (!list.length) wrap.append(el('div', { class: 'empty' }, [el('strong', { text: 'Проектов пока нет' }), el('span', { text: 'Добавь первый. Позже карточки можно будет подтягивать из Obsidian.' })]));
    else if (!shown.length) wrap.append(el('div', { class: 'empty' }, [el('strong', { text: 'Ничего не найдено' }), el('span', { text: 'Измени поиск или сбрось фильтры.' })]));
    else {
      groupProjects(shown, ui.group).forEach((g) => {
        const sec = el('section', { class: 'stack stack--tight' });
        if (g.label) {
          const first = g.items.find((p) => p.logo);
          sec.append(el('h3', { class: 'dayt pgroup' }, [ui.group === 'company' && first ? mark(first) : '', el('span', { text: g.label }), el('span', { class: 'muted', text: String(g.items.length) })]));
        }
        sec.append(el('div', { class: ui.mode === 'list' ? 'pgrid pgrid--list' : 'pgrid' }, g.items.map(card)));
        wrap.append(sec);
      });
    }
    body.replaceChildren(wrap);
  }

  let sig = '';
  let dirty = false;
  const signature = () => store.list('projects').map((s) => `${s.id}:${s.updatedAt}`).join(',');
  subscribe(() => {
    const n = signature();
    if (n !== sig) { sig = n; if (!document.querySelector('dialog[open]')) render(); else dirty = true; }
  });
  document.addEventListener('close', () => { if (dirty && root.isConnected) { dirty = false; setTimeout(render, 0); } }, true);
  sig = signature();
  const offP = onProjects(() => { if (!root.isConnected) return offP(); if (!document.querySelector('dialog[open]')) render(); else dirty = true; });
  loadProjects();
  render();
  root.append(body);
  return root;
}
