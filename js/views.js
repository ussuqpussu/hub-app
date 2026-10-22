import { appearanceBlock } from './appearance-view.js';
import { monoToday, monoWeekly } from './mono-view.js';
const mono = () => ['mythmono', 'fusion'].includes(document.documentElement.dataset.theme);
import { AUTOLOCK_OPTIONS, getAutolock, setAutolock } from './pin.js';
import { hasTrust, enableTrust, disableTrust, verifyPin, changePin, getRecoveryCode, setToken, clearToken, getSession } from './data/vault.js';
import { createGithub } from './data/github.js';
import { load } from './storage.js';
import { el, ICONS, fmtTime } from './ui.js';
import { tasksView } from './tasks-view.js';
import { scheduleView, sourceLine } from './schedule-view.js';
import { subsView } from './subs-view.js';
import { projectsView } from './projects-view.js';
import { projectPage } from './project-page.js';
import { weeklyView } from './weekly-view.js';
import { notesView } from './notes-view.js';
import { knowledgeView } from './knowledge-view.js';
import { getScheduleState, loadSchedule, onSchedule } from './schedule-data.js';
import { todayView } from './today-view.js';

export { ICONS, fmtTime };

export const VERSION = '0.47.1 (дневник удалён из хаба)';

// Вкладки. group: main (в нижней панели телефона), more (внутри «Ещё»).
export const TABS = [
  { id: 'today', name: 'Сегодня', icon: 'today', group: 'main' },
  { id: 'schedule', name: 'Расписание', icon: 'calendar', group: 'main' },
  { id: 'tasks', name: 'Задачи', icon: 'tasks', group: 'main' },
  { id: 'projects', name: 'Проекты', icon: 'projects', group: 'main' },
  // «Умный дом» пока скрыт: модуль не сделан, вернуть строку, когда начнём этап.
  { id: 'subscriptions', name: 'Подписки', icon: 'subs', group: 'more' },
  { id: 'weekly', name: 'Итоги недели', icon: 'calendar', group: 'more' },
  { id: 'notes', name: 'Заметки и ссылки', icon: 'notes', group: 'more' },
  { id: 'knowledge', name: 'Знания', icon: 'knowledge', group: 'more' },
];

const PLACEHOLDERS = {
  tasks: ['Задачи и цели', 'Задачи со сроками, привычки и цели, а также «Входящие».', 'Задач, привычек и целей пока нет: они появятся на этапе 3.'],
  projects: ['Проекты', 'Карточки проектов, лента событий и открытые вопросы.', 'Данных пока нет: проекты из Obsidian подключатся на этапе 6.'],
  'smart-home': ['Умный дом', 'Управление устройствами, комнатами и сценариями.', 'Нет связи с сервером умного дома: он ещё не подключён (этап 14).'],
};

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

export function statusText(st) {
  if (st.state === 'notoken') return 'Данные только на этом устройстве';
  if (st.state === 'syncing') return 'Синхронизация…';
  if (st.state === 'offline') return st.pending ? `Нет связи · ждёт отправки: ${st.pending}` : 'Нет связи';
  if (st.state === 'error') return `Ошибка: ${st.error ? st.error.message : 'синхронизация'}`;
  if (st.pending) return `Ждёт отправки: ${st.pending}`;
  return st.lastSync ? `Обновлено: ${fmtTime(st.lastSync)}` : 'Ещё не синхронизировано';
}

