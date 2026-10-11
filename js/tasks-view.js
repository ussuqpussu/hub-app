// Вкладка «Задачи и цели»: «Входящие» и «Задачи». Привычки и цели добавятся в третьей части этапа 3.
import { el, ICONS, fmtTime } from './ui.js';
import { load, save } from './storage.js';
import { todayYmd, dueLabel, parseQuick, isYmd, isHm } from './dates.js';
import { habitsPanel } from './habits-view.js';
import { goalsPanel } from './goals-view.js';

const KEY_TAB = 'hub.tasksTab';
export const INBOX_OLD_DAYS = 7;

// Открыть вкладку «Задачи и цели» на нужном разделе (используется ссылками с «Сегодня»).
export function openTasksTab(tab) {
  save(KEY_TAB, tab);
}
export const MAIN_LIMIT = 3;

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

export function tasksView({ store, subscribe }) {
  const root = el('section', { class: 'view' }, [
    el('div', { class: 'view__head' }, [
      el('h1', { text: 'Задачи и цели' }),
      el('p', { class: 'muted', text: 'Входящие, задачи со сроками, привычки и цели.' }),
    ]),
  ]);

  let tab = load(KEY_TAB, 'inbox');
  if (!['inbox', 'tasks', 'habits', 'goals'].includes(tab)) tab = 'inbox';
  let editingGoal = null;
  let editingId = null;
  let projectFor = null; // запись «Входящих», у которой открыт ввод проекта
  let msg = '';

  const tabs = el('div', { class: 'chips', role: 'group', 'aria-label': 'Раздел' });
  const body = el('div', { class: 'stack' });
  const live = el('p', { class: 'muted', role: 'status', 'aria-live': 'polite' });

  const openInbox = () => store.list('inbox').filter((it) => !it.resolved);

  function setTab(next) {
    tab = next;
    save(KEY_TAB, tab);
    editingId = null;
    projectFor = null;
    msg = '';
    render();
  }

  function renderTabs() {
    tabs.replaceChildren();
    const openTasks = store.list('tasks').filter((t) => !t.done).length;
    [
      ['inbox', `Входящие: ${openInbox().length}`],
      ['tasks', `Задачи: ${openTasks}`],
      ['habits', 'Привычки'],
      ['goals', 'Цели'],
    ].forEach(([id, label]) => {
      const b = el('button', { type: 'button', class: 'chip', 'aria-pressed': String(tab === id), text: label });
      b.addEventListener('click', () => setTab(id));
      tabs.append(b);
    });
  }

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

  function renderInbox() {
    const items = openInbox();
    body.replaceChildren(el('h2', { text: 'Входящие' }));
    if (!items.length) {
      body.append(el('div', { class: 'empty' }, [el('strong', { text: 'Входящих нет' }), el('span', { text: 'Записи из кнопки «+» и ярлыков появятся здесь, пока ты их не разберёшь.' })]));
      return;
    }
    const ul = el('ul', { class: 'inbox' });
    items.forEach((it) => ul.append(inboxItem(it)));
    body.append(ul);
  }

  // ---------- Задачи ----------
  function taskForm(task, onDone) {
    const form = el('form', { class: 'task-form card' });
    const title = el('input', { class: 'field', type: 'text', 'aria-label': 'Название задачи', placeholder: 'Что сделать', maxlength: '200', value: task ? task.title : '' });
    const due = el('input', { class: 'field', type: 'date', 'aria-label': 'Срок', value: task && task.due ? task.due : '' });
    const time = el('input', { class: 'field', type: 'time', 'aria-label': 'Время', value: task && task.time ? task.time : '' });
    const project = el('input', { class: 'field', type: 'text', 'aria-label': 'Проект', placeholder: 'Проект (необязательно)', maxlength: '60', value: task ? task.project || '' : '' });
    const err = el('p', { class: 'err', role: 'alert' });
    const submit = el('button', { type: 'submit', class: 'btn btn--primary', text: task ? 'Сохранить' : 'Добавить задачу' });
    const row = el('div', { class: 'task-form__row' }, [due, time]);
    const actions = el('div', { class: 'task-form__row' }, [submit]);
    if (task) {
      const cancel = el('button', { type: 'button', class: 'btn btn--ghost', text: 'Отмена' });
      cancel.addEventListener('click', () => {
        editingId = null;
        render();
      });
      actions.append(cancel);
    }
    form.append(title, row, project, err, actions);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = '';
      let t = title.value.trim();
      let d = due.value || null;
      let tm = time.value || null;
      if (!t) {
        err.textContent = 'Напиши название задачи.';
        title.focus();
        return;
      }
      if (!task && !d && !tm) {
        // «завтра 15:00 сдать лабу» прямо в названии
        const q = parseQuick(t);
        t = q.title;
        d = q.due;
        tm = q.time;
      }
      if (d && !isYmd(d)) d = null;
      if (tm && !isHm(tm)) tm = null;
      if (tm && !d) d = todayYmd();
      const fields = { title: t, due: d, time: tm, project: project.value.trim() };
      if (task) await store.update('tasks', task.id, fields);
      else await store.add('tasks', { ...fields, done: false, main: false });
      onDone();
    });
    return form;
  }

  function taskRow(t, today) {
    const li = el('li', { class: `task${t.done ? ' task--done' : ''}` });
    const check = el('button', {
      type: 'button',
      class: 'task__check',
      role: 'checkbox',
      'aria-checked': String(!!t.done),
      'aria-label': t.done ? `Вернуть в работу: ${t.title}` : `Выполнено: ${t.title}`,
    });
    check.addEventListener('click', () => {
      const done = !t.done;
      store.update('tasks', t.id, { done, doneAt: done ? Date.now() : null, main: done ? false : t.main });
    });
    const meta = [];
    if (t.due) meta.push(`${dueLabel(t.due, today)}${t.time ? ` ${t.time}` : ''}`);
    if (t.project) meta.push(t.project);
    const text = el('span', { class: 'task__text' }, [el('span', { class: 'task__title', text: t.title })]);
    if (meta.length) text.append(el('span', { class: 'task__meta', text: meta.join(' · ') }));

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
    const edit = el('button', { type: 'button', class: 'iconbtn', 'aria-label': `Изменить: ${t.title}`, html: ICONS.edit });
    edit.addEventListener('click', () => {
      editingId = t.id;
      render();
    });
    const del = el('button', { type: 'button', class: 'iconbtn', 'aria-label': `Удалить: ${t.title}`, html: ICONS.close });
    del.addEventListener('click', () => store.remove('tasks', t.id));
    li.append(check, text);
    const tools = el('span', { class: 'task__tools' });
    if (!t.done) tools.append(star);
    tools.append(edit, del);
    li.append(tools);
    return li;
  }

  function group(title, list, today, extra = '') {
    if (!list.length) return null;
    const ul = el('ul', { class: 'tasks' });
    list.forEach((t) => {
      if (t.id === editingId) {
        const li = el('li');
        li.append(taskForm(t, () => {
          editingId = null;
          render();
        }));
        ul.append(li);
      } else ul.append(taskRow(t, today));
    });
    return el('div', { class: `stack stack--tight ${extra}`.trim() }, [el('h3', { text: `${title} · ${list.length}` }), ul]);
  }

  function renderTasks() {
    const today = todayYmd();
    const g = groupTasks(store.list('tasks'), today);
    body.replaceChildren(el('h2', { text: 'Задачи' }), taskForm(null, () => {
      msg = 'Задача добавлена.';
      render();
    }));
    const parts = [group('Просрочено', g.overdue, today, 'group--overdue'), group('Сегодня', g.today, today), group('Дальше', g.later, today), group('Без срока', g.nodue, today)];
    parts.forEach((p) => p && body.append(p));
    if (!parts.some(Boolean)) body.append(el('div', { class: 'empty' }, [el('strong', { text: 'Открытых задач нет' }), el('span', { text: 'Добавь задачу выше или кнопкой «+».' })]));
    if (g.done.length) {
      const det = el('details', { class: 'done-box' }, [el('summary', { text: `Сделано · ${g.done.length}` })]);
      const ul = el('ul', { class: 'tasks' });
      g.done.slice(0, 20).forEach((t) => ul.append(taskRow(t, today)));
      det.append(ul);
      body.append(det);
    }
  }

  function render() {
    sig = signature();
    stale = false;
    renderTabs();
    if (tab === 'inbox') renderInbox();
    else if (tab === 'tasks') renderTasks();
    else if (tab === 'habits') body.replaceChildren(habitsPanel({ store, rerender: render }));
    else body.replaceChildren(goalsPanel({ store, rerender: render, editing: editingGoal, setEditing: (id) => { editingGoal = id; } }));
    live.textContent = msg;
  }

  // Обновления из синхронизации не должны стирать то, что ты сейчас печатаешь.
  const signature = () => ['inbox', 'tasks', 'habits', 'habitlog', 'goals'].map((m) => store.list(m).map((it) => `${it.id}:${it.updatedAt}`).join(',')).join('|');
  let sig = signature();
  let stale = false;
  const typing = () => root.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
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
  root.append(tabs, live, body);
  return root;
}
