// Вкладка «Рупор» в «Проектах»: список постов, карточка поста с вкладками площадок, статусы, копирование.
import { el } from './ui.js';
import { todayYmd } from './dates.js';
import { dateText } from './subs-parts.js';
import { copyText } from './questions-view.js';
import { getProjectsState, loadProjects } from './projects-data.js';
import { openSheet } from './subs-form.js';
import { parseDocPosts } from './rupor-import.js';
import { SETTINGS_ID, settingsOf, NOT_CHECKED, PLATFORMS, STATUSES, RUBRICS, botLink, outgoing, counters, tagsPlain, tagWarnings, recOf, publishedCount, canCheck, filterPosts, sortPosts, stock, botCounter, repeatedTopics } from './rupor-calc.js';

const sel = (label, value, options, onChange) => {
  const s = el('select', { class: 'field', 'aria-label': label }, options.map(([v, t]) => el('option', { value: v, text: t })));
  s.value = value;
  s.addEventListener('change', () => onChange(s.value));
  return s;
};
const TYPE_LABEL = { post: 'Пост', article: 'Статья' };

// Все посты: из файлов hub-projects/rupor/ и вставленные из документа (файл с той же датой и заголовком главнее).
export function ruporPosts(store) {
  const files = getProjectsState().posts || [];
  const have = new Set(files.map((p) => p.id));
  const keys = new Set(files.map((p) => `${p.date}|${p.title.toLowerCase()}`));
  const imported = store.list('rposts')
    .filter((r) => !have.has(r.pid) && !keys.has(`${r.date}|${String(r.title).toLowerCase()}`))
    .map(({ id, pid, updatedAt, created, deleted, ...rest }) => ({ ...rest, id: pid, imported: true, storeId: id }));
  return sortPosts([...files, ...imported]);
}

const CHANNELS = [['Дзен', 'https://dzen.ru/impulse_group_news'], ['ВКонтакте', 'https://vk.ru/impulse_group_news'], ['Telegram', 'https://t.me/impulse_group_news']];
const DESCRIPTION = 'Импульс Групп — всё о спецтехнике в России: новости, новинки, рынок и разборы для владельцев, водителей и арендаторов. Ищешь заказы на технику? Загляни в нашего бота-диспетчера: выбираешь тип техники и получаешь только нужные заявки.';
const ASSETS = [['Аватар Telegram 500×500', 'assets/rupor/avatar_500x500_telegram.png'], ['Аватар ВК 400×400', 'assets/rupor/avatar_400x400_vk.png'], ['Обложка ВК 1920×768', 'assets/rupor/cover_1920x768_vk.png'], ['Исходный логотип 1024×1024', 'assets/rupor/logo_original_1024.jpg']];

