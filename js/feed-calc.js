// Единая лента событий: события из карточек всех проектов, по дням.
import { colorIndex } from './projects-calc.js';
import { fromYmd, addDays } from './dates.js';

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

// Все события всех проектов, новые сверху. Одинаковые (проект, дата, текст) считаются один раз.
export function buildFeed(projects) {
  const out = [];
  const seen = new Set();
  projects.forEach((p) => {
    (p.events || []).forEach((e) => {
      if (!e || typeof e.date !== 'string' || typeof e.text !== 'string' || !e.text.trim()) return;
      const k = `${p.id}|${e.date}|${e.text.trim()}`;
      if (seen.has(k)) return;
      seen.add(k);
      out.push({ projectId: p.id, project: p.name, color: colorIndex(p.name), date: e.date, text: e.text.trim().replace(/\s+/g, ' '), at: e.at || 0 });
    });
  });
  return out.sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at || a.project.localeCompare(b.project, 'ru'));
}

export function dayLabel(date, today) {
  if (date === today) return 'Сегодня';
  if (date === addDays(today, -1)) return 'Вчера';
  const d = fromYmd(date);
  const year = d.getFullYear() === fromYmd(today).getFullYear() ? '' : ` ${d.getFullYear()}`;
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}${year}`;
}

// Группы по дням. projectId сужает ленту до одного проекта, limit обрезает по числу строк.
export function groupFeed(items, today, { projectId = null, limit = Infinity } = {}) {
  const groups = [];
  items.filter((i) => projectId === null || i.projectId === projectId).slice(0, limit).forEach((i) => {
    let g = groups[groups.length - 1];
    if (!g || g.date !== i.date) { g = { date: i.date, label: dayLabel(i.date, today), items: [] }; groups.push(g); }
    g.items.push(i);
  });
  return groups;
}
