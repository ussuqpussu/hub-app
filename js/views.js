import { THEMES, currentTheme, setTheme } from './theme.js';
import { AUTOLOCK_OPTIONS, getAutolock, setAutolock, checkPin, setPin } from './pin.js';

export const VERSION = '0.1.0 (этап 1: каркас)';

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
  tasks: ['Задачи и цели', 'Задачи со сроками, привычки и цели, а также «Входящие».', 'Данных пока нет: вкладка наполнится на этапе 3.'],
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

function settingsView({ onLockNow }) {
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

  // Безопасность
  const sel = el('select', { class: 'field', id: 'autolock', 'aria-label': 'Автоблокировка' });
  AUTOLOCK_OPTIONS.forEach((o) => sel.append(el('option', { value: String(o.min), text: o.label })));
  sel.value = String(getAutolock());
  sel.addEventListener('change', () => setAutolock(Number(sel.value)));

  const msg = el('p', { class: 'muted', role: 'status' });
  const oldPin = el('input', { class: 'field', type: 'password', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '6', autocomplete: 'off', placeholder: 'Текущий PIN', 'aria-label': 'Текущий PIN' });
  const newPin = el('input', { class: 'field', type: 'password', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '6', autocomplete: 'off', placeholder: 'Новый PIN (4–6 цифр)', 'aria-label': 'Новый PIN' });
  const change = el('form', { class: 'stack' }, [oldPin, newPin, el('button', { class: 'btn', type: 'submit', text: 'Сменить PIN' }), msg]);
  change.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    if (!/^\d{4,6}$/.test(newPin.value)) {
      msg.textContent = 'Новый PIN: от 4 до 6 цифр.';
      return;
    }
    try {
      if (!(await checkPin(oldPin.value))) {
        msg.textContent = 'Текущий PIN неверный.';
        return;
      }
      await setPin(newPin.value);
      oldPin.value = '';
      newPin.value = '';
      msg.textContent = 'PIN изменён.';
    } catch (_) {
      msg.textContent = 'Не удалось изменить PIN в этом браузере.';
    }
  });
  const lockBtn = el('button', { class: 'btn', type: 'button', text: 'Заблокировать сейчас' });
  lockBtn.addEventListener('click', onLockNow);
  root.append(
    el('div', { class: 'settings-group' }, [
      el('h2', { text: 'Безопасность' }),
      el('label', { class: 'stack' }, [el('span', { text: 'Автоблокировка при сворачивании' }), sel]),
      change,
      lockBtn,
      el('p', { class: 'muted', text: 'Сейчас PIN защищает только вход в приложение на этом устройстве. В приложении пока нет личных данных; защита данных (токен и шифрование) появится на этапе 2.' }),
    ]),
  );

  // О системе
  root.append(
    el('div', { class: 'settings-group' }, [
      el('h2', { text: 'О системе' }),
      el('dl', { class: 'kv' }, [
        el('dt', { text: 'Версия' }), el('dd', { text: VERSION }),
        el('dt', { text: 'Данные' }), el('dd', { text: 'не подключены (этап 2)' }),
        el('dt', { text: 'Источники' }), el('dd', { text: 'не подключены' }),
      ]),
    ]),
  );
  return root;
}

export function renderRoute(route, ctx) {
  if (route === 'settings') return settingsView(ctx);
  if (route === 'more') return moreView();
  if (PLACEHOLDERS[route]) return placeholderView(route);
  return el('section', { class: 'view' }, [
    el('h1', { text: 'Страница не найдена' }),
    el('p', { class: 'muted', text: 'Такой вкладки нет.' }),
    el('a', { class: 'btn', href: '#/today', text: 'На «Сегодня»' }),
  ]);
}
