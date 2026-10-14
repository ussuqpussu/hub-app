// Вкладка «Заметки и ссылки»: заметки и закладки с тегами, фильтры, поиск по ним.
import { el, ICONS } from './ui.js';
import { load, save } from './storage.js';
import { openSheet, confirmSheet } from './subs-form.js';
import { parseNoteTags, normalizeUrl, hostOf, noteTitle, allTags, filterNotes } from './notes-calc.js';
import { buildIndex, search } from './search-calc.js';

const KEY = 'hub.notesUi';

function noteForm(store, note, close) {
  const isEdit = !!note;
  let kind = note ? note.kind : 'note';
  const seg = el('div', { class: 'seg seg--s', role: 'group', 'aria-label': 'Что добавить' });
  const title = el('input', { class: 'field', type: 'text', 'aria-label': 'Заголовок', placeholder: 'Заголовок (необязательно)', maxlength: '120', value: note ? note.title || '' : '' });
  const text = el('textarea', { class: 'field field--area', 'aria-label': 'Текст заметки', placeholder: 'Текст', rows: '4', maxlength: '4000' });
  text.value = note ? note.text || '' : '';
  const url = el('input', { class: 'field', type: 'text', 'aria-label': 'Адрес ссылки', placeholder: 'Адрес: example.com/страница', maxlength: '500', value: note ? note.url || '' : '', inputmode: 'url', autocapitalize: 'none' });
  const tags = el('input', { class: 'field', type: 'text', 'aria-label': 'Теги через запятую', placeholder: 'Теги через запятую', value: note ? (note.tags || []).join(', ') : '', list: 'note-tags' });
  const dl = el('datalist', { id: 'note-tags' }, allTags(store.list('notes')).map((t) => el('option', { value: t })));
  const err = el('p', { class: 'err', role: 'alert' });
  const paint = () => {
    seg.replaceChildren(...[['note', 'Заметка'], ['link', 'Ссылка']].map(([k, t]) => {
      const b = el('button', { type: 'button', 'aria-pressed': String(kind === k), text: t, ...(isEdit ? { disabled: '' } : {}) });
      b.addEventListener('click', () => { kind = k; paint(); });
      return b;
    }));
    text.hidden = kind === 'link';
    url.hidden = kind !== 'link';
    text.setAttribute('aria-label', kind === 'link' ? 'Комментарий' : 'Текст заметки');
  };
  paint();
  const submit = el('button', { type: 'submit', class: 'btn btn--primary', text: isEdit ? 'Сохранить' : 'Добавить' });
  const form = el('form', { class: 'sheet__form stack' }, [seg, title, text, url, tags, dl, err, submit]);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fields = { kind, title: title.value.trim(), text: text.value.trim(), url: '', tags: parseNoteTags(tags.value) };
    if (kind === 'link') {
      fields.url = normalizeUrl(url.value);
      if (!fields.url) { err.textContent = 'Нужен адрес сайта, например example.com/страница.'; return; }
    } else if (!fields.text && !fields.title) { err.textContent = 'Напиши текст заметки.'; return; }
    if (isEdit) await store.update('notes', note.id, fields);
    else await store.add('notes', fields);
    if (close) close();
    else { title.value = ''; text.value = ''; url.value = ''; tags.value = ''; err.textContent = ''; }
  });
  return form;
}

