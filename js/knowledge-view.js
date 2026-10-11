// «Знания»: заготовка. Источник данных по плану (раздел 8) — файлы Obsidian, пока они не подключены,
// вкладка честно показывает пустое состояние и ничего не выдумывает.
import { el } from './ui.js';
import { load, save } from './storage.js';

const KEY = 'hub.knowledgeTab';
const TABS = [
  { id: 'chronicle', name: 'Хроника', about: 'История сессий с Claude, сгруппированная по темам: один проект, одна ветка, с датами и краткими итогами.', empty: 'Хроники пока нет. Она заполнится, когда хаб получит доступ к твоим файлам в Obsidian.' },
  { id: 'prompts', name: 'Промпты и скиллы', about: 'Каталог твоих промптов и скиллов: название, назначение, дата, ссылка на файл, поиск и теги.', empty: 'Каталога пока нет. Он появится, когда будет подключена папка с промптами и скиллами в Obsidian.' },
];

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
    body.replaceChildren(el('p', { class: 'muted', text: t.about }), el('div', { class: 'empty' }, [el('strong', { text: 'Пока пусто' }), el('span', { text: t.empty })]));
  }
  render();
  root.append(seg, body);
  return root;
}
