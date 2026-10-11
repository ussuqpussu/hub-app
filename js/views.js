import { THEMES, currentTheme, setTheme } from './theme.js';
import { AUTOLOCK_OPTIONS, getAutolock, setAutolock } from './pin.js';
import { verifyPin, changePin, getRecoveryCode, setToken, clearToken, getSession } from './data/vault.js';
import { createGithub } from './data/github.js';
import { TYPES } from './plus.js';
import { load } from './storage.js';

export const VERSION = '0.2.0 (этап 2: данные)';

// Свои простые значки (линия, без заимствованных наборов).
const ico = (d) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

export const ICONS = {
  today: ico('<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>'),
  calendar: ico('<rect x="4" y="5" width="16" height="15"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
  tasks: ico('<path d="M5 6h3M5 12h3M5 18h3M11 6h8M11 12h8M11 18h8"/>'),
  projects: ico('<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><path d="M16.5 13v7M13 16.5h7"/>'),
  more: ico('<circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/>'),
  home: ico('<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>'),
  subs: ico('<path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4"/>'),
  notes: ico('<path d="M6 4h9l3 3v13H6z"/><path d="M9 11h6M9 15h6"/>'),
  knowledge: ico('<path d="M5 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H5zM19 5h-6"/><path d="M19 5v12h-6"/>'),
  gear: ico('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'),
  plus: ico('<path d="M12 5v14M5 12h14"/>'),
  close: ico('<path d="M6 6l12 12M18 6L6 18"/>'),
};

// Вкладки. group: main (в нижней панели телефона), more (внутри «Ещё»).
export const TABS = [
  { id: 'today', name: 'Сегодня', icon: 'today', group: 'main' },
  { id: 'calendar', name: 'Календарь', icon: 'calendar', group: 'main' },
  { id: 'tasks', name: 'Задачи', icon: 'tasks', group: 'main' },
  { id: 'projects', name: 'Проекты', icon: 'projects', group: 'main' },
  { id: 'smart-home', name: 'Умный дом', icon: 'home', group: 'more' },
  { id: 'subscriptions', name: 'Подписки', icon: 'subs', group: 'more' },
  { id: 'notes', name: 'Заметки и ссылки', icon: 'notes', group: 'more' },
  { id: 'knowledge', name: 'Знания', icon: 'knowledge', group: 'more' },
];

const PLACEHOLDERS = {
  today: ['Сегодня', 'Здесь появятся расписание на день, главные задачи и ближайшие списания.', 'Данных пока нет: чтение и запись данных будут на этапе 2, «Сегодня» наполнится на этапе 3.'],
  calendar: ['Календарь', 'Месяц, неделя и день, свои события и расписание колледжа.', 'Данных пока нет: календарь наполнится на этапах 3 и 4.'],
  tasks: ['Задачи и цели', 'Задачи со сроками, привычки и цели, а также «Входящие».', 'Задач, привычек и целей пока нет: они появятся на этапе 3.'],
  projects: ['Проекты', 'Карточки проектов, лента событий и открытые вопросы.', 'Данных пока нет: проекты из Obsidian подключатся на этапе 6.'],
  'smart-home': ['Умный дом', 'Управление устройствами, комнатами и сценариями.', 'Нет связи с сервером умного дома: он ещё не подключён (этап 14).'],
  subscriptions: ['Подписки', 'Список подписок и ближайшие списания.', 'Данных пока нет: подписки переедут в хаб на этапе 5.'],
  notes: ['Заметки и ссылки', 'Быстрые заметки, закладки с тегами и поиск.', 'Данных пока нет: вкладка наполнится на этапе 12.'],
  knowledge: ['Знания', 'Хроника сессий и промпты со скиллами.', 'Данных пока нет: вкладка появится на этапе 14.'],
};

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v; // только статичные строки из этого файла
    else node.setAttribute(k, v);
  });
  [].concat(children).forEach((c) => node.append(c));
  return node;
}

function placeholderView(id) {
  const [title, about, state] = PLACEHOLDERS[id];
  return el('section', { class: 'view' }, [
    el('div', { class: 'view__head' }, [el('h1', { text: title }), el('p', { class: 'muted', text: about })]),
    el('div', { class: 'empty' }, [el('strong', { text: 'Пока пусто' }), el('span', { text: state })]),
  ]);
}

