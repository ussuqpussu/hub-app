// Запасной путь: разбор текста из документа «Спецтехника: план…» (разделы «Пост на <дата>: <заголовок>») в посты хаба.
// Работает обычным кодом, без ИИ. Принимает и Markdown, и текст, скопированный из документа.
import { parseHashtags } from './rupor-parse.js';

const MONTHS = { января: 1, февраля: 2, марта: 3, апреля: 4, мая: 5, июня: 6, июля: 7, августа: 8, сентября: 9, октября: 10, ноября: 11, декабря: 12 };
const pad = (n) => String(n).padStart(2, '0');

export function parseDateText(s, year) {
  const t = String(s).trim().toLowerCase();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return t;
  m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  m = t.match(/^(\d{1,2})\s+([а-я]+)(?:\s+(\d{4}))?/);
  if (m && MONTHS[m[2]]) return `${m[3] || year}-${pad(MONTHS[m[2]])}-${pad(m[1])}`;
  return '';
}

const HEAD = /^\s{0,3}(?:#{1,6}\s*)?\**\s*Пост на\s+(.+?)\s*[:：—–-]\s+(.+?)\**\s*$/i;
const FIELD = /^\s*[*_]*(Источники|Источник|Фото|Тема|Метки|Хэштеги|Хештеги|Заметка для проверки)\s*:[*_]*\s*(.*)$/i;
const VERSION = /^\s{0,3}(?:#{1,6}\s*)?\**\s*(Версия для ВК|Версия для Telegram|Версия для Телеграм|Версия для ВКонтакте)\s*:?\**\s*$/i;
const strip = (s) => String(s).replace(/^[*_]+|[*_]+$/g, '').trim();
const slug = (s) => String(s).toLowerCase().replace(/[^a-zа-я0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40);

function parseSources(text) {
  const out = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s)]+)/g;
  let m;
  while ((m = re.exec(text))) {
    const url = (m[2] || m[3]).replace(/[.,;]+$/, '');
    const title = (m[1] || '').trim();
    const date = ((m[1] || '').match(/\d{2}\.\d{2}\.\d{4}/) || [''])[0];
    const iso = date ? date.split('.').reverse().join('-') : '';
    out.push({ title: title.replace(/,?\s*\d{2}\.\d{2}\.\d{4}/, '').trim() || url, url, date: iso });
  }
  return out;
}

// Возвращает { posts, skipped } : skipped — разделы, у которых не удалось понять дату.
export function parseDocPosts(text, { today = '2026-01-01' } = {}) {
  const year = today.slice(0, 4);
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let cur = null;
  for (const line of lines) {
    const h = line.match(HEAD);
    if (h) { cur = { dateRaw: h[1], title: strip(h[2]), lines: [] }; blocks.push(cur); } else if (cur) cur.lines.push(line);
  }
  const posts = [];
  let skipped = 0;
  for (const b of blocks) {
    const date = parseDateText(b.dateRaw, year);
    if (!date) { skipped += 1; continue; }
    const main = [];
    const vers = { vk: [], tg: [] };
    const f = {};
    let into = main;
    let field = null;
    for (const line of b.lines) {
      const v = line.match(VERSION);
      if (v) { into = /вк/i.test(v[1]) ? vers.vk : vers.tg; field = null; continue; }
      const m = line.match(FIELD);
      if (m) { field = m[1].toLowerCase(); f[field] = [m[2]]; continue; }
      if (field && line.trim() && !/^\s*$/.test(line) && /^\s*[-*]\s/.test(line)) { f[field].push(line); continue; }
      if (field && !line.trim()) { field = null; continue; }
      if (field) { f[field].push(line); continue; }
      into.push(line);
    }
    const body = (a) => a.join('\n').replace(/^\n+|\n+$/g, '').replace(/\n{3,}/g, '\n\n');
    const mainText = body(main);
    const vk = body(vers.vk) || mainText;
    const tg = body(vers.tg) || mainText;
    const fld = (...n) => n.map((k) => f[k]).find(Boolean)?.join('\n').trim() || '';
    const marks = fld('метки');
    const text = `${mainText} ${vk} ${tg}`;
    const hasBot = /start=src_|Applicationl_lbot/i.test(text) || !!marks;
    posts.push({
      id: `import-${date}-${slug(b.title)}`,
      path: '',
      date,
      title: b.title,
      rubric: '',
      type: mainText.length >= 2500 ? 'article' : 'post',
      topic: strip(fld('тема')),
      hashtags: parseHashtags(fld('хэштеги', 'хештеги')),
      botCall: hasBot,
      photo: strip(fld('фото')),
      review: strip(fld('заметка для проверки')),
      sources: parseSources(fld('источники', 'источник')),
      texts: { dzen: { title: b.title, text: mainText }, vk: { title: '', text: vk }, tg: { title: '', text: tg } },
    });
  }
  return { posts, skipped };
}