export function notesView({ store, subscribe }) {
  function quickAdd() {
    const inp = el('input', { class: 'field', type: 'text', 'aria-label': 'Быстрая заметка или ссылка', placeholder: 'Заметка или ссылка: напиши и нажми Enter', maxlength: '500', autocomplete: 'off' });
    const go = el('button', { type: 'submit', class: 'btn btn--primary', text: 'Добавить' });
    const more = el('button', { type: 'button', class: 'btn', text: 'Подробно' });
    const err = el('p', { class: 'err', role: 'alert' });
    more.addEventListener('click', () => openSheet((close) => el('div', { class: 'stack' }, [el('h2', { text: 'Новая запись' }), noteForm(store, null, close)])));
    const form = el('form', { class: 'task-form card' }, [el('div', { class: 'task-form__row task-form__main' }, [inp, go, more]), err]);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = inp.value.trim();
      if (!v) { err.textContent = 'Напиши текст или вставь ссылку.'; inp.focus(); return; }
      const asLink = !/\s/.test(v) && /\./.test(v) ? normalizeUrl(v) : '';
      if (asLink) await store.add('notes', { kind: 'link', title: '', text: '', url: asLink, tags: [] });
      else await store.add('notes', { kind: 'note', title: '', text: v, tags: [] });
      inp.value = ''; err.textContent = '';
    });
    return form;
  }
  const root = el('section', { class: 'view' });
  const ui = { kind: 'all', tag: null, ...(load(KEY, {}) || {}) };
  let query = '';
  const setUi = (p) => { Object.assign(ui, p); save(KEY, ui); render(); };

  function card(n) {
    const del = el('button', { type: 'button', class: 'iconbtn', 'aria-label': `Удалить: ${noteTitle(n)}`, html: ICONS.close });
    del.addEventListener('click', () => confirmSheet({ title: 'Удалить запись?', text: noteTitle(n), action: 'Удалить', onConfirm: () => store.remove('notes', n.id) }));
    const edit = el('button', { type: 'button', class: 'iconbtn', 'aria-label': `Изменить: ${noteTitle(n)}`, html: ICONS.edit });
    edit.addEventListener('click', () => openSheet((close) => el('div', { class: 'stack' }, [el('h2', { text: 'Изменить запись' }), noteForm(store, n, close)])));
    const body = [];
    if (n.kind === 'link') body.push(el('a', { class: 'notecard__url', href: n.url, target: '_blank', rel: 'noopener noreferrer', text: hostOf(n.url) || n.url }));
    if (n.text) body.push(el('p', { class: 'notecard__text', text: n.text }));
    if ((n.tags || []).length) body.push(el('div', { class: 'pillrow' }, n.tags.map((t) => {
      const b = el('button', { type: 'button', class: 'pill', text: `#${t}` });
      b.addEventListener('click', () => setUi({ tag: t }));
      return b;
    })));
    return el('li', { class: 'card notecard', 'data-kind': n.kind }, [
      el('div', { class: 'notecard__head' }, [el('span', { class: 'qtile__kind', text: n.kind === 'link' ? 'Ссылка' : 'Заметка' }), el('span', { class: 'task__tools' }, [edit, del])]),
      el('h3', { class: 'notecard__title', text: noteTitle(n) }),
      ...body,
    ]);
  }

  function render() {
    const all = store.list('notes');
    const tags = allTags(all);
    if (ui.tag && !tags.includes(ui.tag)) ui.tag = null;
    let shown = filterNotes(all, ui);
    if (query.trim()) {
      const hit = new Set(search(buildIndex(shown.map((n) => ({ id: n.id, title: noteTitle(n), text: `${n.text || ''} ${n.url || ''}`, tags: n.tags || [] }))), query).map((d) => d.id));
      shown = shown.filter((n) => hit.has(n.id));
    }
    const counts = { all: all.length, note: all.filter((n) => n.kind === 'note').length, link: all.filter((n) => n.kind === 'link').length };
    const q = el('input', { class: 'field', type: 'search', 'aria-label': 'Поиск по заметкам и ссылкам', placeholder: 'Поиск по заметкам и ссылкам', value: query, autocomplete: 'off' });
    q.addEventListener('input', () => { query = q.value; const pos = q.selectionStart; render(); const s2 = root.querySelector('input[type="search"]'); if (s2) { s2.focus(); s2.setSelectionRange(pos, pos); } });
    root.replaceChildren(
      el('div', { class: 'view__head' }, [el('h1', { text: 'Заметки и ссылки' }), el('p', { class: 'muted', text: 'Быстрые заметки и закладки с тегами.' })]),
      quickAdd(),
    );
    if (!all.length) { root.append(el('div', { class: 'empty' }, [el('strong', { text: 'Пока пусто' }), el('span', { text: 'Добавь первую заметку или ссылку. Их можно искать здесь и в общем поиске.' })])); return; }
    const seg = el('div', { class: 'seg seg--s', role: 'group', 'aria-label': 'Что показывать' }, [['all', 'Всё'], ['note', 'Заметки'], ['link', 'Ссылки']].map(([k, t]) => {
      const b = el('button', { type: 'button', 'aria-pressed': String(ui.kind === k), text: `${t} ${counts[k]}` });
      b.addEventListener('click', () => setUi({ kind: k }));
      return b;
    }));
    root.append(seg, q);
    if (tags.length) root.append(el('div', { class: 'chips', role: 'group', 'aria-label': 'Теги' }, tags.map((t) => {
      const b = el('button', { type: 'button', class: 'chip', 'aria-pressed': String(ui.tag === t), text: `#${t}` });
      b.addEventListener('click', () => setUi({ tag: ui.tag === t ? null : t }));
      return b;
    })));
    if (!shown.length) root.append(el('div', { class: 'empty' }, [el('strong', { text: 'Ничего не найдено' }), el('span', { text: 'Измени поиск или сбрось фильтры.' })]));
    else root.append(el('ul', { class: 'notegrid' }, shown.map(card)));
  }

  let sig = '';
  const signature = () => store.list('notes').map((n) => `${n.id}:${n.updatedAt}`).join(',');
  let dirty = false;
  subscribe(() => { const s = signature(); if (s !== sig && root.isConnected) { if (document.querySelector('dialog[open]')) dirty = true; else { sig = s; render(); } } });
  document.addEventListener('close', () => { if (dirty && root.isConnected) { dirty = false; sig = signature(); setTimeout(render, 0); } }, true);
  sig = signature();
  render();
  return root;
}