function moreView() {
  const list = el('nav', { class: 'link-list', 'aria-label': 'Остальные вкладки' });
  TABS.filter((t) => t.group === 'more').forEach((t) => {
    list.append(el('a', { href: `#/${t.id}` }, [el('span', { text: t.name }), el('span', { class: 'muted', text: '›' })]));
  });
  return el('section', { class: 'view' }, [el('div', { class: 'view__head' }, [el('h1', { text: 'Ещё' })]), list]);
}

export function fmtTime(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function statusText(st) {
  if (st.state === 'notoken') return 'Данные только на этом устройстве';
  if (st.state === 'syncing') return 'Синхронизация…';
  if (st.state === 'offline') return st.pending ? `Нет связи · ждёт отправки: ${st.pending}` : 'Нет связи';
  if (st.state === 'error') return `Ошибка: ${st.error ? st.error.message : 'синхронизация'}`;
  if (st.pending) return `Ждёт отправки: ${st.pending}`;
  return st.lastSync ? `Обновлено: ${fmtTime(st.lastSync)}` : 'Ещё не синхронизировано';
}

function tasksView({ store, subscribe }) {
  const root = el('section', { class: 'view' }, [
    el('div', { class: 'view__head' }, [el('h1', { text: 'Задачи и цели' }), el('p', { class: 'muted', text: 'Задачи со сроками, привычки и цели появятся на этапе 3.' })]),
  ]);
  const box = el('div', { class: 'stack' });
  const typeName = (id) => (TYPES.find((t) => t.id === id) || { name: id }).name;
  function render() {
    box.replaceChildren(el('h2', { text: 'Входящие' }));
    const items = store.list('inbox');
    if (!items.length) {
      box.append(el('div', { class: 'empty' }, [el('strong', { text: 'Входящих нет' }), el('span', { text: 'Записи из кнопки «+» появятся здесь.' })]));
      return;
    }
    const ul = el('ul', { class: 'inbox' });
    items.forEach((it) => {
      const del = el('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Удалить запись', html: ICONS.close });
      del.addEventListener('click', () => store.remove('inbox', it.id));
      ul.append(el('li', { class: 'inbox__item' }, [
        el('span', { class: 'inbox__text', text: it.text }),
        del,
        el('span', { class: 'inbox__meta', text: `${typeName(it.type)} · ${fmtTime(it.created)}` }),
      ]));
    });
    box.append(ul);
  }
  render();
  subscribe(render);
  root.append(box);
  return root;
}

