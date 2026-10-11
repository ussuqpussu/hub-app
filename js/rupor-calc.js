// Расчёты «Рупора»: лимиты знаков, готовый текст к публикации, ссылка на бота, фильтры, запас.
export const BOT = 'Applicationl_lbot';
export const PLATFORMS = [['dzen', 'Дзен'], ['vk', 'ВКонтакте'], ['tg', 'Telegram']];
export const SRC = { dzen: 'src_dzen', vk: 'src_vk', tg: 'src_channel' };
export const STATUSES = [['new', 'Новый'], ['checked', 'Проверен'], ['photo', 'Фото добавлены'], ['published', 'Опубликован']];
export const RUBRICS = ['НовостиРынка', 'Новинки', 'Разборы', 'ТехникаБезСекретов', 'ИсторияТехники', 'ДляВладельцев'];
export const TAG_LIMIT = 6;
export const TAG_FIELD_LIMIT = 140;

export const botLink = (platform) => `https://t.me/${BOT}?start=${SRC[platform]}`;

// Что реально уйдёт в публикацию: текст, хэштеги и ссылка на бота (если в материале есть призыв).
export function outgoing(post, platform) {
  const t = post.texts[platform] || { title: '', text: '' };
  const parts = [t.text.trim()];
  if (post.botCall && !t.text.includes(`start=${SRC[platform]}`)) parts.push(botLink(platform));
  const tags = post.hashtags.join(' ');
  if (tags && !t.text.includes(post.hashtags[0] || '\u0000')) parts.push(tags);
  return parts.filter(Boolean).join('\n\n');
}

export function limits(post, platform) {
  if (platform === 'dzen') return post.type === 'article' ? { title: 140, text: 100000 } : { text: 4096 };
  if (platform === 'vk') return { text: 16000 };
  return { text: 4096, caption: 1024 };
}

export function counters(post, platform) {
  const lim = limits(post, platform);
  const text = outgoing(post, platform);
  const out = [{ label: 'Текст', n: [...text].length, max: lim.text }];
  const title = (post.texts[platform] && post.texts[platform].title) || '';
  if (lim.title && title) out.unshift({ label: 'Заголовок', n: [...title].length, max: lim.title });
  if (lim.caption) out[out.length - 1] = { label: 'Без фото', n: [...text].length, max: lim.text }, out.push({ label: 'С фото', n: [...text].length, max: lim.caption });
  return out.map((c) => ({ ...c, over: c.n > c.max }));
}

// Теги: для Дзена второй вид без «#» через запятую (поле тегов, если оно есть в редакторе).
export const tagsPlain = (post) => post.hashtags.map((t) => t.slice(1)).join(', ');
export function tagWarnings(post) {
  const w = [];
  if (post.hashtags.length > TAG_LIMIT) w.push(`Хэштегов больше ${TAG_LIMIT}`);
  if (tagsPlain(post).length > TAG_FIELD_LIMIT) w.push(`Теги длиннее ${TAG_FIELD_LIMIT} знаков`);
  return w;
}

export const emptyRec = (postId) => ({ postId, status: { dzen: 'new', vk: 'new', tg: 'new' }, urls: { dzen: '', vk: '', tg: '' }, noteRead: false });
export function recOf(records, postId) {
  const r = records.find((x) => x.postId === postId);
  if (!r) return emptyRec(postId);
  return { ...emptyRec(postId), ...r, status: { ...emptyRec().status, ...(r.status || {}) }, urls: { ...emptyRec().urls, ...(r.urls || {}) } };
}
export const publishedCount = (rec) => PLATFORMS.filter(([k]) => rec.status[k] === 'published').length;
export const isDone = (rec) => publishedCount(rec) === 3;

// «Проверен» нельзя поставить, пока не прочитана заметка для проверки.
export const canCheck = (post, rec) => !post.review || rec.noteRead;

export function filterPosts(posts, records, f = {}) {
  return posts.filter((p) => {
    if (f.rubric && p.rubric !== f.rubric) return false;
    if (f.type && p.type !== f.type) return false;
    if (f.status === 'open' && isDone(recOf(records, p.id))) return false;
    if (f.status === 'done' && !isDone(recOf(records, p.id))) return false;
    return true;
  });
}
export const sortPosts = (posts) => [...posts].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

// Запас: материалы на сегодня и позже, ещё не опубликованные везде. Дней хватит: сколько подряд дат с материалом, начиная с сегодня.
export function stock(posts, records, today) {
  const items = posts.filter((p) => p.date >= today && !isDone(recOf(records, p.id)));
  const dates = new Set(posts.filter((p) => p.date >= today).map((p) => p.date));
  let days = 0;
  const d = new Date(`${today}T00:00:00Z`);
  while (dates.has(d.toISOString().slice(0, 10))) { days += 1; d.setUTCDate(d.getUTCDate() + 1); }
  return { count: items.length, days };
}

// Призыв к боту: каждый третий материал. Считаем по дате: сколько материалов прошло после последнего с призывом.
export function botCounter(posts) {
  const sorted = [...posts].sort((a, b) => a.date.localeCompare(b.date));
  let since = 0;
  for (let i = sorted.length - 1; i >= 0; i -= 1) { if (sorted[i].botCall) break; since += 1; }
  return { since, next: Math.max(0, 3 - since) };
}

export const repeatedTopics = (posts, post) => posts.filter((p) => p.id !== post.id && ((post.topic && p.topic && p.topic.toLowerCase() === post.topic.toLowerCase()) || post.sources.some((s) => s.url && p.sources.some((x) => x.url === s.url))));

// «Сегодня»: какой материал сейчас нужно опубликовать. Берём пост на сегодня, иначе самый свежий из прошедших, который опубликован не везде.
export function pendingPosts(posts, records, today) {
  return posts.filter((p) => p.date <= today && !isDone(recOf(records, p.id))).sort((a, b) => b.date.localeCompare(a.date));
}
export function pendingPost(posts, records, today) {
  const list = pendingPosts(posts, records, today);
  return list.find((p) => p.date === today) || list[0] || null;
}
// По средам и субботам нужна статья (правило задачи).
export function dayNeed(today) {
  const d = new Date(`${today}T12:00:00Z`).getUTCDay();
  return d === 3 || d === 6 ? 'article' : 'post';
}
export const SETTINGS_ID = '__settings';
export const defaultSettings = () => ({ siteReady: false, dzenTags: 'unknown', checks: {} });
export function settingsOf(records) {
  const r = records.find((x) => x.postId === SETTINGS_ID);
  return { ...defaultSettings(), ...(r ? { siteReady: !!r.siteReady, dzenTags: r.dzenTags || 'unknown', checks: r.checks || {} } : {}) };
}
export const NOT_CHECKED = [
  ['monetization', 'Условия монетизации Дзена (в плане взяты из стороннего обзора)'],
  ['limits', 'Лимиты описаний каналов на площадках'],
  ['prices', 'Цены на рекламу в VK Рекламе и Telegram Ads'],
  ['marking', 'Маркировка рекламы (erid) и штрафы'],
];
