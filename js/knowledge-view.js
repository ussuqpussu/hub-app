// «Знания»: заготовка. Источник данных по плану (раздел 8) — файлы Obsidian, пока они не подключены,
// вкладка честно показывает пустое состояние и ничего не выдумывает.
import { el } from './ui.js';
import { load, save } from './storage.js';
import { SKILLS } from './data/skills-data.js';
import { copyText } from './questions-view.js';

const KEY = 'hub.knowledgeTab';
const TABS = [
  { id: 'chronicle', name: 'Хроника', about: 'История сессий с Claude, сгруппированная по темам: один проект, одна ветка, с датами и краткими итогами.', empty: 'Хроники пока нет. Она заполнится, когда хаб получит доступ к твоим файлам в Obsidian.' },
  { id: 'prompts', name: 'Промпты и скиллы', about: 'Каталог твоих промптов и скиллов: название, назначение, версия, поиск и теги.', empty: 'Промптов пока нет. Скиллы ниже добавлены из твоих файлов, промпты появятся, когда будет подключена папка в Obsidian.' },
];

const kb = (n) => `${Math.max(1, Math.round(n / 1024))} КБ`;
function skillCard(k) {
  const pre = el('pre', { class: 'skill__text', hidden: '' });
  pre.textContent = k.body;
  const open = el('button', { type: 'button', class: 'btn', text: 'Показать текст', 'aria-expanded': 'false' });
  open.addEventListener('click', () => { const h = pre.hasAttribute('hidden'); if (h) pre.removeAttribute('hidden'); else pre.setAttribute('hidden', ''); open.textContent = h ? 'Скрыть текст' : 'Показать текст'; open.setAttribute('aria-expanded', String(h)); });
  const cp = el('button', { type: 'button', class: 'btn', text: 'Копировать текст' });
  cp.addEventListener('click', async () => { const ok = await copyText(k.body); cp.textContent = ok ? 'Скопировано' : 'Не удалось скопировать'; setTimeout(() => { cp.textContent = 'Копировать текст'; }, 1800); });
  const files = el('details', { class: 'skill__files' }, [el('summary', { text: `Файлы скилла (${k.files.length})` }), el('ul', {}, k.files.map(([f, n]) => el('li', { text: `${f} · ${kb(n)}` })))]);
  return el('article', { class: 'card skill', 'data-skill': k.id }, [
    el('h3', { text: k.name }),
    el('p', { class: 'muted', text: `Версия ${k.version} · ${k.date.split('-').reverse().join('.')}` }),
    el('p', { text: k.about }),
    el('p', { class: 'skill__tags' }, k.tags.map((x) => el('span', { class: 'chip', text: x }))),
    el('div', { class: 'row' }, [open, cp]), pre, files,
  ]);
}
function skillsCatalog() {
  const q = el('input', { class: 'field', type: 'search', placeholder: 'Поиск по скиллам', 'aria-label': 'Поиск по скиллам' });
  const list = el('div', { class: 'stack' });
  const draw = () => {
    const w = q.value.trim().toLowerCase();
    const f = SKILLS.filter((k) => !w || `${k.name} ${k.about} ${k.tags.join(' ')}`.toLowerCase().includes(w));
    list.replaceChildren(...(f.length ? f.map(skillCard) : [el('div', { class: 'empty' }, [el('strong', { text: 'Ничего не найдено' })])]));
  };
  q.addEventListener('input', draw);
  draw();
  return el('div', { class: 'stack' }, [el('h2', { text: 'Скиллы' }), q, list]);
}

export function knowledgeView() {
  const root = el('section', { class: 'view' }, [el('div', { class: 'view__head' }, [el('h1', { text: 'Знания' }), el('p', { class: 'muted', text: 'Хроника сессий и каталог промптов со скиллами.' })])]);
  let active = load(KEY, 'chronicle');
  if (!TABS.some((t) => t.id === active)) active = 'chronicle';
  const seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Раздел знаний' });
  const body = el('section', { class: 'stack' });
  function render() {
    seg.replaceChildren(...TABS.map((t) => {
      const b = el('button', { type: 'button', text: t.name, 'aria-pressed': String(t.id === active) });
      b.addEventListener('click', () => { active = t.id; save(KEY, active); render(); });
      return b;
    }));
    const t = TABS.find((x) => x.id === active);
    if (t.id === 'prompts') { body.replaceChildren(el('p', { class: 'muted', text: t.about }), skillsCatalog()); return; }
    body.replaceChildren(el('p', { class: 'muted', text: t.about }), el('div', { class: 'empty' }, [el('strong', { text: 'Пока пусто' }), el('span', { text: t.empty })]));
  }
  render();
  root.append(seg, body);
  return root;
}
