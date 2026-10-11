// Заметки и ссылки: разбор тегов, адреса, фильтры.
export const parseNoteTags = (s) => [...new Set(String(s || '').split(/[,;\n]+/).map((t) => t.trim().replace(/^#+/, '').toLowerCase()).filter(Boolean))].slice(0, 12);

export function normalizeUrl(raw) {
  const t = String(raw || '').trim();
  if (!t || /\s/.test(t)) return '';
  const u = /^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const p = new URL(u);
    if (!/^https?:$/.test(p.protocol) || !p.hostname.includes('.')) return '';
    return p.href;
  } catch (_) {
    return '';
  }
}
export const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (_) { return ''; } };

export function noteTitle(n) {
  if (n.title && n.title.trim()) return n.title.trim();
  if (n.kind === 'link') return hostOf(n.url) || n.url || 'Ссылка';
  return String(n.text || '').split('\n')[0].slice(0, 80) || 'Заметка';
}

export function allTags(notes) {
  const c = new Map();
  notes.forEach((n) => (n.tags || []).forEach((t) => c.set(t, (c.get(t) || 0) + 1)));
  return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru')).map(([t]) => t);
}

export function filterNotes(notes, { kind = 'all', tag = null } = {}) {
  return notes.filter((n) => (kind === 'all' || n.kind === kind) && (!tag || (n.tags || []).includes(tag)));
}
