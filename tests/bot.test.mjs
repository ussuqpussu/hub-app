import assert from 'node:assert/strict';
import { classify, describe, toInbox, validInbox, reclassify } from '../bot/classify.js';
import { evaluatePulse } from '../bot/pulse.js';
import worker, { handleTelegram, handleShare, runPulse } from '../bot/worker.js';

let n = 0;
const t = (name, fn) => { fn(); n += 1; };
const now = new Date(2026, 9, 12, 10, 0); // понедельник 12.10.2026
const projects = ['Impulse Group', 'Хаб'];

t('команды', () => {
  assert.equal(classify('/з купить хлеб завтра', { projects, now }).kind, 'task');
  assert.equal(classify('/t купить хлеб завтра', { projects, now }).due, '2026-10-13');
  assert.equal(classify('/н мысль про сайт', { projects, now }).kind, 'note');
  assert.equal(classify('/n@mybot мысль', { projects, now }).text, 'мысль');
  assert.equal(classify('/в а почему так?', { projects, now }).kind, 'question');
});
t('проект + действие', () => {
  const c = classify('Impulse Group добавить трактор', { projects, now });
  assert.deepEqual([c.kind, c.title, c.project, c.by], ['task', 'добавить трактор', 'Impulse Group', 'project+action']);
});
t('только действие, только ссылка, остальное в заметки', () => {
  assert.equal(classify('позвонить маме в пятницу в 15:00', { projects, now }).kind, 'task');
  assert.equal(classify('позвонить маме в пятницу в 15:00', { projects, now }).time, '15:00');
  const l = classify('гляну потом https://example.com/a?b=1.', { projects, now });
  assert.deepEqual([l.kind, l.url], ['link', 'https://example.com/a?b=1']);
  assert.equal(classify('красивый закат сегодня', { projects, now }).kind, 'note');
  assert.equal(classify('', { projects, now }).kind, 'note');
});
t('проект без действия — заметка с проектом', () => {
  const c = classify('Impulse Group красивый цвет у кнопки', { projects, now });
  assert.deepEqual([c.kind, c.project], ['note', 'Impulse Group']);
});
t('формат inbox и кнопки', () => {
  const c = classify('купить хлеб', { projects, now });
  const o = toInbox({ id: '20261012100000-abcde', source: 'bot', at: '2026-10-12T07:00:00.000Z', c });
  assert.ok(validInbox(o));
  assert.ok(!validInbox({ ...o, id: '../x' }));
  assert.equal(reclassify(o, 'n').kind, 'note');
  assert.equal(reclassify(o, 'n').text, 'купить хлеб');
  assert.equal(reclassify(reclassify(o, 'n'), 't').title, 'купить хлеб');
  assert.equal(reclassify(o, 'x').cancelled, true);
  assert.match(describe(c), /задачу/);
});
t('пульс: два сбоя подряд, один раз, восстановление', () => {
  const ok = (v) => [{ name: 'A', url: 'https://a.ru', ok: v, code: v ? 200 : 503, ms: 5 }];
  let r = evaluatePulse({}, ok(false), []);
  assert.equal(r.messages.length, 0);
  r = evaluatePulse(r.status, ok(false), []);
  assert.equal(r.messages.length, 1);
  r = evaluatePulse(r.status, ok(false), []);
  assert.equal(r.messages.length, 0);
  r = evaluatePulse(r.status, ok(true), []);
  assert.match(r.messages[0], /снова отвечает/);
  r = evaluatePulse(r.status, ok(true), []);
  assert.equal(r.messages.length, 0);
});
t('пульс: ошибки хаба один раз и исчезновение', () => {
  let r = evaluatePulse({}, [], [{ id: 'e1', text: 'не обновилось расписание' }]);
  assert.equal(r.messages.length, 1);
  r = evaluatePulse(r.status, [], [{ id: 'e1', text: 'не обновилось расписание' }]);
  assert.equal(r.messages.length, 0);
  r = evaluatePulse(r.status, [], []);
  assert.match(r.messages[0], /исчезла/);
});