export function ruporBoard({ store, ui, setUi }) {
  const wrap = el('div', { class: 'stack' });
  const posts = ruporPosts(store);
  const records = store.list('rupor');
  const settings = settingsOf(records);
  const sub = ['posts', 'channel', 'settings'].includes(ui.rSub) ? ui.rSub : 'posts';

  function saveSettings(patch) {
    const stored = records.find((r) => r.postId === SETTINGS_ID);
    const next = { siteReady: settings.siteReady, dzenTags: settings.dzenTags, checks: settings.checks, ...patch };
    if (stored) store.update('rupor', stored.id, next);
    else store.add('rupor', { postId: SETTINGS_ID, status: {}, ...next });
  }

  function importSheet() {
    openSheet((close) => {
      const area = el('textarea', { class: 'field field--area', 'aria-label': 'Текст из документа', rows: '12', placeholder: 'Вставь сюда текст документа: разделы «Пост на 12 октября: заголовок»' });
      const msg = el('p', { class: 'sched-note', role: 'status' });
      const go = el('button', { type: 'button', class: 'btn btn--primary', text: 'Добавить посты' });
      go.addEventListener('click', () => {
        const { posts: found, skipped } = parseDocPosts(area.value, { today: todayYmd() });
        if (!found.length) { msg.textContent = skipped ? `Разделов найдено ${skipped}, но дату понять не удалось. Заголовок должен быть вида «Пост на 12 октября: …».` : 'Не нашла ни одного раздела «Пост на <дата>: <заголовок>».'; return; }
        const existing = new Map(store.list('rposts').map((r) => [r.pid, r]));
        found.forEach((p) => {
          const { id, ...rest } = p;
          const fields = { ...rest, pid: id };
          const old = existing.get(id);
          if (old) store.update('rposts', old.id, fields);
          else store.add('rposts', fields);
        });
        close();
      });
      const x = el('button', { type: 'button', class: 'btn btn--ghost', text: 'Отмена' });
      x.addEventListener('click', close);
      return el('div', { class: 'sheet__form stack' }, [el('h2', { text: 'Вставить из документа' }), el('p', { class: 'muted', text: 'Разберу все разделы «Пост на <дата>: <заголовок>». Повторная вставка обновит те же посты, дубликатов не будет.' }), area, msg, el('div', { class: 'pillrow' }, [go, x])]);
    });
  }
  const today = todayYmd();

  function saveRec(post, patch) {
    const cur = recOf(records, post.id);
    const next = { ...cur, ...patch, status: { ...cur.status, ...(patch.status || {}) }, urls: { ...cur.urls, ...(patch.urls || {}) }, at: { ...cur.at } };
    // Время публикации нужно для «Итогов недели»: ставится, когда статус стал «Опубликован», и снимается, если вернули назад.
    Object.keys(patch.status || {}).forEach((k) => {
      if (next.status[k] === 'published' && cur.status[k] !== 'published') next.at[k] = Date.now();
      else if (next.status[k] !== 'published') delete next.at[k];
    });
    const stored = records.find((r) => r.postId === post.id);
    if (stored) store.update('rupor', stored.id, { status: next.status, urls: next.urls, at: next.at, noteRead: next.noteRead });
    else store.add('rupor', { postId: post.id, status: next.status, urls: next.urls, at: next.at, noteRead: next.noteRead });
  }

  function row(p) {
    const rec = recOf(records, p.id);
    const n = publishedCount(rec);
    const b = el('button', { type: 'button', class: 'rrow', 'data-type': p.type, 'aria-label': `${TYPE_LABEL[p.type]}: ${p.title}. Открыть` }, [
      el('span', { class: 'rrow__date', text: dateText(p.date, today) }),
      el('span', { class: 'rrow__main' }, [el('span', { class: 'rrow__title', text: p.title }), el('span', { class: 'muted', text: [p.rubric, p.botCall ? 'с призывом к боту' : ''].filter(Boolean).join(' · ') })]),
      el('span', { class: 'pillrow' }, [
        el('span', { class: 'pill', text: TYPE_LABEL[p.type] }),
        p.date >= today && n < 3 ? el('span', { class: 'pill pill--src', text: 'запас' }) : '',
        el('span', { class: 'pill', text: `${n} из 3` }),
      ]),
    ]);
    b.addEventListener('click', () => setUi({ rPost: p.id }));
    return b;
  }

  function list() {
    const s = stock(posts, records, today);
    const bc = botCounter(posts);
    const rubrics = [...new Set([...RUBRICS, ...posts.map((p) => p.rubric).filter(Boolean)])];
    const imp = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Вставить из документа' });
    imp.addEventListener('click', importSheet);
    const busy = getProjectsState().busy;
    const refresh = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: busy ? 'Обновляю…' : 'Обновить', ...(busy ? { disabled: '' } : {}) });
    refresh.addEventListener('click', () => loadProjects());
    wrap.append(
      el('div', { class: 'listhead' }, [el('h2', { text: 'Посты' }), el('span', { class: 'listhead__count', text: String(posts.length) }), refresh, imp]),
      el('p', { class: 'sched-note', role: 'status', text: posts.length ? `В запасе: ${s.count}, хватит на ${s.days} дн. Следующий призыв к боту через ${bc.next} материал(а).` : '' }),
    );
    if (!posts.length) {
      wrap.append(el('div', { class: 'empty' }, [el('strong', { text: 'Постов пока нет' }), el('span', { text: 'Посты берутся из папки rupor/ в репозитории hub-projects (кнопка «Обновить» на вкладке «Карточки») или вставляются из документа кнопкой выше.' })]));
      return;
    }
    wrap.append(el('div', { class: 'pfilters' }, [
      sel('Рубрика', ui.rRubric || '', [['', 'Все рубрики'], ...rubrics.map((r) => [r, r])], (v) => setUi({ rRubric: v || null })),
      sel('Тип материала', ui.rType || '', [['', 'Пост и статья'], ['post', 'Посты'], ['article', 'Статьи']], (v) => setUi({ rType: v || null })),
      sel('Статус публикации', ui.rStatus || '', [['', 'Все'], ['open', 'Не везде опубликованы'], ['done', 'Опубликованы везде']], (v) => setUi({ rStatus: v || null })),
    ]));
    const shown = filterPosts(posts, records, { rubric: ui.rRubric, type: ui.rType, status: ui.rStatus });
    if (!shown.length) wrap.append(el('div', { class: 'empty' }, [el('strong', { text: 'Ничего не найдено' }), el('span', { text: 'Измени фильтры.' })]));
    else wrap.append(el('div', { class: 'rlist' }, shown.map(row)));
  }

  function copyBtn(label, text, note) {
    const b = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: label });
    b.addEventListener('click', async () => {
      const ok = await copyText(text);
      note.textContent = ok ? `Скопировано: ${label.replace(/^Копировать /, '').toLowerCase()}` : 'Не удалось скопировать';
    });
    return b;
  }

  function detail(post) {
    const rec = recOf(records, post.id);
    const platform = PLATFORMS.some(([k]) => k === ui.rTab) ? ui.rTab : 'dzen';
    const back = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'К списку' });
    back.addEventListener('click', () => setUi({ rPost: null }));
    wrap.append(back);
    wrap.append(el('div', { class: 'view__head' }, [
      el('h2', { text: post.title }),
      el('p', { class: 'muted', text: [dateText(post.date, today), TYPE_LABEL[post.type], post.rubric, `опубликовано ${publishedCount(rec)} из 3`].filter(Boolean).join(' · ') }),
    ]));
    if (post.review) {
      const read = el('button', { type: 'button', class: 'btn btn--s btn--primary', text: 'Прочитано' });
      read.addEventListener('click', () => saveRec(post, { noteRead: true }));
      wrap.append(el('section', { class: 'card stack stack--tight rnote', role: 'note' }, [el('strong', { text: 'Заметка для проверки' }), el('p', { text: post.review }), rec.noteRead ? el('span', { class: 'sched-note', text: 'Прочитано' }) : read]));
    }
    const facts = [];
    if (post.photo) facts.push(el('p', { class: 'muted', text: `Фото: ${post.photo}` }));
    if (post.topic) facts.push(el('p', { class: 'muted', text: `Тема: ${post.topic}` }));
    if (post.botCall) facts.push(el('p', { class: 'muted', text: 'В материале есть призыв к боту.' }));
    const rep = repeatedTopics(posts, post);
    if (rep.length) facts.push(el('p', { class: 'sched-note sched-note--warn', text: `Тема или источник уже были: ${rep.map((r) => r.title).join('; ')}` }));
    tagWarnings(post).forEach((w) => facts.push(el('p', { class: 'sched-note sched-note--warn', text: w })));
    if (post.sources.length) facts.push(el('ul', { class: 'hist' }, post.sources.map((s) => el('li', {}, [s.url ? el('a', { href: s.url, target: '_blank', rel: 'noopener', text: s.title }) : s.title, s.date ? ` · ${s.date}` : '']))));
    if (facts.length) wrap.append(el('section', { class: 'card stack stack--tight' }, facts));

    wrap.append(el('div', { class: 'seg', role: 'group', 'aria-label': 'Площадка' }, PLATFORMS.map(([k, t]) => {
      const b = el('button', { type: 'button', 'aria-pressed': String(platform === k), text: `${t}${rec.status[k] === 'published' ? ' ✓' : ''}` });
      b.addEventListener('click', () => setUi({ rTab: k }));
      return b;
    })));

    const t = post.texts[platform];
    const text = outgoing(post, platform);
    const note = el('p', { class: 'sched-note', role: 'status', text: '' });
    const cnt = el('ul', { class: 'rcount' }, counters(post, platform).map((c) => el('li', { class: c.over ? 'rcount--over' : '', text: `${c.label}: ${c.n} из ${c.max}` })));
    const body = el('pre', { class: 'rtext', 'aria-label': `Текст для площадки ${platform}`, text: (t.title && platform === 'dzen' ? `${t.title}\n\n` : '') + (text || 'Текста для этой площадки нет.') });
    const btns = [];
    if (t.title) btns.push(copyBtn('Копировать заголовок', t.title, note));
    btns.push(copyBtn('Копировать текст', text, note), copyBtn('Копировать всё', (t.title && platform === 'dzen' ? `${t.title}\n\n` : '') + text, note));
    if (post.hashtags.length) btns.push(copyBtn('Копировать теги', post.hashtags.join(' '), note));
    if (platform === 'dzen' && post.hashtags.length && settings.dzenTags !== 'text') btns.push(copyBtn('Копировать теги без #', tagsPlain(post), note));
    btns.push(copyBtn('Копировать ссылку на бота', botLink(platform), note));
    if (post.imported) {
      const del = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Удалить пост из хаба' });
      del.addEventListener('click', () => { store.remove('rposts', post.storeId); setUi({ rPost: null }); });
      btns.push(del);
    }
    const gate = canCheck(post, rec);
    const status = el('select', { class: 'field', 'aria-label': 'Статус публикации площадки' }, STATUSES.map(([v, tt]) => el('option', { value: v, text: tt, ...(v !== 'new' && !gate ? { disabled: '' } : {}) })));
    status.value = rec.status[platform];
    status.addEventListener('change', () => saveRec(post, { status: { [platform]: status.value } }));
    const url = el('input', { class: 'field', type: 'url', 'aria-label': 'Ссылка на опубликованный пост', placeholder: 'Ссылка на опубликованный пост', value: rec.urls[platform] || '' });
    url.addEventListener('change', () => saveRec(post, { urls: { [platform]: url.value.trim() } }));
    wrap.append(
      el('section', { class: 'card stack' }, [cnt, body, el('div', { class: 'pillrow' }, btns), note, status, !gate ? el('p', { class: 'sched-note', text: 'Сначала прочитай заметку для проверки.' }) : '', url]),
    );
  }

  function channel() {
    wrap.append(el('div', { class: 'listhead' }, [el('h2', { text: 'Канал «Импульс Групп»' })]));
    const note = el('p', { class: 'sched-note', role: 'status', text: '' });
    wrap.append(el('section', { class: 'card stack stack--tight' }, [
      el('h3', { text: 'Площадки' }),
      el('ul', { class: 'hist' }, CHANNELS.map(([t, u]) => el('li', {}, [el('a', { href: u, target: '_blank', rel: 'noopener', text: t }), ` · ${u.replace('https://', '')}`]))),
      el('h3', { text: 'Описание (общее для трёх площадок)' }), el('p', { text: DESCRIPTION }), copyBtn('Копировать описание', DESCRIPTION, note),
      el('h3', { text: 'Аудитория и тон' }), el('p', { class: 'muted', text: 'Владельцы и водители спецтехники, небольшие подрядчики, арендаторы, любители «железа». Тон простой и уверенный, без воды и кликбейта.' }),
      el('h3', { text: 'Как подаём бота' }), el('p', { class: 'muted', text: 'Бот-диспетчер: человек выбирает тип техники и получает только отфильтрованные заявки. Без обещаний лёгких денег. Призыв в каждом третьем материале.' }),
      note,
    ]));
    wrap.append(el('section', { class: 'card stack stack--tight' }, [el('h3', { text: 'Картинки' }), el('ul', { class: 'hist' }, ASSETS.map(([t, f]) => el('li', {}, [el('a', { href: f, download: f.split('/').pop(), text: `Скачать: ${t}` })])))]));
    const items = NOT_CHECKED.map(([k, t]) => {
      const on = !!settings.checks[k];
      const b = el('button', { type: 'button', class: 'task__check', role: 'checkbox', 'aria-checked': String(on), 'aria-label': `Проверено: ${t}` });
      b.addEventListener('click', () => saveSettings({ checks: { ...settings.checks, [k]: !on } }));
      return el('li', { class: 'task' }, [b, el('span', { class: 'task__text' }, [el('span', { class: on ? 'task__title qdone' : 'task__title', text: t })]), el('span')]);
    });
    wrap.append(el('section', { class: 'card stack stack--tight' }, [el('h3', { text: 'Не проверено' }), el('p', { class: 'muted', text: 'Отметь пункт, когда сам проверишь по официальной справке площадки.' }), el('ul', { class: 'tasks' }, items)]));
    wrap.append(el('p', { class: 'sched-note', text: 'Автоперенос из Telegram в Дзен: не настроено (по твоей просьбе кросспостинг выключен).' }));
  }

  function settingsPage() {
    wrap.append(el('div', { class: 'listhead' }, [el('h2', { text: 'Настройки «Рупора»' })]));
    const site = el('button', { type: 'button', class: 'btn btn--s', role: 'switch', 'aria-checked': String(settings.siteReady), text: settings.siteReady ? 'Сайт готов: включено' : 'Сайт готов: выключено' });
    site.addEventListener('click', () => saveSettings({ siteReady: !settings.siteReady }));
    const dz = sel('Поле тегов в редакторе Дзена', settings.dzenTags, [['unknown', 'Ещё не проверено'], ['field', 'Есть поле тегов'], ['text', 'Поля нет, теги в конце текста']], (v) => saveSettings({ dzenTags: v }));
    wrap.append(el('section', { class: 'card stack' }, [
      el('h3', { text: 'Сайт' }), el('p', { class: 'muted', text: 'Пока сайт компании в разработке, в постах каналов его не упоминаем, только бота. Включи, когда сайт будет готов: тогда решим, куда добавить ссылку и метку.' }), site,
      el('h3', { text: 'Теги в Дзене' }), el('p', { class: 'muted', text: 'При первой публикации посмотри, есть ли в редакторе Дзена поле тегов. От ответа зависит, какая кнопка копирования тегов показывается на вкладке Дзена.' }), dz,
    ]));
  }

  const subnav = el('div', { class: 'seg seg--s', role: 'group', 'aria-label': 'Раздел Рупора' }, [['posts', 'Посты'], ['channel', 'Канал'], ['settings', 'Настройки']].map(([k, t]) => {
    const b = el('button', { type: 'button', 'aria-pressed': String(sub === k), text: t });
    b.addEventListener('click', () => setUi({ rSub: k, rPost: null }));
    return b;
  }));
  const post = ui.rPost ? posts.find((p) => p.id === ui.rPost) : null;
  if (sub === 'channel') channel();
  else if (sub === 'settings') settingsPage();
  else if (post) detail(post);
  else list();
  if (!post || sub !== 'posts') wrap.prepend(subnav);
  return wrap;
}