function settingsView({ onLockNow, store, subscribe }) {
  const root = el('section', { class: 'view' }, [el('div', { class: 'view__head' }, [el('h1', { text: 'Настройки' })])]);

  // Оформление
  root.append(appearanceBlock());

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
  // Вход без PIN на этом устройстве
  const trustBox = el('div', { class: 'stack' });
  const paintTrust = () => {
    if (hasTrust()) {
      const off = el('button', { class: 'btn', type: 'button', text: 'Вернуть запрос PIN' });
      off.addEventListener('click', () => { disableTrust(); paintTrust(); });
      trustBox.replaceChildren(
        el('p', { text: 'Вход без PIN включён: хаб открывается сразу. Ключ данных хранится на этом устройстве открыто, поэтому любой, кто откроет хаб здесь, увидит всё.' }),
        off,
      );
      lockBtn.hidden = true;
      sel.disabled = true;
      return;
    }
    lockBtn.hidden = false;
    sel.disabled = false;
    const tp = pinField('PIN для подтверждения');
    const tm = el('p', { class: 'muted', role: 'status' });
    const on = el('form', { class: 'stack' }, [tp, el('button', { class: 'btn', type: 'submit', text: 'Входить без PIN на этом устройстве' }), tm]);
    on.addEventListener('submit', async (e) => {
      e.preventDefault();
      try { await enableTrust(tp.value); paintTrust(); } catch (_) { tm.textContent = 'PIN неверный.'; }
    });
    trustBox.replaceChildren(on, el('p', { class: 'muted', text: 'Ключ данных будет храниться на устройстве открыто: так удобнее, но слабее защита, если кто-то получит доступ к разблокированному устройству.' }));
  };
  paintTrust();
  root.append(
    el('div', { class: 'settings-group' }, [
      el('h2', { text: 'Безопасность' }),
      el('label', { class: 'stack' }, [el('span', { text: 'Автоблокировка при сворачивании' }), sel]),
      change,
      codeForm,
      trustBox,
      lockBtn,
      el('p', { class: 'muted', text: 'PIN открывает ключ, которым шифруются личные записи. Если устройство потеряно: отзови токен на github.com (Settings → Developer settings). Без кода восстановления данные на новом устройстве не открыть.' }),
    ]),
  );

  // О системе
  loadSchedule();
  const srcDd = el('dd');
  const paintSrc = () => {
    const st = getScheduleState();
    srcDd.textContent = `расписание: ${st.data ? sourceLine(st) : 'нет данных'}; проекты, умный дом: не подключены`;
  };
  paintSrc();
  onSchedule(paintSrc);
  root.append(
    el('div', { class: 'settings-group' }, [
      el('h2', { text: 'О системе' }),
      el('dl', { class: 'kv' }, [
        el('dt', { text: 'Версия' }), el('dd', { text: VERSION }),
        el('dt', { text: 'Источники' }), srcDd,
      ]),
      updateButton(),
    ]),
  );
  return root;
}

// Сбрасывает кэш оболочки и перезагружает страницу. Данные (задачи, подписки, проекты) не затрагиваются.
function updateButton() {
  const msg = el('p', { class: 'muted', role: 'status' });
  const b = el('button', { type: 'button', class: 'btn', text: 'Обновить приложение' });
  b.addEventListener('click', async () => {
    b.disabled = true;
    msg.textContent = 'Обновляю…';
    try {
      if ('caches' in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
      if ('serviceWorker' in navigator) await Promise.all((await navigator.serviceWorker.getRegistrations()).map((r) => r.unregister()));
    } catch (_) {
      /* перезагрузка всё равно возьмёт свежие файлы */
    }
    location.reload();
  });
  return el('div', { class: 'stack stack--tight' }, [b, msg, el('p', { class: 'muted', text: 'Если после выхода новой версии на экране всё по-старому, нажми эту кнопку. Данные не удаляются.' })]);
}

export function renderRoute(route, ctx) {
  if (route === 'settings') return settingsView(ctx);
  if (route === 'tasks') return tasksView(ctx);
  if (route === 'schedule') return scheduleView(ctx);
  if (route === 'weekly') return mono() ? monoWeekly(ctx) : weeklyView(ctx);
  if (route === 'notes') return notesView(ctx);
  if (route === 'subscriptions') return subsView(ctx);
  if (route === 'projects') return ctx.param ? projectPage(ctx, ctx.param) : projectsView(ctx);
  if (route === 'today') return mono() ? monoToday(ctx) : todayView(ctx);
  if (route === 'more') return moreView();
  if (route === 'knowledge') return knowledgeView();
  if (PLACEHOLDERS[route]) return placeholderView(route);
  return el('section', { class: 'view' }, [
    el('h1', { text: 'Страница не найдена' }),
    el('p', { class: 'muted', text: 'Такой вкладки нет.' }),
    el('a', { class: 'btn', href: '#/today', text: 'На «Сегодня»' }),
  ]);
}
