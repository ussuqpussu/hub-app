// Страница проекта: сводка, схема, события, вопросы, ссылки. Открывается по #/projects/<id>.
import { el } from './ui.js';
import { todayYmd } from './dates.js';
import { dateText } from './subs-parts.js';
import { STATUS_LABEL, NO_COMPANY, NO_TYPE } from './projects-calc.js';
import { mergedProjects, openEditor, mark } from './projects-view.js';
import { getProjectsState, onProjects, schemaOf, saveSchema, loadProjects } from './projects-data.js';
import { normalizeArch, emptyArch } from './arch-calc.js';
import { renderDiagram, nodePanel, archSheet } from './arch-view.js';

export function projectPage({ store, subscribe }, id) {
  const root = el('section', { class: 'view' });
  let selected = null;
  const find = () => mergedProjects(store).find((p) => p.id === id) || null;
  const archOf = (p) => (p.source === 'obsidian' ? schemaOf(p) : p.architecture ? normalizeArch(p.architecture) : null);
  const saveArch = (p, arch) => (p.source === 'obsidian' ? saveSchema(p, arch) : store.update('projects', p.id, { architecture: arch }));

  function render() {
    const p = find();
    root.replaceChildren();
    const back = el('a', { class: 'btn btn--ghost btn--s', href: '#/projects', text: '← Проекты' });
    if (!p) {
      const ps = getProjectsState();
      root.append(back, el('div', { class: 'empty' }, [el('strong', { text: ps.busy || !ps.loaded ? 'Загружаю проект…' : 'Проект не найден' }), el('span', { text: 'Возможно, его удалили или карточка ещё не загрузилась из Obsidian.' })]));
      return;
    }
    const edit = el('button', { type: 'button', class: 'btn btn--s', text: 'Изменить карточку' });
    edit.addEventListener('click', () => openEditor(store, p, { onGone: () => { location.hash = '#/projects'; } }));
    root.append(
      el('div', { class: 'row' }, [back, edit]),
      el('div', { class: 'pcard__top' }, [mark(p), el('div', { class: 'pcard__title' }, [el('h1', { text: p.name }), el('span', { class: 'muted', text: [p.company || NO_COMPANY, p.types.join(', ') || NO_TYPE].join(' · ') })])]),
      el('div', { class: 'pillrow' }, [el('span', { class: 'pill', text: STATUS_LABEL[p.status] }), p.source === 'obsidian' ? el('span', { class: 'pill pill--src', text: 'Obsidian' }) : '', ...p.tags.map((t) => el('span', { class: 'pill', text: `#${t}` }))]),
    );
    if (p.nextAction) root.append(el('section', { class: 'card' }, [el('strong', { text: 'Следующее действие: ' }), p.nextAction]));
    if (p.summary) root.append(el('section', { class: 'card stack stack--tight' }, [el('h2', { text: 'Сводка' }), el('p', { class: 'pre', text: p.summary })]));

    // Схема
    const arch = archOf(p);
    const sec = el('section', { class: 'stack', 'aria-label': 'Схема проекта' }, [el('h2', { text: 'Схема' })]);
    const editArch = () => archSheet({ arch: arch || emptyArch(), onSave: (a) => saveArch(p, a) });
    if (!arch || !arch.nodes.length) {
      const add = el('button', { type: 'button', class: 'btn btn--primary btn--s', text: arch ? 'Добавить узлы' : 'Добавить схему' });
      add.addEventListener('click', editArch);
      sec.append(el('div', { class: 'empty' }, [el('strong', { text: 'Схемы пока нет' }), el('span', { text: 'Нарисуй, из чего состоит проект: сайт, сервер, бот, база и как они связаны.' })]), add);
    } else {
      const holder = el('div', { class: 'archwrap', tabindex: '0', 'aria-label': 'Схема, можно прокручивать' });
      const panel = el('div', {});
      const draw = () => {
        holder.replaceChildren(renderDiagram(arch, { selected, onNode: (n) => { selected = n.id; draw(); } }));
        const n = arch.nodes.find((x) => x.id === selected);
        panel.replaceChildren(n ? nodePanel(n, { onEdit: editArch }) : el('p', { class: 'muted', text: 'Нажми на узел, чтобы увидеть подробности.' }));
      };
      draw();
      const editBtn = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Изменить схему' });
      editBtn.addEventListener('click', editArch);
      const legend = el('p', { class: 'muted archlegend' }, [el('span', { class: 'archlegend__dot', 'data-status': 'ok' }), ' работает ', el('span', { class: 'archlegend__dot', 'data-status': 'unknown' }), ' не проверялось ', el('span', { class: 'archlegend__dot', 'data-status': 'down' }), ' не работает ', el('span', { class: 'archlegend__dot', 'data-status': 'planned' }), ' запланировано']);
      sec.append(holder, legend, panel, editBtn);
    }
    root.append(sec);

    if (p.events.length) root.append(el('section', { class: 'card stack stack--tight' }, [el('h2', { text: 'События' }), el('ul', { class: 'hist' }, p.events.slice(0, 15).map((e) => el('li', { text: `${dateText(e.date, todayYmd())}: ${e.text}` })))]));
    if (p.questions && p.questions.length) root.append(el('section', { class: 'card stack stack--tight' }, [el('h2', { text: 'Открытые вопросы' }), el('ul', { class: 'hist' }, p.questions.map((q) => el('li', { text: q })))]));
    if (p.links.length) root.append(el('section', { class: 'card stack stack--tight' }, [el('h2', { text: 'Ссылки' }), el('ul', { class: 'hist' }, p.links.map((l) => el('li', {}, [el('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer', text: l.title || l.url })])))]));
  }

  let dirty = false;
  const again = () => { if (!root.isConnected) return; if (document.querySelector('dialog[open]')) dirty = true; else render(); };
  subscribe(again);
  const off = onProjects(() => { if (!root.isConnected) return off(); again(); });
  document.addEventListener('close', () => { if (dirty && root.isConnected) { dirty = false; setTimeout(render, 0); } }, true);
  if (!getProjectsState().loaded) loadProjects();
  render();
  return root;
}
