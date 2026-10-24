import { homeToday, homeWeekly } from './home-view.js';
import { load } from './storage.js';
import { el, ICONS, fmtTime } from './ui.js';
import { tasksView } from './tasks-view.js';
import { scheduleView } from './schedule-view.js';
import { settingsView } from './settings-view.js';
import { subsView } from './subs-view.js';
import { projectsView } from './projects-view.js';
import { projectPage } from './project-page.js';
import { weeklyView } from './weekly-view.js';
import { notesView } from './notes-view.js';
import { knowledgeView } from './knowledge-view.js';

export { ICONS, fmtTime };

export const VERSION = '0.51.0 (воздух, колонка по центру, лёгкое движение)';

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

export function renderRoute(route, ctx) {
  if (route === 'settings') return settingsView(ctx);
  if (route === 'tasks') return tasksView(ctx);
  if (route === 'schedule') return scheduleView(ctx);
  if (route === 'weekly') return homeWeekly(ctx);
  if (route === 'notes') return notesView(ctx);
  if (route === 'subscriptions') return subsView(ctx);
  if (route === 'projects') return ctx.param ? projectPage(ctx, ctx.param) : projectsView(ctx);
  if (route === 'today') return homeToday(ctx);
  if (route === 'more') return moreView();
  if (route === 'knowledge') return knowledgeView();
  if (PLACEHOLDERS[route]) return placeholderView(route);
  return el('section', { class: 'view' }, [
    el('h1', { text: 'Страница не найдена' }),
    el('p', { class: 'muted', text: 'Такой вкладки нет.' }),
    el('a', { class: 'btn', href: '#/today', text: 'На «Сегодня»' }),
  ]);
}