function settingsView({ onLockNow, store, subscribe }) {
  const root = el('section', { class: 'view' }, [el('div', { class: 'view__head' }, [el('h1', { text: 'Настройки' })])]);

  // Оформление
  const themesBox = el('div', { class: 'themes', role: 'radiogroup', 'aria-label': 'Тема оформления' });
  function renderThemes() {
    themesBox.replaceChildren();
    const active = currentTheme();
    THEMES.forEach((t) => {
      const card = el('button', { type: 'button', class: 'theme-card', role: 'radio', 'aria-checked': String(t.id === active), 'data-theme': t.id }, [
        el('span', { class: 'theme-card__swatch', html: '<i style="background:var(--c-bg)"></i><i style="background:var(--c-surface)"></i><i style="background:var(--c-accent)"></i>' }),
        el('span', { class: 'theme-card__name', text: t.name }),
        el('span', { class: 'muted', text: t.note }),
      ]);
      card.addEventListener('click', () => {
        setTheme(t.id);
        renderThemes();
      });
      themesBox.append(card);
    });
  }
  renderThemes();
  root.append(el('div', { class: 'settings-group' }, [el('h2', { text: 'Оформление' }), themesBox, el('p', { class: 'muted', text: 'Остальные темы появятся на этапе 15.' })]));

  // Данные
  const pinField = (label) => el('input', { class: 'field', type: 'password', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '6', autocomplete: 'off', placeholder: label, 'aria-label': label });
  const dataBox = el('div', { class: 'settings-group' });
  const dataMsg = el('p', { class: 'muted', role: 'status' });
  let kvEl = null;
  function kvRows() {
    const sess = getSession();
    const st = store.getStatus();
    const connected = !!(sess.token && sess.repo);
    return [
      el('dt', { text: 'Репозиторий' }), el('dd', { text: connected ? sess.repo : 'не подключён' }),
      el('dt', { text: 'Состояние' }), el('dd', { text: statusText(st) }),
      el('dt', { text: 'Ждёт отправки' }), el('dd', { text: String(st.pending) }),
      el('dt', { text: 'Последняя синхронизация' }), el('dd', { text: st.lastSync ? fmtTime(st.lastSync) : 'ещё не было' }),
    ];
  }
  function renderData() {
    const sess = getSession();
    const connected = !!(sess.token && sess.repo);
    const kv = el('dl', { class: 'kv' }, kvRows());
    kvEl = kv;
    const repoIn = el('input', { class: 'field', type: 'text', autocomplete: 'off', spellcheck: 'false', placeholder: 'владелец/репозиторий данных', 'aria-label': 'Репозиторий данных', value: sess.repo || '' });
    const tokIn = el('input', { class: 'field', type: 'password', autocomplete: 'off', spellcheck: 'false', placeholder: 'Токен GitHub', 'aria-label': 'Токен GitHub' });
    const connect = el('form', { class: 'stack' }, [repoIn, tokIn, el('button', { class: 'btn', type: 'submit', text: connected ? 'Заменить токен' : 'Подключить' })]);
    connect.addEventListener('submit', async (e) => {
      e.preventDefault();
      const repo = repoIn.value.trim();
      const token = tokIn.value.trim();
      if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !token) {
        dataMsg.textContent = 'Укажи репозиторий в виде владелец/название и токен.';
        return;
      }
      dataMsg.textContent = 'Проверяю доступ…';
      try {
        const api = load('hub.apiBase') || undefined;
        const info = await createGithub({ repo, token, apiBase: api }).checkAccess();
        if (!info.private) {
          dataMsg.textContent = 'Этот репозиторий публичный. Данные должны лежать в приватном: токен не сохранён.';
          return;
        }
        await setToken(token, repo);
        tokIn.value = '';
        dataMsg.textContent = 'Подключено. Токен хранится на этом устройстве в зашифрованном виде.';
        store.syncNow();
      } catch (ex) {
        dataMsg.textContent = ex && ex.kind === 'auth' ? 'GitHub не принял токен или нет доступа к репозиторию.' : ex && ex.kind === 'notfound' ? 'Репозиторий не найден или у токена нет к нему доступа.' : 'Не удалось проверить доступ: нет связи или ошибка GitHub.';
      }
      renderData();
    });
    const syncBtn = el('button', { class: 'btn', type: 'button', text: 'Синхронизировать сейчас' });
    syncBtn.addEventListener('click', () => store.syncNow());
    const unlink = el('button', { class: 'btn btn--ghost', type: 'button', text: 'Отключить токен' });
    unlink.addEventListener('click', () => {
      clearToken();
      dataMsg.textContent = 'Токен удалён с этого устройства. Отозвать его нужно ещё на github.com.';
      renderData();
    });
    const expBtn = el('button', { class: 'btn', type: 'button', text: 'Экспорт данных (файл)' });
    expBtn.addEventListener('click', async () => {
      const data = await store.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `hub-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      dataMsg.textContent = 'Файл содержит данные в открытом виде: храни его осторожно.';
    });
    const impIn = el('input', { class: 'sr-only', type: 'file', accept: 'application/json,.json', 'aria-label': 'Импорт данных из файла' });
    impIn.addEventListener('change', async () => {
      const file = impIn.files && impIn.files[0];
      if (!file) return;
      try {
        const n = await store.importAll(JSON.parse(await file.text()));
        dataMsg.textContent = `Импортировано записей: ${n}.`;
      } catch (ex) {
        dataMsg.textContent = ex && ex.message && !(ex instanceof SyntaxError) ? ex.message : 'Это не файл экспорта хаба или он повреждён.';
      }
      impIn.value = '';
    });
    const impBtn = el('label', { class: 'btn' }, [el('span', { text: 'Импорт из файла' }), impIn]);
    dataBox.replaceChildren(
      el('h2', { text: 'Данные' }),
      kv,
      connect,
      el('div', { class: 'row' }, connected ? [syncBtn, unlink] : [syncBtn]),
      el('div', { class: 'row' }, [expBtn, impBtn]),
      dataMsg,
      el('p', { class: 'muted', text: 'Личные записи шифруются на устройстве и лежат в репозитории в зашифрованном виде. История изменений и откат делаются через git.' }),
    );
  }
  renderData();
  subscribe(() => {
    if (kvEl) kvEl.replaceChildren(...kvRows());
  });
  root.append(dataBox);

  // Безопасность
  const sel = el('select', { class: 'field', id: 'autolock', 'aria-label': 'Автоблокировка' });
  AUTOLOCK_OPTIONS.forEach((o) => sel.append(el('option', { value: String(o.min), text: o.label })));
  sel.value = String(getAutolock());
  sel.addEventListener('change', () => setAutolock(Number(sel.value)));

  const msg = el('p', { class: 'muted', role: 'status' });
  const oldPin = pinField('Текущий PIN');
  const newPin = pinField('Новый PIN (4–6 цифр)');
  const change = el('form', { class: 'stack' }, [oldPin, newPin, el('button', { class: 'btn', type: 'submit', text: 'Сменить PIN' }), msg]);
  change.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    if (!/^\d{4,6}$/.test(newPin.value)) {
      msg.textContent = 'Новый PIN: от 4 до 6 цифр.';
      return;
    }
    try {
      if (!(await verifyPin(oldPin.value))) {
        msg.textContent = 'Текущий PIN неверный.';
        return;
      }
      await changePin(oldPin.value, newPin.value);
      oldPin.value = '';
      newPin.value = '';
      msg.textContent = 'PIN изменён. Данные остались доступны.';
    } catch (_) {
      msg.textContent = 'Не удалось изменить PIN в этом браузере.';
    }
  });

  const codePin = pinField('PIN, чтобы показать код');
  const codeOut = el('p', { class: 'lock__code mono', hidden: '' });
  const codeMsg = el('p', { class: 'muted', role: 'status' });
  const codeForm = el('form', { class: 'stack' }, [codePin, el('button', { class: 'btn', type: 'submit', text: 'Показать код восстановления' }), codeOut, codeMsg]);
  codeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    codeMsg.textContent = '';
    try {
      codeOut.textContent = await getRecoveryCode(codePin.value);
      codeOut.hidden = false;
      codePin.value = '';
      setTimeout(() => {
        codeOut.hidden = true;
        codeOut.textContent = '';
      }, 60000);
      codeMsg.textContent = 'Код скроется через минуту.';
    } catch (_) {
      codeMsg.textContent = 'PIN неверный.';
    }
  });

  const lockBtn = el('button', { class: 'btn', type: 'button', text: 'Заблокировать сейчас' });
  lockBtn.addEventListener('click', onLockNow);
  root.append(
    el('div', { class: 'settings-group' }, [
      el('h2', { text: 'Безопасность' }),
      el('label', { class: 'stack' }, [el('span', { text: 'Автоблокировка при сворачивании' }), sel]),
      change,
      codeForm,
      lockBtn,
      el('p', { class: 'muted', text: 'PIN открывает ключ, которым шифруются личные записи. Если устройство потеряно: отзови токен на github.com (Settings → Developer settings). Без кода восстановления данные на новом устройстве не открыть.' }),
    ]),
  );

  // О системе
  root.append(
    el('div', { class: 'settings-group' }, [
      el('h2', { text: 'О системе' }),
      el('dl', { class: 'kv' }, [
        el('dt', { text: 'Версия' }), el('dd', { text: VERSION }),
        el('dt', { text: 'Источники' }), el('dd', { text: 'расписание, проекты, умный дом: не подключены' }),
      ]),
    ]),
  );
  return root;
}

export function renderRoute(route, ctx) {
  if (route === 'settings') return settingsView(ctx);
  if (route === 'tasks') return tasksView(ctx);
  if (route === 'more') return moreView();
  if (PLACEHOLDERS[route]) return placeholderView(route);
  return el('section', { class: 'view' }, [
    el('h1', { text: 'Страница не найдена' }),
    el('p', { class: 'muted', text: 'Такой вкладки нет.' }),
    el('a', { class: 'btn', href: '#/today', text: 'На «Сегодня»' }),
  ]);
}
