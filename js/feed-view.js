// Лента событий: «Название проекта: что произошло», по дням, с фильтром по проекту.
import { el } from './ui.js';
import { todayYmd } from './dates.js';
import { buildFeed, groupFeed } from './feed-calc.js';

export const feedLine = (i, { onProject } = {}) => {
  const name = onProject
    ? el('button', { type: 'button', class: 'feedline__proj', style: `color: var(--chart-${i.color})`, title: 'Показать только этот проект', text: i.project })
    : el('span', { class: 'feedline__proj', style: `color: var(--chart-${i.color})`, text: i.project });
  if (onProject) name.addEventListener('click', () => onProject(i.projectId));
  return el('li', { class: 'feedline' }, [name, el('a', { class: 'feedline__text', href: `#/projects/${encodeURIComponent(i.projectId)}`, text: i.text })]);
};

// ui: { fProject }, setUi(patch)
export function feedBoard({ projects, ui, setUi }) {
  const wrap = el('div', { class: 'stack' });
  const items = buildFeed(projects);
  const today = todayYmd();
  const ids = new Set(items.map((i) => i.projectId));
  const projectId = ui.fProject && ids.has(ui.fProject) ? ui.fProject : null;
  if (items.length) {
    const s = el('select', { class: 'field', 'aria-label': 'Проект ленты' }, [el('option', { value: '', text: 'Все проекты' }), ...projects.filter((p) => ids.has(p.id)).map((p) => el('option', { value: p.id, text: p.name }))]);
    s.value = projectId || '';
    s.addEventListener('change', () => setUi({ fProject: s.value || null }));
    wrap.append(s);
  }
  const groups = groupFeed(items, today, { projectId, limit: 150 });
  if (!groups.length) {
    wrap.append(el('div', { class: 'empty' }, [el('strong', { text: 'Событий пока нет' }), el('span', { text: 'Лента собирается из строк «Последние события» в карточках проектов. Добавь событие в карточке или в заметке Obsidian.' })]));
  }
  groups.forEach((g) => {
    const list = el('ul', { class: 'feedlist' }, g.items.map((i) => feedLine(i, { onProject: (id) => setUi({ fProject: id }) })));
    wrap.append(el('section', { class: 'stack stack--tight' }, [el('h3', { class: 'dayt', text: g.label }), list]));
  });
  wrap.append(el('p', { class: 'sched-note', text: 'События берутся из карточек проектов. Коммиты и журналы PROJECT_LOG.md репозиториев пока не подключены.' }));
  return wrap;
}
