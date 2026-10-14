// Вкладка «Задачи»: задачи и вопросы по проектам одним списком плиток. Входящие и цели лежат ниже, в сворачиваемых блоках.
import { el, ICONS, fmtTime } from './ui.js';
import { load, save } from './storage.js';
import { todayYmd, dueLabel, parseQuick, isYmd, isHm } from './dates.js';
import { playSound } from './appearance.js';
import { goalsPanel } from './goals-view.js';
import { questionTile, allQuestions, copyButton } from './questions-view.js';
import { NO_PROJECT } from './questions-calc.js';
import { refKey, STATUS_LABEL } from './projects-calc.js';
import { mergedProjects, mark } from './projects-view.js';
import { loadProjects, onProjects, getProjectsState } from './projects-data.js';

const KEY_TAB = 'hub.tasksTab';
const KEY_UI = 'hub.tasksUi';
export const INBOX_OLD_DAYS = 7;
export const MAIN_LIMIT = 3;

// Открыть блок на странице «Задачи» (используется ссылками с «Сегодня»): 'inbox' или 'goals' раскрывает блок ниже.
export function openTasksTab(tab) {
  save(KEY_TAB, tab);
}

const TYPE_NAMES = { task: 'Задача', note: 'Заметка', event: 'Событие', question: 'Открытый вопрос', idea: 'Идея' };

// Порядок: сначала со сроком по дате и времени, потом без срока по времени создания.
function byDue(a, b) {
  const ka = a.due ? `${a.due} ${a.time || '99:99'}` : '9999';
  const kb = b.due ? `${b.due} ${b.time || '99:99'}` : '9999';
  if (ka !== kb) return ka < kb ? -1 : 1;
  return a.created - b.created;
}

export function groupTasks(tasks, today = todayYmd()) {
  const open = tasks.filter((t) => !t.done);
  return {
    overdue: open.filter((t) => t.due && t.due < today).sort(byDue),
    today: open.filter((t) => t.due === today).sort(byDue),
    later: open.filter((t) => t.due && t.due > today).sort(byDue),
    nodue: open.filter((t) => !t.due).sort(byDue),
    done: tasks.filter((t) => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)),
  };
}

const sel = (label, value, options, onChange) => {
  const s = el('select', { class: 'field', 'aria-label': label }, options.map(([v, t]) => el('option', { value: v, text: t })));
  s.value = value;
  s.addEventListener('change', () => onChange(s.value));
  return s;
};

