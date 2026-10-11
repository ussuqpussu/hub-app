// Общий поиск: обычный текстовый поиск на устройстве, без ИИ. По началу слова, с русскими окончаниями и мелкими опечатками.
export const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim();

const ENDINGS = ['ыми', 'ими', 'ого', 'его', 'ому', 'ему', 'ами', 'ями', 'ая', 'яя', 'ое', 'ее', 'ые', 'ие', 'ый', 'ий', 'ой', 'ых', 'их', 'ую', 'юю', 'ом', 'ем', 'ам', 'ям', 'ах', 'ях', 'ов', 'ев', 'ей', 'ью', 'ия', 'ию', 'ть', 'ет', 'ут', 'ют', 'ат', 'ят', 'ла', 'ли', 'ло', 'ны', 'на', 'но', 'ы', 'и', 'а', 'я', 'о', 'е', 'у', 'ю', 'ь', 'й'];
export function stem(w) {
  if (w.length < 5) return w;
  for (const e of ENDINGS) if (w.endsWith(e) && w.length - e.length >= 3) return w.slice(0, -e.length);
  return w;
}
export const tokens = (s) => norm(s).split(' ').filter(Boolean).map(stem);

function lev1(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  if (i === a.length && i === b.length) return true;
  const sub = a.slice(i + 1) === b.slice(i + 1);
  const del = a.slice(i + 1) === b.slice(i);
  const ins = a.slice(i) === b.slice(i + 1);
  return sub || del || ins;
}

// Кириллица и латиница: «Импульс Групп» находит Impulse Group. Слово сводится к каркасу из согласных (без гласных и повторов).
const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'c', ш: 's', щ: 's', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'u', я: 'a' };
const memo = new Map();
export function skeleton(w) {
  if (memo.has(w)) return memo.get(w);
  const lat = [...w].map((c) => (TR[c] !== undefined ? TR[c] : c)).join('');
  const sk = lat.replace(/[aeiouy]/g, '').replace(/(.)\1+/g, '$1');
  memo.set(w, sk);
  return sk;
}
const hasCyr = (w) => /[а-я]/.test(w);

// Насколько слово запроса q подходит слову документа d (обе формы уже без окончаний): 0 нет, 1 опечатка, 2 начало слова, 3 точно.
export function wordScore(q, d) {
  if (q === d) return 3;
  if (q.length >= 2 && d.startsWith(q)) return 2;
  if (q.length >= 5 && d.length >= 5 && lev1(q, d)) return 1;
  if (q.length >= 4 && d.length >= 4 && hasCyr(q) !== hasCyr(d)) {
    const a = skeleton(q);
    if (a.length >= 3 && a === skeleton(d)) return 1;
  }
  return 0;
}

const FIELD_W = { title: 3, tags: 2, text: 1 };

// doc: { id, kind, title, text, tags: string[], hash, ...любые поля }
export function buildIndex(docs) {
  return docs.map((d) => ({ doc: d, f: { title: tokens(d.title), tags: tokens((d.tags || []).join(' ')), text: tokens(d.text) } }));
}

export function search(index, query, { limit = 40 } = {}) {
  const q = tokens(query);
  if (!q.length) return [];
  const out = [];
  for (const { doc, f } of index) {
    let total = 0;
    let all = true;
    for (const w of q) {
      let best = 0;
      for (const [field, arr] of Object.entries(f)) {
        for (const t of arr) {
          const s = wordScore(w, t);
          if (s) best = Math.max(best, s * FIELD_W[field]);
        }
      }
      if (!best) { all = false; break; }
      total += best;
    }
    if (all) out.push({ doc, score: total });
  }
  return out.sort((a, b) => b.score - a.score || String(a.doc.title).localeCompare(String(b.doc.title), 'ru')).slice(0, limit).map((r) => r.doc);
}

// Компании, которым соответствует запрос целиком (для блока «справка»).
export function matchCompanies(names, query) {
  const q = tokens(query);
  if (!q.length) return [];
  return names.filter((n) => {
    const t = tokens(n);
    return q.every((w) => t.some((x) => wordScore(w, x) > 0));
  });
}
