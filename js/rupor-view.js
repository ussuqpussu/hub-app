// Вкладка «Рупор» в «Проектах»: список постов, карточка поста с вкладками площадок, статусы, копирование.
import { el } from './ui.js';
import { todayYmd } from './dates.js';
import { dateText } from './subs-parts.js';
import { copyText } from './questions-view.js';
import { getProjectsState } from './projects-data.js';
import { PLATFORMS, STATUSES, RUBRICS, botLink, outgoing, counters, tagsPlain, tagWarnings, recOf, publishedCount, canCheck, filterPosts, sortPosts, stock, botCounter, repeatedTopics } from './rupor-calc.js';

const sel = (label, value, options, onChange) => {
  const s = el('select', { class: 'field', 'aria-label': label }, options.map(([v, t]) => el('option', { value: v, text: t })));
  s.value = value;
  s.addEventListener('change', () => onChange(s.value));
  return s;
};
const TYPE_LABEL = { post: 'Пост', article: 'Статья' };

export function ruporBoard({ store, ui, setUi }) {
  const wrap = el('div', { class: 'stack' });
  const posts = sortPosts(getProjectsState().posts || []);
  const records = store.list('rupor');
  const today = todayYmd();

  function saveRec(post, patch) {
    const cur = recOf(records, post.id);
    const next = { ...cur, ...patch, status: { ...cur.status, ...(patch.status || {}) }, urls: { ...cur.urls, ...(patch.urls || {}) } };
    const stored = records.find((r) => r.postId === post.id);
    if (stored) store.update('rupor', stored.id, { status: next.status, urls: next.urls, noteRead: next.noteRead });
    else store.add('rupor', { postId: post.id, status: next.status, urls: next.urls, noteRead: next.noteRead });
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
    wrap.append(
      el('div', { class: 'listhead' }, [el('h2', { text: 'Рупор' }), el('span', { class: 'listhead__count', text: String(posts.length) })]),
      el('p', { class: 'sched-note', role: 'status', text: posts.length ? `В запасе: ${s.count}, хватит на ${s.days} дн. Следующий призыв к боту через ${bc.next} материал(а).` : '' }),
    );
    if (!posts.length) {
      wrap.append(el('div', { class: 'empty' }, [el('strong', { text: 'Постов пока нет' }), el('span', { text: 'Посты берутся из папки rupor/ в репозитории hub-projects. Нажми «Обновить» на вкладке «Карточки» после того, как файлы появятся.' })]));
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
    if (platform === 'dzen' && post.hashtags.length) btns.push(copyBtn('Копировать теги без #', tagsPlain(post), note));
    btns.push(copyBtn('Копировать ссылку на бота', botLink(platform), note));
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

  const post = ui.rPost ? posts.find((p) => p.id === ui.rPost) : null;
  if (post) detail(post);
  else list();
  return wrap;
}