export function tasksView({ store, subscribe }) {
  const root = el('section', { class: 'view' }, [
    el('div', { class: 'view__head' }, [
      el('h1', { text: 'Задачи' }),
      el('p', { class: 'muted', text: 'Задачи и вопросы по проектам в одном списке.' }),
    ]),
  ]);

  let ui = { show: 'all', group: 'project', project: null, ...(load(KEY_UI, {}) || {}) };
  let want = load(KEY_TAB, 'tasks');
  save(KEY_TAB, 'tasks');
  let openBox = { inbox: want === 'inbox', goals: want === 'goals' };
  let editingGoal = null;
  let editingId = null;
  let projectFor = null; // запись «Входящих», у которой открыт ввод проекта
  let msg = '';

  const body = el('div', { class: 'stack' });
  const live = el('p', { class: 'muted', role: 'status', 'aria-live': 'polite' });
  const setUi = (patch) => { ui = { ...ui, ...patch }; save(KEY_UI, ui); render(); };

  const openInbox = () => store.list('inbox').filter((it) => !it.resolved);

  // ---------- Входящие ----------
  function toTask(it, project = '') {
    const q = parseQuick(it.text);
    return store
      .add('tasks', { title: q.title, due: q.due, time: q.time, project, done: false, main: false })
      .then(() => store.update('inbox', it.id, { resolved: true, movedTo: 'tasks' }))
      .then(() => {
        msg = 'Перенесено в задачи.';
      });
  }

  function inboxItem(it) {
    const old = Date.now() - it.created > INBOX_OLD_DAYS * 24 * 3600 * 1000;
    const isNote = it.type === 'note';
    const li = el('li', { class: `inbox__item${old ? ' inbox__item--old' : ''}` });
    const del = el('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Удалить запись', html: ICONS.close });
    del.addEventListener('click', () => store.remove('inbox', it.id));
    li.append(el('span', { class: 'inbox__text', text: it.text }), del);
    li.append(el('span', { class: 'inbox__meta', text: `${TYPE_NAMES[it.type] || it.type} · ${fmtTime(it.created)}${old ? ' · висит больше недели' : ''}` }));

    const acts = el('div', { class: 'inbox__acts' });
    const mk = (label, fn, extra = '') => {
      const b = el('button', { type: 'button', class: `btn btn--ghost btn--s ${extra}`.trim(), text: label });
      b.addEventListener('click', fn);
      acts.append(b);
    };
    mk('В задачи', () => toTask(it));
    if (!isNote) mk('В заметки', () => store.update('inbox', it.id, { type: 'note' }).then(() => { msg = 'Помечено как заметка. Раздел «Заметки» появится позже, запись пока лежит здесь.'; render(); }));
    mk('К проекту', () => {
      projectFor = projectFor === it.id ? null : it.id;
      render();
    });
    mk('Разобрано', () => store.update('inbox', it.id, { resolved: true, movedTo: it.movedTo || 'done' }));
    li.append(acts);

    if (projectFor === it.id) {
      const form = el('form', { class: 'inline-form' });
      const inp = el('input', { class: 'field', type: 'text', 'aria-label': 'Название проекта', placeholder: 'Название проекта', maxlength: '60' });
      const go = el('button', { type: 'submit', class: 'btn btn--primary btn--s', text: 'Создать задачу' });
      form.append(inp, go);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = inp.value.trim();
        if (!name) {
          inp.focus();
          return;
        }
        projectFor = null;
        toTask(it, name);
      });
      li.append(form);
      setTimeout(() => inp.focus(), 0);
    }
    return li;
  }

  function inboxBox() {
    const items = openInbox();
    const box = el('details', { class: 'tbox', ...(openBox.inbox ? { open: '' } : {}) }, [el('summary', { text: `Входящие · ${items.length}` })]);
    box.addEventListener('toggle', () => { openBox.inbox = box.open; });
    if (!items.length) {
      box.append(el('div', { class: 'empty' }, [el('strong', { text: 'Входящих нет' }), el('span', { text: 'Записи из кнопки «+» и ярлыков появятся здесь, пока ты их не разберёшь.' })]));
      return box;
    }
    const ul = el('ul', { class: 'inbox' });
    items.forEach((it) => ul.append(inboxItem(it)));
    box.append(ul);
    return box;
  }

  // ---------- Добавление ----------
  function addForm(projects) {
    let kind = 'task';
    const form = el('form', { class: 'task-form card' });
    const seg = el('div', { class: 'seg seg--s', role: 'group', 'aria-label': 'Что добавить' });
    const title = el('input', { class: 'field', type: 'text', 'aria-label': 'Название задачи', placeholder: 'Что сделать? «завтра 15:00 лаба»', maxlength: '200' });
    const due = el('input', { class: 'field', type: 'date', 'aria-label': 'Срок' });
    const time = el('input', { class: 'field', type: 'time', 'aria-label': 'Время' });
    const dueRow = el('div', { class: 'task-form__row' }, [due, time]);
    const project = el('input', { class: 'field', type: 'text', 'aria-label': 'Проект', placeholder: 'Проект (необязательно)', maxlength: '60', list: 'tasks-projects' });
    const dl = el('datalist', { id: 'tasks-projects' }, projects.map((p) => el('option', { value: p.name })));
    const who = sel('У кого спросить', 'unset', Object.entries({ unset: 'Не указано', customer: 'Заказчик', me: 'Я сам', other: 'Кто-то ещё' }), () => {});
    who.hidden = true;
    const err = el('p', { class: 'err', role: 'alert' });
    const submit = el('button', { type: 'submit', class: 'btn btn--primary', text: 'Добавить' });
    const paint = () => {
      seg.replaceChildren(...[['task', 'Задача'], ['question', 'Вопрос']].map(([k, t]) => {
        const b = el('button', { type: 'button', 'aria-pressed': String(kind === k), text: t });
        b.addEventListener('click', () => { kind = k; paint(); });
        return b;
      }));
      title.setAttribute('aria-label', kind === 'task' ? 'Название задачи' : 'Новый вопрос');
      title.placeholder = kind === 'task' ? 'Что сделать? «завтра 15:00 лаба»' : 'Что нужно выяснить';
      dueRow.hidden = kind !== 'task';
      who.hidden = kind !== 'question';
      submit.textContent = kind === 'task' ? 'Добавить' : 'Добавить вопрос';
    };
    paint();
    const more = el('details', { class: 'task-form__more' }, [el('summary', { text: 'Срок, проект, вопрос' }), el('div', { class: 'stack stack--tight' }, [seg, dueRow, project, dl, who])]);
    form.append(el('div', { class: 'task-form__row task-form__main' }, [title, submit]), more, err);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = '';
      let t = title.value.trim();
      if (!t) {
        err.textContent = kind === 'task' ? 'Напиши название задачи.' : 'Напиши вопрос.';
        title.focus();
        return;
      }
      const pname = project.value.trim();
      if (kind === 'question') {
        const p = projects.find((x) => refKey(x.name) === refKey(pname));
        await store.add('questions', { origin: 'manual', text: t, projectId: p ? p.id : '', projectName: p ? p.name : pname, who: who.value, status: 'open', created: Date.now() });
        msg = 'Вопрос добавлен.';
        return render();
      }
      let d = due.value || null;
      let tm = time.value || null;
      if (!d && !tm) {
        // «завтра 15:00 сдать лабу» прямо в названии
        const q = parseQuick(t);
        t = q.title;
        d = q.due;
        tm = q.time;
      }
      if (d && !isYmd(d)) d = null;
      if (tm && !isHm(tm)) tm = null;
      if (tm && !d) d = todayYmd();
      await store.add('tasks', { title: t, due: d, time: tm, project: pname, done: false, main: false });
      msg = 'Задача добавлена.';
      render();
    });
    return form;
  }

  function editForm(task) {
    const form = el('form', { class: 'task-form card' });
    const title = el('input', { class: 'field', type: 'text', 'aria-label': 'Название задачи', maxlength: '200', value: task.title });
    const due = el('input', { class: 'field', type: 'date', 'aria-label': 'Срок', value: task.due || '' });
    const time = el('input', { class: 'field', type: 'time', 'aria-label': 'Время', value: task.time || '' });
    const project = el('input', { class: 'field', type: 'text', 'aria-label': 'Проект', placeholder: 'Проект (необязательно)', maxlength: '60', value: task.project || '', list: 'tasks-projects' });
    const err = el('p', { class: 'err', role: 'alert' });
    const submit = el('button', { type: 'submit', class: 'btn btn--primary', text: 'Сохранить' });
    const cancel = el('button', { type: 'button', class: 'btn btn--ghost', text: 'Отмена' });
    cancel.addEventListener('click', () => { editingId = null; render(); });
    form.append(title, el('div', { class: 'task-form__row' }, [due, time]), project, err, el('div', { class: 'task-form__row' }, [submit, cancel]));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const t = title.value.trim();
      if (!t) { err.textContent = 'Напиши название задачи.'; title.focus(); return; }
      let d = due.value || null;
      let tm = time.value || null;
      if (d && !isYmd(d)) d = null;
      if (tm && !isHm(tm)) tm = null;
      if (tm && !d) d = todayYmd();
      await store.update('tasks', task.id, { title: t, due: d, time: tm, project: project.value.trim() });
      editingId = null;
      render();
    });
    return form;
  }

  // ---------- Плитка задачи ----------
  function taskTile(t, today, { showProject = false } = {}) {
    if (t.id === editingId) {
      const li = el('li', { class: 'qtile--form' });
      li.append(editForm(t));
      setTimeout(() => li.querySelector('input') && li.querySelector('input').focus(), 0);
      return li;
    }
    const li = el('li', { class: `qtile ttile${t.done ? ' ttile--done' : ''}`, 'data-status': t.done ? 'resolved' : 'open', 'data-kind': 'task' });
    const star = el('button', {
      type: 'button',
      class: 'iconbtn task__star',
      'aria-pressed': String(!!t.main),
      'aria-label': t.main ? 'Убрать из главных на сегодня' : 'Сделать главной',
      html: ICONS.star,
    });
    star.addEventListener('click', () => {
      if (!t.main) {
        const count = store.list('tasks').filter((x) => x.main && !x.done).length;
        if (count >= MAIN_LIMIT) {
          msg = `Главных задач не больше ${MAIN_LIMIT}. Сними отметку с другой.`;
          render();
          return;
        }
      }
      msg = '';
      store.update('tasks', t.id, { main: !t.main });
    });
    const top = el('div', { class: 'qtile__top' }, [el('span', { class: 'qtile__kind', text: 'Задача' })]);
    if (!t.done) top.append(star);
    const text = el('p', { class: 'qtile__text task__title', text: t.title, title: t.title });
    text.addEventListener('click', () => text.closest('.qtile').classList.toggle('qtile--open'));
    const kids = [top, text];
    const meta = [];
    if (t.due) meta.push(`${dueLabel(t.due, today)}${t.time ? ` ${t.time}` : ''}`);
    if (showProject && t.project) meta.push(t.project);
    if (meta.length) kids.push(el('span', { class: `qtile__proj${t.due && t.due < today && !t.done ? ' qtile__proj--late' : ''}`, text: meta.join(' · ') }));
    const check = el('button', {
      type: 'button',
      class: 'qtile__done',
      role: 'checkbox',
      'aria-checked': String(!!t.done),
      'aria-label': t.done ? `Вернуть в работу: ${t.title}` : `Выполнено: ${t.title}`,
      text: t.done ? 'Вернуть' : 'Готово',
    });
    check.addEventListener('click', () => { if (!t.done) playSound('done'); store.update('tasks', t.id, { done: !t.done, doneAt: !t.done ? Date.now() : null, main: !t.done ? false : t.main }); });
    const edit = el('button', { type: 'button', class: 'iconbtn', 'aria-label': `Изменить: ${t.title}`, html: ICONS.edit });
    edit.addEventListener('click', () => { editingId = t.id; render(); });
    const del = el('button', { type: 'button', class: 'iconbtn', 'aria-label': `Удалить: ${t.title}`, html: ICONS.close });
    del.addEventListener('click', () => store.remove('tasks', t.id));
    kids.push(el('div', { class: 'qtile__foot qtile__foot--task' }, [check, el('span', { class: 'task__tools' }, [edit, del])]));
    li.append(...kids);
    return li;
  }

  // ---------- Список ----------
  function renderList(projects, today) {
    const questions = allQuestions(store, projects);
    const tasks = store.list('tasks');
    const showT = ui.show !== 'questions';
    const showQ = ui.show !== 'tasks';
    // Ключ группы: проект из хаба по названию, иначе само название, иначе «Без проекта»
    const keyForTask = (t) => {
      const p = projects.find((x) => refKey(x.name) === refKey(t.project));
      if (p) return { key: p.id, label: p.name, project: p };
      return t.project ? { key: `n:${refKey(t.project)}`, label: t.project, project: null } : { key: 'none', label: NO_PROJECT, project: null };
    };
    const keyForQuestion = (q) => {
      const p = projects.find((x) => x.id === q.projectId);
      if (p) return { key: p.id, label: p.name, project: p };
      return q.projectId || q.project !== NO_PROJECT ? { key: `n:${refKey(q.project)}`, label: q.project, project: null } : { key: 'none', label: NO_PROJECT, project: null };
    };
    const openQ = questions.filter((q) => q.status === 'open');
    const parkedQ = questions.filter((q) => q.status === 'postponed');
    const doneQ = questions.filter((q) => q.status === 'resolved');
    const g = groupTasks(tasks, today);
    const openT = [...g.overdue, ...g.today, ...g.later, ...g.nodue];

    const filterKey = (k) => ui.project === null || ui.project === k;
    const entries = [];
    if (showT) openT.forEach((t) => { const k = keyForTask(t); if (filterKey(k.key)) entries.push({ ...k, kind: 'task', item: t }); });
    if (showQ) openQ.forEach((q) => { const k = keyForQuestion(q); if (filterKey(k.key)) entries.push({ ...k, kind: 'question', item: q }); });

    const note = el('p', { class: 'sched-note', role: 'status' });
    const list = el('div', { class: 'stack' });
    if (!entries.length) {
      list.append(el('div', { class: 'empty' }, [el('strong', { text: 'Открытых дел нет' }), el('span', { text: 'Добавь задачу или вопрос выше. Вопросы из заметок проектов появятся здесь сами.' })]));
    } else if (ui.group === 'due') {
      const sections = [['Просрочено', (e) => e.kind === 'task' && e.item.due && e.item.due < today, 'qgroup--late'], ['Сегодня', (e) => e.kind === 'task' && e.item.due === today], ['Дальше', (e) => e.kind === 'task' && e.item.due && e.item.due > today], ['Без срока', (e) => e.kind === 'question' || !e.item.due]];
      sections.forEach(([title, test, cls]) => {
        const part = entries.filter(test);
        if (!part.length) return;
        list.append(el('section', { class: `qgroup stack stack--tight ${cls || ''}`.trim() }, [
          el('div', { class: 'qhead qhead--plain' }, [el('div', { class: 'qhead__text' }, [el('h3', { class: 'qhead__title', text: title })])]),
          el('ul', { class: 'qgrid', 'data-n': String(Math.min(part.length, 4)) }, part.map((e) => (e.kind === 'task' ? taskTile(e.item, today, { showProject: true }) : questionTile(store, e.item, { showProject: true })))),
        ]));
      });
    } else {
      const groups = new Map();
      entries.forEach((e) => { if (!groups.has(e.key)) groups.set(e.key, { ...e, items: [] }); groups.get(e.key).items.push(e); });
      [...groups.values()].sort((a, b) => (a.key === 'none') - (b.key === 'none') || a.label.localeCompare(b.label, 'ru')).forEach((gr) => {
        const p = gr.project;
        const sec = el('section', { class: 'qgroup stack stack--tight' });
        sec.append(el('div', { class: 'qhead' }, [
          mark(p || { name: gr.label }),
          el('div', { class: 'qhead__text' }, [el('h3', { class: 'qhead__title', text: gr.label }), el('span', { class: 'muted', text: p ? [p.company, STATUS_LABEL[p.status]].filter(Boolean).join(' · ') : gr.key === 'none' ? 'Дела без проекта' : 'Проект не заведён в «Проектах»' })]),
        ]));
        sec.append(el('ul', { class: 'qgrid', 'data-n': String(Math.min(gr.items.length, 4)) }, gr.items.map((e) => (e.kind === 'task' ? taskTile(e.item, today) : questionTile(store, e.item)))));
        if (p && gr.items.some((e) => e.kind === 'question')) sec.append(copyButton(questions, p.id, p.name, note));
        list.append(sec);
      });
    }
    list.append(note);

    // Отложенные вопросы и сделанное: внизу, свёрнуто
    const parked = parkedQ.filter((q) => showQ && filterKey(keyForQuestion(q).key));
    if (parked.length) list.append(el('details', { class: 'tbox' }, [el('summary', { text: `Отложено · ${parked.length}` }), el('ul', { class: 'qgrid' }, parked.map((q) => questionTile(store, q, { showProject: true })))]));
    const doneT = showT ? g.done.filter((t) => filterKey(keyForTask(t).key)) : [];
    const doneQs = showQ ? doneQ.filter((q) => filterKey(keyForQuestion(q).key)) : [];
    if (doneT.length + doneQs.length) {
      list.append(el('details', { class: 'tbox done-box' }, [el('summary', { text: `Сделано · ${doneT.length + doneQs.length}` }), el('ul', { class: 'qgrid' }, [...doneT.slice(0, 20).map((t) => taskTile(t, today, { showProject: true })), ...doneQs.slice(0, 20).map((q) => questionTile(store, q, { showProject: true }))])]));
    }
    return { list, counts: { tasks: openT.length, questions: openQ.length }, groupsForFilter: [...new Map([...openT.map(keyForTask), ...openQ.map(keyForQuestion)].map((k) => [k.key, k.label])).entries()] };
  }

  function render() {
    sig = signature();
    stale = false;
    const today = todayYmd();
    const projects = mergedProjects(store);
    const { list, counts, groupsForFilter } = renderList(projects, today);
    const filters = el('div', { class: 'tfilters' }, [
      el('div', { class: 'seg seg--s', role: 'group', 'aria-label': 'Что показывать' }, [['all', `Всё ${counts.tasks + counts.questions}`], ['tasks', `Задачи ${counts.tasks}`], ['questions', `Вопросы ${counts.questions}`]].map(([k, t]) => {
        const b = el('button', { type: 'button', 'aria-pressed': String(ui.show === k), text: t });
        b.addEventListener('click', () => setUi({ show: k }));
        return b;
      })),
      el('div', { class: 'pfilters' }, [
        sel('Группировать', ui.group, [['project', 'По проектам'], ['due', 'По срокам']], (v) => setUi({ group: v })),
        sel('Проект', ui.project === null ? '' : ui.project, [['', 'Все проекты'], ...groupsForFilter.sort((a, b) => a[1].localeCompare(b[1], 'ru'))], (v) => setUi({ project: v || null })),
      ]),
    ]);
    const goalsBox = el('details', { class: 'tbox', ...(openBox.goals ? { open: '' } : {}) }, [el('summary', { text: 'Цели' }), goalsPanel({ store, rerender: render, editing: editingGoal, setEditing: (id) => { editingGoal = id; } })]);
    goalsBox.addEventListener('toggle', () => { openBox.goals = goalsBox.open; });
    body.replaceChildren(addForm(projects), filters, list, el('div', { class: 'tpair' }, [inboxBox(), goalsBox]));
    live.textContent = msg;
  }

  // Обновления из синхронизации не должны стирать то, что ты сейчас печатаешь.
  const signature = () => ['inbox', 'tasks', 'goals', 'questions', 'projects'].map((m) => store.list(m).map((it) => `${it.id}:${it.updatedAt}`).join(',')).join('|');
  let sig = signature();
  let stale = false;
  const typing = () => root.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  const offP = onProjects(() => { if (!root.isConnected) return offP(); if (typing()) stale = true; else render(); });
  if (!getProjectsState().loaded) loadProjects();
  subscribe(() => {
    const next = signature();
    if (next === sig) return;
    sig = next;
    if (typing()) stale = true;
    else render();
  });
  root.addEventListener('focusout', () => {
    setTimeout(() => {
      if (stale && !typing()) {
        stale = false;
        render();
      }
    }, 0);
  });

  render();
  root.append(live, body);
  return root;
}
