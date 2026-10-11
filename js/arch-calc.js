// Схема проекта: формат architecture.json, проверка и раскладка узлов. Без обращения к странице, поэтому проверяется тестами.
export const NODE_TYPES = {
  site: 'Сайт', domain: 'Домен', server: 'Сервер или хостинг', repo: 'Репозиторий', crm: 'CRM', analytics: 'Аналитика',
  bot: 'Telegram-бот', userbot: 'Юзербот-сборщик', db: 'База данных', payment: 'Платёжка', service: 'Внешний сервис', device: 'Устройство', other: 'Другое',
};
export const NODE_STATUS = { ok: 'Работает', unknown: 'Не проверялось', down: 'Не работает', planned: 'Запланировано' };
export const NODE_W = 168;
export const NODE_H = 64;
const GAP_X = 88;
const GAP_Y = 28;
const PAD = 20;
const HEAD = 26;

const str = (v, max = 200) => String(v == null ? '' : v).trim().slice(0, max);

export const emptyArch = () => ({ schema: 1, nodes: [], edges: [], groups: [] });

// Приводит произвольный объект к схеме: лишнее выбрасывает, битые связи убирает.
export function normalizeArch(raw) {
  const a = emptyArch();
  if (!raw || typeof raw !== 'object') return a;
  const seen = new Set();
  (Array.isArray(raw.nodes) ? raw.nodes : []).forEach((n) => {
    const id = str(n && n.id, 40);
    if (!id || seen.has(id)) return;
    seen.add(id);
    a.nodes.push({
      id,
      type: NODE_TYPES[n.type] ? n.type : 'other',
      name: str(n.name, 60) || id,
      status: NODE_STATUS[n.status] ? n.status : 'unknown',
      url: str(n.url),
      host: str(n.host),
      repo: str(n.repo),
      deploy: str(n.deploy),
      keys: str(n.keys),
      note: str(n.note, 400),
      questions: (Array.isArray(n.questions) ? n.questions : []).map((q) => str(q, 200)).filter(Boolean),
    });
  });
  const ekey = new Set();
  (Array.isArray(raw.edges) ? raw.edges : []).forEach((e) => {
    const from = str(e && e.from, 40);
    const to = str(e && e.to, 40);
    if (!seen.has(from) || !seen.has(to) || from === to || ekey.has(`${from}>${to}>${str(e.label)}`)) return;
    ekey.add(`${from}>${to}>${str(e.label)}`);
    a.edges.push({ from, to, label: str(e.label, 60) });
  });
  const gseen = new Set();
  (Array.isArray(raw.groups) ? raw.groups : []).forEach((g) => {
    const id = str(g && g.id, 40);
    if (!id || gseen.has(id)) return;
    gseen.add(id);
    const nodes = [...new Set((Array.isArray(g.nodes) ? g.nodes : []).map((x) => str(x, 40)).filter((x) => seen.has(x)))];
    a.groups.push({ id, name: str(g.name, 60) || id, nodes });
  });
  return a;
}

// Новый уникальный id по названию
export function newId(arch, base = 'uzel') {
  const ids = new Set(arch.nodes.map((n) => n.id).concat(arch.groups.map((g) => g.id)));
  const slug = str(base, 24).toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, '') || 'uzel';
  let id = slug;
  for (let i = 2; ids.has(id); i += 1) id = `${slug}-${i}`;
  return id;
}

export function removeNode(arch, id) {
  return {
    ...arch,
    nodes: arch.nodes.filter((n) => n.id !== id),
    edges: arch.edges.filter((e) => e.from !== id && e.to !== id),
    groups: arch.groups.map((g) => ({ ...g, nodes: g.nodes.filter((x) => x !== id) })),
  };
}

