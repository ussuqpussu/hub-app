// Вкладка «Расписание»: неделя колледжа. Пары подтянутся на этапе 4, пока честная заглушка.
// Показываем только то, что известно точно: диапазон недели и её тип (верхняя или нижняя).
import { el } from './ui.js';
import { todayYmd, addDays, fromYmd, weekStart, weekType } from './dates.js';

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

function rangeTitle(start) {
  const a = fromYmd(start);
  const b = fromYmd(addDays(start, 6));
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MONTHS_GEN[b.getMonth()]}`
    : `${a.getDate()} ${MONTHS_GEN[a.getMonth()]} – ${b.getDate()} ${MONTHS_GEN[b.getMonth()]}`;
}

export function scheduleView() {
  const root = el('section', { class: 'view' }, [
    el('div', { class: 'view__head' }, [
      el('h1', { text: 'Расписание' }),
      el('p', { class: 'muted', text: 'Пары колледжа по неделям.' }),
    ]),
  ]);
  let cursor = todayYmd();
  const bar = el('div', { class: 'week-nav' });
  const body = el('div', { class: 'stack' });

  function render() {
    const start = weekStart(cursor);
    const prev = el('button', { type: 'button', class: 'btn btn--ghost btn--s', 'aria-label': 'Предыдущая неделя', text: '‹' });
    const next = el('button', { type: 'button', class: 'btn btn--ghost btn--s', 'aria-label': 'Следующая неделя', text: '›' });
    const now = el('button', { type: 'button', class: 'btn btn--ghost btn--s', text: 'Эта неделя' });
    prev.addEventListener('click', () => {
      cursor = addDays(start, -7);
      render();
    });
    next.addEventListener('click', () => {
      cursor = addDays(start, 7);
      render();
    });
    now.addEventListener('click', () => {
      cursor = todayYmd();
      render();
    });
    bar.replaceChildren(prev, el('h2', { class: 'week-nav__title', text: `${rangeTitle(start)} · ${weekType(start)} неделя` }), next, now);
    body.replaceChildren(
      el('div', { class: 'empty' }, [
        el('strong', { text: 'Расписание колледжа не подключено' }),
        el('span', { text: 'Пары подтянутся из таблицы автоматически на этапе 4. Тип недели выше посчитан по правилу: 12 октября 2026 это верхняя неделя, дальше чередование.' }),
      ]),
    );
  }

  render();
  root.append(bar, body);
  return root;
}
