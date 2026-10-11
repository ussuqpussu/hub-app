// Общие помощники интерфейса: создание узлов, значки, формат времени.

// Свои простые значки (линия, без заимствованных наборов).
const ico = (d) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

export const ICONS = {
  today: ico('<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>'),
  calendar: ico('<rect x="4" y="5" width="16" height="15"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
  tasks: ico('<path d="M5 6h3M5 12h3M5 18h3M11 6h8M11 12h8M11 18h8"/>'),
  projects: ico('<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><path d="M16.5 13v7M13 16.5h7"/>'),
  more: ico('<circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/>'),
  home: ico('<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>'),
  subs: ico('<path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4"/>'),
  notes: ico('<path d="M6 4h9l3 3v13H6z"/><path d="M9 11h6M9 15h6"/>'),
  knowledge: ico('<path d="M5 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H5zM19 5h-6"/><path d="M19 5v12h-6"/>'),
  gear: ico('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'),
  plus: ico('<path d="M12 5v14M5 12h14"/>'),
  star: ico('<path d="M12 4l2.4 5 5.6.7-4.1 3.8 1.1 5.5L12 16.3 7 19l1.1-5.5L4 9.7 9.6 9z"/>'),
  edit: ico('<path d="M5 19l1-4 9-9 3 3-9 9z"/><path d="M13.5 7.5l3 3"/>'),
  close: ico('<path d="M6 6l12 12M18 6L6 18"/>'),
};

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v; // только статичные строки из этого файла
    else node.setAttribute(k, v);
  });
  [].concat(children).forEach((c) => node.append(c));
  return node;
}

export function fmtTime(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