// Слои слева направо: длинный путь от источников. Циклы не ломают расчёт (обратные связи не учитываются).
export function layers(arch) {
  const idx = new Map(arch.nodes.map((n, i) => [n.id, i]));
  const adj = new Map(arch.nodes.map((n) => [n.id, []]));
  arch.edges.forEach((e) => adj.get(e.from).push(e.to));
  const state = new Map();
  const back = new Set();
  const visit = (u) => {
    state.set(u, 1);
    adj.get(u).forEach((v) => {
      if (state.get(v) === 1) back.add(`${u}>${v}`);
      else if (!state.has(v)) visit(v);
    });
    state.set(u, 2);
  };
  arch.nodes.forEach((n) => { if (!state.has(n.id)) visit(n.id); });
  const level = new Map(arch.nodes.map((n) => [n.id, 0]));
  const order = [...arch.nodes].map((n) => n.id);
  for (let pass = 0; pass < order.length; pass += 1) {
    let changed = false;
    arch.edges.forEach((e) => {
      if (back.has(`${e.from}>${e.to}`)) return;
      if (level.get(e.to) < level.get(e.from) + 1) { level.set(e.to, level.get(e.from) + 1); changed = true; }
    });
    if (!changed) break;
  }
  return { level, back, idx };
}

// Раскладка: колонки по слоям, внутри колонки узлы одной группы идут подряд. Возвращает размеры в условных пикселях.
export function computeLayout(arch) {
  const { level, back, idx } = layers(arch);
  const groupOf = new Map();
  arch.groups.forEach((g, gi) => g.nodes.forEach((id) => { if (!groupOf.has(id)) groupOf.set(id, gi); }));
  const cols = [];
  arch.nodes.forEach((n) => {
    const l = level.get(n.id);
    (cols[l] = cols[l] || []).push(n.id);
  });
  const pos = new Map();
  let height = 0;
  cols.forEach((ids, c) => {
    if (!ids) return;
    ids.sort((a, b) => (groupOf.has(a) ? groupOf.get(a) : 1e6) - (groupOf.has(b) ? groupOf.get(b) : 1e6) || idx.get(a) - idx.get(b));
    let y = PAD + HEAD;
    let prev;
    ids.forEach((id) => {
      const g = groupOf.get(id);
      if (prev !== undefined && g !== prev) y += HEAD + PAD; // место под рамку и заголовок следующей группы
      pos.set(id, { id, x: PAD + c * (NODE_W + GAP_X), y, w: NODE_W, h: NODE_H });
      y += NODE_H + GAP_Y;
      prev = g;
    });
    height = Math.max(height, y);
  });
  const width = PAD * 2 + Math.max(1, cols.length) * NODE_W + Math.max(0, cols.length - 1) * GAP_X;
  const groups = [];
  arch.groups.forEach((g) => {
    const ps = g.nodes.map((id) => pos.get(id)).filter(Boolean);
    if (!ps.length) return;
    const x1 = Math.min(...ps.map((p) => p.x)) - 10;
    const y1 = Math.min(...ps.map((p) => p.y)) - HEAD;
    const x2 = Math.max(...ps.map((p) => p.x + p.w)) + 10;
    const y2 = Math.max(...ps.map((p) => p.y + p.h)) + 10;
    groups.push({ id: g.id, name: g.name, x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
  });
  const edges = arch.edges.map((e) => {
    const a = pos.get(e.from);
    const b = pos.get(e.to);
    const isBack = back.has(`${e.from}>${e.to}`) || level.get(e.to) <= level.get(e.from);
    let d;
    let lx;
    let ly;
    if (!isBack) {
      const x1 = a.x + a.w;
      const y1 = a.y + a.h / 2;
      const x2 = b.x;
      const y2 = b.y + b.h / 2;
      const mx = (x1 + x2) / 2;
      d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
      lx = mx;
      ly = (y1 + y2) / 2;
    } else {
      const x1 = a.x + a.w / 2;
      const y1 = a.y + a.h;
      const x2 = b.x + b.w / 2;
      const y2 = b.y + b.h;
      const dy = Math.max(y1, y2) + 36;
      d = `M${x1},${y1} C${x1},${dy} ${x2},${dy} ${x2},${y2}`;
      lx = (x1 + x2) / 2;
      ly = dy - 6;
    }
    return { from: e.from, to: e.to, label: e.label, d, lx, ly };
  });
  const maxBack = edges.length ? Math.max(height, ...edges.map((e) => e.ly + 20)) : height;
  return { nodes: [...pos.values()], groups, edges, width, height: maxBack + PAD };
}

// Путь файла схемы для карточки из Obsidian: architecture/<имя заметки>.json
export const schemaPath = (cardPath) => `architecture/${String(cardPath).split('/').pop().replace(/\.md$/i, '')}.json`;
