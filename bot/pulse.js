// «Пульс проектов»: проверка сайтов и решение, когда писать в Telegram. Чистая логика, сеть передаётся снаружи.

export async function checkTarget(t, fetchImpl = fetch, timeoutMs = 8000) {
  const started = Date.now();
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
  try {
    const r = await fetchImpl(t.url, { method: 'GET', redirect: 'follow', signal: ctl ? ctl.signal : undefined, headers: { 'user-agent': 'hub-pulse/1' } });
    // Сайт жив, если отвечает не ошибкой сервера и не «страница не найдена».
    return { name: t.name, url: t.url, ok: r.status < 500 && r.status !== 404, code: r.status, ms: Date.now() - started };
  } catch (_) {
    return { name: t.name, url: t.url, ok: false, code: 0, ms: Date.now() - started };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const FAILS_TO_ALERT = 2; // два подряд неудачных замера, чтобы не тревожить из-за одного сбоя

// prev: прошлый status.json; checks: результаты checkTarget; hubErrors: [{id,text}] из pulse/hub.json.
export function evaluatePulse(prev, checks, hubErrors, now = Date.now()) {
  const old = new Map(((prev && prev.targets) || []).map((t) => [t.url, t]));
  const messages = [];
  const targets = checks.map((c) => {
    const p = old.get(c.url) || {};
    const fails = c.ok ? 0 : (p.fails || 0) + 1;
    let alerted = !!p.alerted;
    if (!c.ok && fails >= FAILS_TO_ALERT && !alerted) {
      alerted = true;
      messages.push(`Проект «${c.name}» не отвечает: ${c.url}${c.code ? ` (код ${c.code})` : ''}.`);
    } else if (c.ok && alerted) {
      alerted = false;
      messages.push(`Проект «${c.name}» снова отвечает.`);
    }
    const since = p.ok === c.ok && p.since ? p.since : new Date(now).toISOString();
    return { name: c.name, url: c.url, ok: c.ok, code: c.code, ms: c.ms, fails, alerted, since };
  });

  const prevHub = (prev && prev.hub) || {};
  const hub = {};
  (hubErrors || []).forEach((e) => {
    if (prevHub[e.id]) hub[e.id] = prevHub[e.id];
    else {
      hub[e.id] = { text: e.text, at: new Date(now).toISOString() };
      messages.push(`Ошибка в хабе: ${e.text}`);
    }
  });
  Object.keys(prevHub).forEach((id) => {
    if (!hub[id]) messages.push(`Проблема в хабе исчезла: ${prevHub[id].text}`);
  });

  return { status: { v: 1, checkedAt: new Date(now).toISOString(), targets, hub }, messages };
}
