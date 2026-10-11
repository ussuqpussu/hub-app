// Страница проекта: сводка, схема, события, вопросы, ссылки. Открывается по #/projects/<id>.
import { el } from './ui.js';
import { todayYmd } from './dates.js';
import { dateText } from './subs-parts.js';
import { STATUS_LABEL, STATUS_ORDER, NO_COMPANY, NO_TYPE, parseTags, companies, typeOptions, relatedProjects, refKey, refOf } from './projects-calc.js';
import { mergedProjects, saveFields, askDelete, mark } from './projects-view.js';
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
    let arch = ed.on ? ed.draft : clone(view.pending || stored);
    const holder = el('div', { class: 'archwrap', tabindex: '0', 'aria-label': 'Схема, можно прокручивать' });
    const panel = el('div', { class: 'stack' });
    const msg = el('p', { class: 'err', role: 'alert', text: ed.msg });
    const toast = (t) => { ed.msg = t; msg.textContent = t; };
    holder.addEventListener('scroll', () => { view.sl = holder.scrollLeft; view.st = holder.scrollTop; });
    const drawDiagram = () => {
      const sl = holder.isConnected ? holder.scrollLeft : view.sl;
      const st = holder.isConnected ? holder.scrollTop : view.st;
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
            view.drag = false;
            if (ed.on && view.late) { view.late = false; setTimeout(render, 0); }
            if (!ed.on) {
              view.pending = arch;
              saveArch(p, normalizeArch(arch)).then(() => toast('')).catch((ex) => toast(ex.message || 'Не удалось сохранить положение')).finally(() => { view.pending = null; view.late = false; if (!view.drag) render(); });
            }
            return;
          }
          view.drag = true;
          if (arch.nodes.some((n) => n.x === undefined)) { arch = freezeLayout(arch); if (ed.on) ed.draft = arch; }
          const n = arch.nodes.find((q) => q.id === id);
          n.x = x; n.y = y;
          drawDiagram();
        },
      }));
      holder.scrollLeft = sl; holder.scrollTop = st;
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
    setTimeout(() => { holder.scrollLeft = view.sl; holder.scrollTop = view.st; }, 0);
    if (ed.on) sec.append(msg);
    sec.append(el('p', { class: 'muted archlegend' }, [el('span', { class: 'archlegend__dot', 'data-status': 'ok' }), ' работает ', el('span', { class: 'archlegend__dot', 'data-status': 'unknown' }), ' не проверялось ', el('span', { class: 'archlegend__dot', 'data-status': 'down' }), ' не работает ', el('span', { class: 'archlegend__dot', 'data-status': 'planned' }), ' запланировано']), panel);
    if (!ed.on) sec.append(msg);
    return sec;
  }
  const view = { node: null, sl: 0, st: 0, drag: false, pending: null };

  // Правка карточки прямо на странице: поля те же, что в карточке; «Подтвердить» сохраняет, «Отмена» отбрасывает.
  const pe = { on: false, d: null, err: '', busy: false };
  const cloneP = (p) => ({
    name: p.name, company: p.company, types: [...p.types], status: p.status, tags: [...p.tags], summary: p.summary, nextAction: p.nextAction,
    events: p.events.map((e) => ({ ...e })), questions: [...(p.questions || [])], links: p.links.map((l) => ({ ...l })), related: [...(p.related || [])], logo: p.logo || '',
  });
  const stopEdit = () => { Object.assign(pe, { on: false, d: null, err: '', busy: false }); };
  const sectionCard = (title, ...kids) => el('section', { class: 'card stack stack--tight' }, [el('h2', { text: title }), ...kids]);
  const rowOf = (text, onDel, label) => {
    const x = el('button', { type: 'button', class: 'iconbtn2', 'aria-label': label, text: '×' });
    x.addEventListener('click', onDel);
    return el('li', { class: 'evline' }, [el('span', { text }), x]);
  };
  const addRow = (inputs, label, onAdd) => {
    const b = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: label });
    b.addEventListener('click', () => { if (onAdd()) render(); });
    return el('div', { class: 'task-form__row' }, [...inputs, b]);
  };
  const inp = (label, value, attrs = {}) => el('input', { class: 'field', 'aria-label': label, placeholder: label, value: value || '', ...attrs });

  function relatedCard(p, list, editing) {
    const rel = relatedProjects(list, editing ? { ...p, related: pe.d.related } : p);
    const chip = (x, note) => {
      const a = el('a', { class: 'relchip', href: `#/projects/${encodeURIComponent(x.id)}` }, [mark(x), el('span', { class: 'relchip__t' }, [el('b', { text: x.name }), el('span', { class: 'muted', text: [STATUS_LABEL[x.status], note].filter(Boolean).join(' · ') })])]);
      return a;
    };
    const parts = [];
    if (rel.sameCompany.length) parts.push(el('div', { class: 'stack stack--tight' }, [el('h3', { text: `Та же компания: ${p.company}` }), el('div', { class: 'relgrid' }, rel.sameCompany.map((x) => chip(x)))]));
    if (rel.manual.length || (editing && pe.d.related.length)) {
      const kids = rel.manual.map((x) => {
        const c = chip(x);
        if (!editing) return c;
        const del = el('button', { type: 'button', class: 'iconbtn2', 'aria-label': `Убрать связь с ${x.name}`, text: '×' });
        del.addEventListener('click', () => { pe.d.related = pe.d.related.filter((r) => refKey(r) !== refKey(x.name)); render(); });
        return el('div', { class: 'relwrap' }, [c, del]);
      });
      if (editing) rel.missing.forEach((m) => {
        const del = el('button', { type: 'button', class: 'iconbtn2', 'aria-label': `Убрать связь с ${m}`, text: '×' });
        del.addEventListener('click', () => { pe.d.related = pe.d.related.filter((r) => r !== m); render(); });
        kids.push(el('div', { class: 'relwrap' }, [el('span', { class: 'muted', text: `«${m}»: такой карточки нет` }), del]));
      });
      parts.push(el('div', { class: 'stack stack--tight' }, [el('h3', { text: 'Связаны вручную' }), el('div', { class: 'relgrid' }, kids)]));
    }
    if (rel.back.length) parts.push(el('div', { class: 'stack stack--tight' }, [el('h3', { text: 'Ссылаются на этот проект' }), el('div', { class: 'relgrid' }, rel.back.map((x) => chip(x)))]));
    if (editing) {
      const taken = new Set([p.id, ...rel.sameCompany.map((x) => x.id), ...rel.manual.map((x) => x.id)]);
      const options = list.filter((x) => !taken.has(x.id));
      if (options.length) {
        const sel = el('select', { class: 'field', 'aria-label': 'Связать с проектом' }, [el('option', { value: '', text: 'Выбери проект…' }), ...options.map((x) => el('option', { value: x.id, text: x.name }))]);
        parts.push(addRow([sel], 'Связать', () => { const x = options.find((o) => o.id === sel.value); if (!x) return false; pe.d.related.push(refOf(x)); return true; }));
      }
    }
    if (!parts.length) return null;
    return sectionCard('Связанные проекты', ...parts);
  }

  function renderEditing(p, back, list) {
    const d = pe.d;
    const save = el('button', { type: 'button', class: 'btn btn--primary btn--s', text: pe.busy ? 'Сохраняю…' : 'Подтвердить' });
    const cancel = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Отмена' });
    cancel.addEventListener('click', () => { stopEdit(); render(); });
    save.addEventListener('click', async () => {
      d.name = d.name.trim();
      if (!d.name) { pe.err = 'Напиши название.'; return render(); }
      if (d.links.some((l) => !/^https?:\/\//i.test(l.url))) { pe.err = 'Каждая ссылка должна начинаться с http:// или https://.'; return render(); }
      pe.busy = true; pe.err = ''; save.disabled = true;
      try {
        await saveFields(store, p, { ...d, tags: parseTags(d.tags.join(', ')), company: d.company.trim(), summary: d.summary.trim(), nextAction: d.nextAction.trim() });
        stopEdit();
      } catch (ex) {
        pe.busy = false; pe.err = ex.message || 'Не удалось сохранить';
      }
      render();
    });
    root.append(el('div', { class: 'row' }, [back, el('div', { class: 'row' }, [save, cancel])]));
    if (pe.err) root.append(el('p', { class: 'err', role: 'alert', text: pe.err }));
    if (p.source === 'obsidian') root.append(el('p', { class: 'sched-note', text: `Карточка хранится в Obsidian (${p.path}). Подтверждение запишет изменения в тот же файл на GitHub. Перед правками в Obsidian на компьютере сделай git pull.` }));
    const name = p.source === 'obsidian' ? el('h1', { text: p.name }) : inp('Название', d.name, { maxlength: '80' });
    name.addEventListener('input', () => { d.name = name.value; });
    root.append(el('div', { class: 'pcard__top' }, [mark(p), el('div', { class: 'pcard__title' }, [name])]));

    const status = el('select', { class: 'field', 'aria-label': 'Статус' }, STATUS_ORDER.map((k) => el('option', { value: k, text: STATUS_LABEL[k] })));
    status.value = d.status; status.addEventListener('change', () => { d.status = status.value; });
    const company = inp('Компания или заказчик', d.company, { maxlength: '60', list: 'pp-companies' });
    company.addEventListener('input', () => { d.company = company.value; });
    const tags = inp('Теги через запятую', d.tags.join(', '));
    tags.addEventListener('input', () => { d.tags = parseTags(tags.value); });
    const chips = el('div', { class: 'chips', role: 'group', 'aria-label': 'Тип проекта' }, [...new Set([...typeOptions(list), ...d.types])].map((t) => {
      const b = el('button', { type: 'button', class: 'chip', 'aria-pressed': String(d.types.includes(t)), text: t });
      b.addEventListener('click', () => { d.types = d.types.includes(t) ? d.types.filter((x) => x !== t) : [...d.types, t]; render(); });
      return b;
    }));
    const newType = inp('Свой тип', '', { maxlength: '30' });
    const lbl = (t, k) => el('div', { class: 'stack stack--tight' }, [el('span', { class: 'muted', text: t }), k]);
    root.append(
      sectionCard('Основное', lbl('Статус', status), company, el('datalist', { id: 'pp-companies' }, companies(list).map((c) => el('option', { value: c }))), lbl('Тип (можно несколько)', chips), addRow([newType], 'Добавить тип', () => { const v = newType.value.trim(); if (!v || d.types.includes(v)) return false; d.types.push(v); return true; }), tags),
    );
    const next = inp('Следующее действие', d.nextAction, { maxlength: '120' });
    next.addEventListener('input', () => { d.nextAction = next.value; });
    root.append(sectionCard('Следующее действие', next));
    const sum = el('textarea', { class: 'field field--area', 'aria-label': 'Сводка', rows: '4', maxlength: '600', placeholder: 'Что это и в каком состоянии' });
    sum.value = d.summary; sum.addEventListener('input', () => { d.summary = sum.value; });
    root.append(sectionCard('Сводка', sum));

    root.append(schemaSection(p));

    const evText = inp('Новое событие', '', { maxlength: '160' });
    root.append(sectionCard('События', el('ul', { class: 'hist' }, d.events.slice(0, 15).map((e, i) => rowOf(`${dateText(e.date, todayYmd())}: ${e.text}`, () => { d.events.splice(i, 1); render(); }, 'Удалить событие'))),
      addRow([evText], 'Добавить событие', () => { const t = evText.value.trim(); if (!t) return false; d.events.unshift({ date: todayYmd(), text: t, at: Date.now() }); return true; })));
    const qText = inp('Новый вопрос', '', { maxlength: '200' });
    root.append(sectionCard('Открытые вопросы', el('ul', { class: 'hist' }, d.questions.map((q, i) => rowOf(q, () => { d.questions.splice(i, 1); render(); }, 'Удалить вопрос'))),
      addRow([qText], 'Добавить вопрос', () => { const t = qText.value.trim(); if (!t) return false; d.questions.push(t); return true; })));
    const lt = inp('Название ссылки', '', { maxlength: '60' });
    const lu = inp('Адрес (http…)', '', { type: 'url' });
    root.append(sectionCard('Ссылки', el('ul', { class: 'hist' }, d.links.map((l, i) => rowOf(l.title ? `${l.title}: ${l.url}` : l.url, () => { d.links.splice(i, 1); render(); }, 'Удалить ссылку'))),
      addRow([lt, lu], 'Добавить ссылку', () => { const u = lu.value.trim(); if (!u) return false; if (!/^https?:\/\//i.test(u)) { pe.err = 'Адрес ссылки должен начинаться с http:// или https://.'; return true; } d.links.push({ title: lt.value.trim(), url: u }); pe.err = ''; return true; })));
    const rc = relatedCard(p, list, true);
    if (rc) root.append(rc);
    const del = el('button', { type: 'button', class: 'btn btn--danger', text: 'Удалить проект' });
    del.addEventListener('click', () => askDelete(store, p, () => { stopEdit(); location.hash = '#/projects'; }));
    root.append(del);
  }

  function render() {
    const p = find();
    root.replaceChildren();
    const back = el('a', { class: 'btn btn--ghost btn--s', href: '#/projects', text: '← Проекты' });
    if (!p) {
      const ps = getProjectsState();
      root.append(back, el('div', { class: 'empty' }, [el('strong', { text: ps.busy || !ps.loaded ? 'Загружаю проект…' : 'Проект не найден' }), el('span', { text: 'Возможно, его удалили или карточка ещё не загрузилась из Obsidian.' })]));
      return;
    }
    const list = mergedProjects(store);
    if (pe.on) return renderEditing(p, back, list);
    const edit = el('button', { type: 'button', class: 'btn btn--s', text: 'Изменить карточку' });
    edit.addEventListener('click', () => { pe.on = true; pe.d = cloneP(p); pe.err = ''; render(); });
    root.append(
      el('div', { class: 'row' }, [back, edit]),
      el('div', { class: 'pcard__top' }, [mark(p), el('div', { class: 'pcard__title' }, [el('h1', { text: p.name }), el('span', { class: 'muted', text: [p.company || NO_COMPANY, p.types.join(', ') || NO_TYPE].join(' · ') })])]),
      el('div', { class: 'pillrow' }, [el('span', { class: 'pill', text: STATUS_LABEL[p.status] }), p.source === 'obsidian' ? el('span', { class: 'pill pill--src', text: 'Obsidian' }) : '', ...p.tags.map((t) => el('span', { class: 'pill', text: `#${t}` }))]),
    );
    if (p.nextAction) root.append(el('section', { class: 'card' }, [el('strong', { text: 'Следующее действие: ' }), p.nextAction]));
    if (p.summary) root.append(el('section', { class: 'card stack stack--tight' }, [el('h2', { text: 'Сводка' }), el('p', { class: 'pre', text: p.summary })]));
    const rc = relatedCard(p, list, false);
    if (rc) root.append(rc);
    root.append(schemaSection(p));
    if (p.events.length) root.append(el('section', { class: 'card stack stack--tight' }, [el('h2', { text: 'События' }), el('ul', { class: 'hist' }, p.events.slice(0, 15).map((e) => el('li', { text: `${dateText(e.date, todayYmd())}: ${e.text}` })))]));
    if (p.questions && p.questions.length) root.append(el('section', { class: 'card stack stack--tight' }, [el('h2', { text: 'Открытые вопросы' }), el('ul', { class: 'hist' }, p.questions.map((q) => el('li', { text: q })))]));
    if (p.links.length) root.append(el('section', { class: 'card stack stack--tight' }, [el('h2', { text: 'Ссылки' }), el('ul', { class: 'hist' }, p.links.map((l) => el('li', {}, [el('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer', text: l.title || l.url })])))]));
  }

  let dirty = false;
  const again = () => { if (!root.isConnected) return; if (view.drag) { view.late = true; return; } if (document.querySelector('dialog[open]')) dirty = true; else render(); };
  subscribe(again);
  const off = onProjects(() => { if (!root.isConnected) return off(); again(); });
  document.addEventListener('close', () => { if (dirty && root.isConnected) { dirty = false; setTimeout(render, 0); } }, true);
  if (!getProjectsState().loaded) loadProjects();
  render();
  return root;
}
