// Разбор файла поста «Рупора»: заметка с блоком свойств и разделами. Формат описан в spec-stage10-rupor.md.
import { splitFrontmatter } from './projects-parse.js';

const ALIAS = {
  date: ['date', 'дата'],
  title: ['title', 'заголовок', 'название'],
  rubric: ['rubric', 'рубрика'],
  type: ['type', 'тип'],
  topic: ['topic', 'тема'],
  hashtags: ['hashtags', 'хэштеги', 'хештеги'],
  botCall: ['bot', 'bot_call', 'призыв', 'призыв к боту'],
  photo: ['photo', 'фото'],
};
const pick = (props, names) => {
  for (const n of names) if (props[n] !== undefined) return props[n];
  return undefined;
};
const YES = /^(да|yes|true|1|есть)$/i;
const unq = (s) => String(s).trim();

function sections(body) {
  const out = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const h = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (h) {
      cur = { name: h[1].toLowerCase(), lines: [] };
      out.push(cur);
    } else if (cur) cur.lines.push(line);
  }
  return out;
}
const find = (secs, ...names) => {
  for (const n of names) {
    const s = secs.find((x) => x.name.startsWith(n));
    if (s) return s.lines.join('\n').replace(/^\n+|\n+$/g, '');
  }
  return '';
};

export function parseHashtags(v) {
  const raw = Array.isArray(v) ? v.join(' ') : String(v || '');
  return [...new Set(raw.split(/[\s,;]+/).map((t) => t.replace(/^#*/, '')).filter(Boolean))].map((t) => `#${t}`);
}

function parseSources(text) {
  return text
    .split('\n')
    .map((l) => l.match(/^\s*[-*]\s+(.*)$/))
    .filter(Boolean)
    .map((m) => {
      const t = m[1].trim();
      const url = (t.match(/https?:\/\/\S+/) || [''])[0].replace(/[).,]+$/, '');
      const date = (t.match(/\d{4}-\d{2}-\d{2}/) || [''])[0];
      const title = t.replace(url, '').replace(date, '').replace(/[()]/g, ' ').replace(/\s{2,}/g, ' ').replace(/[\s,;—–-]+$/, '').trim();
      return { title: title || url, url, date };
    });
}

// Версия площадки: первая строка вида «Заголовок: …» (или «# ») отделяется от текста.
function splitTitle(block) {
  const m = block.match(/^(?:заголовок|title):\s*(.+)\n+/i);
  return m ? { title: m[1].trim(), text: block.slice(m[0].length).trim() } : { title: '', text: block.trim() };
}

export function parsePost(path, text) {
  const { props, body } = splitFrontmatter(text);
  if (!props) return null;
  const date = unq(pick(props, ALIAS.date) || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const secs = sections(body);
  const main = splitTitle(find(secs, 'мастер', 'дзен'));
  const vk = splitTitle(find(secs, 'вк', 'версия для вк'));
  const tg = splitTitle(find(secs, 'telegram', 'телеграм', 'версия для telegram'));
  const title = unq(pick(props, ALIAS.title) || main.title || '');
  if (!title) return null;
  const typeRaw = String(pick(props, ALIAS.type) || '').toLowerCase();
  const bodyTags = (body.match(/^(?:хэштеги|хештеги):\s*(.+)$/im) || [])[1];
  return {
    id: path.replace(/^rupor\//, '').replace(/\.md$/i, ''),
    path,
    date,
    title,
    rubric: unq(pick(props, ALIAS.rubric) || ''),
    type: /стат|article/.test(typeRaw) ? 'article' : 'post',
    topic: unq(pick(props, ALIAS.topic) || ''),
    hashtags: parseHashtags(pick(props, ALIAS.hashtags) || bodyTags || ''),
    botCall: YES.test(String(pick(props, ALIAS.botCall) || '')),
    photo: unq(pick(props, ALIAS.photo) || find(secs, 'фото')),
    review: find(secs, 'заметка для проверки', 'заметка'),
    sources: parseSources(find(secs, 'источники')),
    texts: {
      dzen: { title: main.title || title, text: main.text },
      vk: { title: vk.title, text: vk.text },
      tg: { title: tg.title, text: tg.text },
    },
  };
}
