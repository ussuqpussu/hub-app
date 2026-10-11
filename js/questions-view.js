// Доска «Открытые вопросы»: все вопросы по всем проектам в одном списке.
import { el } from './ui.js';
import { dateText } from './subs-parts.js';
import { Q_STATUS, Q_WHO, NO_PROJECT, collectQuestions, filterQuestions, groupQuestions, customerQuestions, customerMessage, keyOf } from './questions-calc.js';

const sel = (label, value, options, onChange) => {
  const s = el('select', { class: 'field', 'aria-label': label }, options.map(([v, t]) => el('option', { value: v, text: t })));
  s.value = value;
  s.addEventListener('change', () => onChange(s.value));
  return s;
};

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    const ta = el('textarea', { class: 'sr-only', 'aria-hidden': 'true' });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (__) { ok = false; }
    ta.remove();
    return ok;
  }
}

export const allQuestions = (store, projects) => collectQuestions(projects, store.list('questions'));

// ui: { qStatus, qGroup, qProject }, setUi(patch)
export function questionsBoard({ store, projects, ui, setUi }) {
  const items = allQuestions(store, projects);
  const wrap = el('div', { class: 'stack' });
  const status = ui.qStatus || 'open';
  const by = ui.qGroup || 'project';
  const projectId = ui.qProject || null;
  const counts = { open: 0, postponed: 0, resolved: 0 };
  items.forEach((q) => { counts[q.status] += 1; });

  // Запись состояния вопроса. Вопрос из заметки получает запись в хабе только когда человек что-то изменил.
  const patch = (q, fields) => {
    if (q.id) return store.update('questions', q.id, fields);
    return store.add('questions', { origin: 'card', key: keyOf(q.projectId, q.text), text: q.text, projectId: q.projectId, projectName: q.project, who: 'unset', status: 'open', created: 0, ...fields });
  };

  // Добавление вручную
  const text = el('input', { class: 'field', 'aria-label': 'Новый вопрос', placeholder: 'Новый вопрос', maxlength: '300' });
  const proj = sel('Проект вопроса', '', [['', NO_PROJECT], ...projects.map((p) => [p.id, p.name])], () => {});
  const who = sel('У кого спросить', 'unset', Object.entries(Q_WHO), () => {});
  const add = el('button', { type: 'button', class: 'btn btn--primary btn--s', text: 'Добавить' });
  const err = el('p', { class: 'err', role: 'alert' });
  add.addEventListener('click', async () => {
    const t = text.value.trim();
    if (!t) { err.textContent = 'Напиши вопрос.'; return text.focus(); }
    const p = projects.find((x) => x.id === proj.value);
    await store.add('questions', { origin: 'manual', text: t, projectId: p ? p.id : '', projectName: p ? p.name : '', who: who.value, status: 'open', created: Date.now() });
    text.value = '';
  });
  const form = el('div', { class: 'card stack stack--tight' }, [el('h2', { text: 'Новый вопрос' }), text, el('div', { class: 'task-form__row' }, [proj, who]), add, err]);

  // Фильтры
  const seg = el('div', { class: 'seg seg--s', role: 'group', 'aria-label': 'Статус вопросов' }, [['open', 'Открытые'], ['postponed', 'Отложенные'], ['resolved', 'Решённые']].map(([k, t]) => {
    const b = el('button', { type: 'button', 'aria-pressed': String(status === k), text: `${t} ${counts[k]}` });
    b.addEventListener('click', () => setUi({ qStatus: k }));
    return b;
  }));
  const withQuestions = projects.filter((p) => items.some((q) => q.projectId === p.id));
  wrap.append(seg, el('div', { class: 'pfilters' }, [
    sel('Группировать по', by, [['project', 'По проектам'], ['who', 'По тем, у кого спросить']], (v) => setUi({ qGroup: v })),
    sel('Проект', projectId || '', [['', 'Все проекты'], ...withQuestions.map((p) => [p.id, p.name])], (v) => setUi({ qProject: v || null })),
  ]));

  const shown = filterQuestions(items, { status, projectId });
  if (!shown.length) {
    wrap.append(el('div', { class: 'empty' }, [el('strong', { text: status === 'open' ? 'Открытых вопросов нет' : 'Здесь пока пусто' }), el('span', { text: 'Вопросы берутся из раздела «Открытые вопросы» в карточках проектов. Добавить можно и вручную выше.' })]));
    wrap.append(form);
    return wrap;
  }
  const msgNote = el('p', { class: 'sched-note', role: 'status' });
  groupQuestions(shown, by).forEach((g) => {
    const head = el('h3', { class: 'dayt pgroup' }, [el('span', { text: g.label }), el('span', { class: 'muted', text: String(g.items.length) })]);
    const sec = el('section', { class: 'stack stack--tight' }, [head]);
    if (by === 'project' && g.projectId) {
      const qs = customerQuestions(items, g.projectId);
      const proj0 = projects.find((p) => p.id === g.projectId);
      const copy = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Скопировать вопросы заказчику', ...(qs.length ? {} : { disabled: '' }) });
      copy.addEventListener('click', async () => {
        const ok = await copyText(customerMessage(proj0 ? proj0.name : g.label, qs));
        msgNote.textContent = ok ? `Скопировано: ${qs.length} в сообщении по проекту «${g.label}».` : 'Не удалось скопировать. Выдели текст вручную.';
      });
      sec.append(copy);
    }
    sec.append(el('ul', { class: 'qlist' }, g.items.map((q) => {
      const st = sel('Статус', q.status, Object.entries(Q_STATUS), (v) => patch(q, { status: v }));
      st.disabled = q.auto;
      const wh = sel('У кого спросить', q.who, Object.entries(Q_WHO), (v) => patch(q, { who: v }));
      const meta = [by === 'who' ? q.project : '', q.origin === 'card' ? 'из заметки' : 'вручную', q.origin === 'manual' && q.created ? `с ${dateText(new Date(q.created).toISOString().slice(0, 10))}` : '', q.auto ? 'строки больше нет в заметке, закрыт сам' : ''].filter(Boolean).join(' · ');
      const kids = [el('span', { class: 'qrow__text', text: q.text }), el('span', { class: 'muted qrow__meta', text: meta }), el('div', { class: 'task-form__row' }, [st, wh])];
      if (q.origin === 'manual') {
        const del = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Удалить' });
        del.addEventListener('click', () => store.remove('questions', q.id));
        kids.push(del);
      }
      return el('li', { class: 'card qrow', 'data-status': q.status }, kids);
    })));
    wrap.append(sec);
  });
  wrap.append(msgNote, form);
  return wrap;
}
