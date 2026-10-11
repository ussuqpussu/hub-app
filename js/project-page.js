// Страница проекта: сводка, схема, события, вопросы, ссылки. Открывается по #/projects/<id>.
import { el } from './ui.js';
import { todayYmd } from './dates.js';
import { dateText } from './subs-parts.js';
import { STATUS_LABEL, NO_COMPANY, NO_TYPE } from './projects-calc.js';
import { mergedProjects, openEditor, mark } from './projects-view.js';
import { getProjectsState, onProjects, schemaOf, saveSchema, loadProjects } from './projects-data.js';
import { normalizeArch, emptyArch, freezeLayout, addNode, removeNode, setGroup } from './arch-calc.js';
import { renderDiagram, nodePanel, nodeEditor, edgeEditor } from './arch-view.js';

export function projectPage({ store, subscribe }, id) {
  const root = el('section', { class: 'view' });
  let selected = null;
  const find = () => mergedProjects(store).find((p) => p.id === id) || null;
  const archOf = (p) => (p.source === 'obsidian' ? schemaOf(p) : p.architecture ? normalizeArch(p.architecture) : null);
  const saveArch = (p, arch) => (p.source === 'obsidian' ? saveSchema(p, arch) : store.update('projects', p.id, { architecture: arch }));

  // Состояние правки схемы живёт здесь, чтобы не теряться при перерисовке страницы.
  const ed = { on: false, draft: null, node: null, edge: null, link: false, from: null, msg: '', busy: false };
  const clone = (a) => JSON.parse(JSON.stringify(a));

  function schemaSection(p) {
    const stored = archOf(p);
    const sec = el('section', { class: 'stack', 'aria-label': 'Схема проекта' });
    const top = el('div', { class: 'listhead' }, [el('h2', { text: 'Схема' })]);
    sec.append(top);
    if (!ed.on && (!stored || !stored.nodes.length)) {
      const add = el('button', { type: 'button', class: 'btn btn--primary btn--s', text: 'Нарисовать схему' });
      add.addEventListener('click', () => { ed.on = true; ed.draft = clone(stored || emptyArch()); ed.node = null; ed.edge = null; render(); });
      sec.append(el('div', { class: 'empty' }, [el('strong', { text: 'Схемы пока нет' }), el('span', { text: 'Нарисуй, из чего состоит проект: сайт, сервер, бот, база и как они связаны. Плашки можно двигать мышью.' })]), add);
      return sec;
    }
    let arch = ed.on ? ed.draft : clone(stored);
    const holder = el('div', { class: 'archwrap', tabindex: '0', 'aria-label': 'Схема, можно прокручивать' });
    const panel = el('div', { class: 'stack' });
    const msg = el('p', { class: 'err', role: 'alert', text: ed.msg });
    const toast = (t) => { ed.msg = t; msg.textContent = t; };
    const drawDiagram = () => {
      holder.replaceChildren(renderDiagram(arch, {
        draggable: true,
        selected: ed.on ? ed.node : view.node,
        selectedEdge: ed.on ? ed.edge : null,
        linkFrom: ed.on && ed.link ? ed.from : null,
        onEdge: ed.on ? (i) => { ed.edge = i; ed.node = null; ed.link = false; ed.from = null; drawDiagram(); drawPanel(); } : null,
        onNode: (n) => {
          if (ed.on && ed.link) {
            if (!ed.from) { ed.from = n.id; toast('Теперь нажми на плашку, куда должна идти стрелка.'); drawDiagram(); return; }
            if (ed.from !== n.id && !arch.edges.some((e) => e.from === ed.from && e.to === n.id)) arch.edges.push({ from: ed.from, to: n.id, label: '' });
            ed.edge = arch.edges.findIndex((e) => e.from === ed.from && e.to === n.id);
            ed.node = null; ed.link = false; ed.from = null; toast('');
            return void render();
          }
          if (ed.on) { ed.node = n.id; ed.edge = null; } else view.node = n.id;
          drawDiagram();
          drawPanel();
        },
        onMove: (id, x, y, done) => {
          if (done) {
            if (!ed.on) saveArch(p, normalizeArch(arch)).then(() => toast('')).catch((ex) => toast(ex.message || 'Не удалось сохранить положение'));
            return;
          }
          if (arch.nodes.some((n) => n.x === undefined)) { arch = freezeLayout(arch); if (ed.on) ed.draft = arch; }
          const n = arch.nodes.find((q) => q.id === id);
          n.x = x; n.y = y;
          drawDiagram();
        },
      }));
    };
    const drawPanel = () => {
      panel.replaceChildren();
      if (ed.on && ed.edge !== null && arch.edges[ed.edge]) {
        const e = arch.edges[ed.edge];
        panel.append(edgeEditor(arch, e, {
          onChange: drawDiagram,
          onSwap: () => { [e.from, e.to] = [e.to, e.from]; render(); },
          onDelete: () => { arch.edges.splice(ed.edge, 1); ed.edge = null; render(); },
        }));
        return;
      }
      const n = arch.nodes.find((x) => x.id === (ed.on ? ed.node : view.node));
      if (ed.on) {
        if (!n) { panel.append(el('p', { class: 'muted', text: 'Нажми на плашку, чтобы изменить её здесь, или на стрелку, чтобы подписать её. Тяни плашки мышью, куда удобно.' })); return; }
        panel.append(nodeEditor(arch, n, {
          onChange: drawDiagram,
          onGroup: (name) => { arch = setGroup(arch, n.id, name); ed.draft = arch; drawDiagram(); },
          onDelete: () => { arch = removeNode(arch, n.id); ed.draft = arch; ed.node = null; render(); },
        }));
        return;
      }
      panel.append(n ? nodePanel(n, { onEdit: () => { ed.on = true; ed.draft = clone(stored); ed.node = n.id; ed.edge = null; render(); } }) : el('p', { class: 'muted', text: 'Нажми на плашку, чтобы увидеть подробности. Плашки можно двигать мышью: положение запомнится.' }));
    };
    drawDiagram();
    drawPanel();

    if (!ed.on) {
      const editBtn = el('button', { type: 'button', class: 'btn btn--s', text: 'Изменить схему' });
      editBtn.addEventListener('click', () => { ed.on = true; ed.draft = clone(stored); ed.node = view.node; ed.edge = null; render(); });
      top.append(editBtn);
    } else {
      const btn = (text, cls, fn, pressed) => { const b = el('button', { type: 'button', class: `btn btn--s ${cls}`, text }); if (pressed !== undefined) b.setAttribute('aria-pressed', String(pressed)); b.addEventListener('click', fn); return b; };
      const save = btn(ed.busy ? 'Сохраняю…' : 'Сохранить', 'btn--primary', async () => {
        if (arch.nodes.some((n) => !n.name.trim())) return toast('У каждой плашки должно быть название.');
        if (arch.nodes.some((n) => n.url && !/^https?:\/\//i.test(n.url))) return toast('Адрес плашки должен начинаться с http:// или https://.');
        ed.busy = true; save.disabled = true;
        try {
          await saveArch(p, normalizeArch(arch));
          Object.assign(ed, { on: false, draft: null, node: null, edge: null, link: false, from: null, msg: '', busy: false });
        } catch (ex) {
          ed.busy = false; ed.msg = ex.message || 'Не удалось сохранить';
        }
        render();
      });
      const bar = el('div', { class: 'archbar' }, [
        btn('Добавить плашку', '', () => { const r = addNode(arch); arch = r.arch; ed.draft = arch; ed.node = r.node.id; ed.edge = null; render(); }),
        btn('Соединить стрелкой', ed.link ? 'btn--primary' : '', () => { ed.link = !ed.link; ed.from = null; ed.node = null; ed.edge = null; ed.msg = ed.link ? 'Нажми на плашку, откуда идёт стрелка.' : ''; render(); }, ed.link),
        save,
        btn('Отмена', 'btn--ghost', () => { Object.assign(ed, { on: false, draft: null, node: null, edge: null, link: false, from: null, msg: '', busy: false }); render(); }),
      ]);
      sec.append(bar);
    }
    sec.append(holder);
    if (ed.on) sec.append(msg);
    sec.append(el('p', { class: 'muted archlegend' }, [el('span', { class: 'archlegend__dot', 'data-status': 'ok' }), ' работает ', el('span', { class: 'archlegend__dot', 'data-status': 'unknown' }), ' не проверялось ', el('span', { class: 'archlegend__dot', 'data-status': 'down' }), ' не работает ', el('span', { class: 'archlegend__dot', 'data-status': 'planned' }), ' запланировано']), panel);
    if (!ed.on) sec.append(msg);
    return sec;
  }
  const view = { node: null };

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

    root.append(schemaSection(p));
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