// Мини-имитация GitHub и Telegram
function fake() {
  const files = new Map(); const sent = []; let sha = 0;
  const fetchImpl = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith('https://api.telegram.org/')) { sent.push({ method: u.split('/').pop(), body: JSON.parse(init.body) }); return new Response('{"ok":true}'); }
    if (u.includes('/contents/')) {
      const path = decodeURIComponent(u.split('/contents/')[1]);
      if ((init.method || 'GET') === 'GET') {
        const f = files.get(path);
        if (!f) return new Response('{}', { status: 404 });
        return new Response(JSON.stringify({ sha: f.sha, content: Buffer.from(f.text).toString('base64') }));
      }
      const b = JSON.parse(init.body);
      const cur = files.get(path);
      if (cur && b.sha !== cur.sha) return new Response('{}', { status: 409 });
      files.set(path, { sha: `s${++sha}`, text: Buffer.from(b.content, 'base64').toString('utf8') });
      return new Response('{"content":{}}');
    }
    return new Response('hi', { status: 200 });
  };
  return { files, sent, fetchImpl };
}
const env = { BOT_TOKEN: 'T', OWNER_ID: '42', GH_TOKEN: 'G', DATA_REPO: 'me/hub-data', SHARE_KEY: 'k'.repeat(24), WEBHOOK_SECRET: 'w', TZ_OFFSET_MIN: '180' };
const msg = (text, from = 42) => ({ message: { message_id: 7, text, from: { id: from }, chat: { id: from } } });

const run = async () => {
  let f = fake();
  f.files.set('bot-config.json', { sha: 'c', text: JSON.stringify({ projects: [{ name: 'Impulse Group', url: 'https://ig.example' }] }) });
  await handleTelegram(msg('Impulse Group добавить трактор'), env, f.fetchImpl);
  const inbox = [...f.files.keys()].filter((k) => k.startsWith('inbox/'));
  assert.equal(inbox.length, 1);
  const o = JSON.parse(f.files.get(inbox[0]).text);
  assert.deepEqual([o.kind, o.title, o.project], ['task', 'добавить трактор', 'Impulse Group']);
  assert.equal(f.sent[0].body.reply_markup.inline_keyboard[0].length, 3);
  // кнопка «В заметки»
  const id = o.id;
  await handleTelegram({ callback_query: { id: 'q', from: { id: 42 }, data: `n:${id}`, message: { chat: { id: 42 }, message_id: 9 } } }, env, f.fetchImpl);
  assert.equal(JSON.parse(f.files.get(inbox[0]).text).kind, 'note');
  // чужой не пишет
  const before = f.files.size;
  await handleTelegram(msg('привет', 99), env, f.fetchImpl);
  assert.equal(f.files.size, before);
  // хаб уже забрал запись
  f.files.delete(inbox[0]);
  await handleTelegram({ callback_query: { id: 'q2', from: { id: 42 }, data: `x:${id}`, message: { chat: { id: 42 }, message_id: 9 } } }, env, f.fetchImpl);
  assert.match(f.sent.at(-1).body.text, /уже забрал/);
  // ярлык
  const bad = await handleShare({ key: 'nope', text: 'x' }, env, f.fetchImpl);
  assert.equal(bad.status, 401);
  const good = await handleShare({ key: env.SHARE_KEY, text: 'https://example.com/x' }, env, f.fetchImpl);
  assert.deepEqual([good.status, good.out.kind], [200, 'link']);
  // пульс
  const r = await runPulse(env, async (u, i) => (String(u).startsWith('https://ig.example') ? new Response('', { status: 503 }) : f.fetchImpl(u, i)), Date.now());
  assert.equal(r.checked, 1);
  assert.ok(f.files.has('pulse/status.json'));
  // HTTP-вход
  const res = await worker.fetch(new Request('https://w/tg', { method: 'POST', body: '{}' }), env, { waitUntil() {} });
  assert.equal(res.status, 403);
  const res2 = await worker.fetch(new Request('https://w/share', { method: 'POST', body: JSON.stringify({ key: 'bad', text: 'a' }) }), env, { waitUntil() {} });
  assert.equal(res2.status, 401);
  n += 3;
};
await run();
console.log(`${n} passed`);
