// Блок «Бот и входящие» в настройках: последний разбор inbox/, свои слова-действия, ручной запуск.
import { el, fmtTime } from './ui.js';
import { getLast, getActions, setActions, importInbox, refreshPulse, refreshWeather, sendBotConfig } from './bot-sync.js';
import { parseActions } from './bot-calc.js';
import { getProjectsState } from './projects-data.js';
import { mergedProjects } from './projects-view.js';

function lastText() {
  const l = getLast();
  if (!l) return 'Входящие ещё не разбирались.';
  const when = fmtTime(l.at);
  if (l.error === 'notoken') return 'Токен GitHub не подключён: входящие недоступны.';
  if (l.error) return `Последняя попытка ${when} не удалась (${l.error}). Повторится при следующем открытии.`;
  const bits = [`принято ${l.imported}`];
  if (l.cancelled) bits.push(`отменено ${l.cancelled}`);
  if (l.bad) bits.push(`не разобрано ${l.bad} (файлы остались в inbox/)`);
  return `Разбор в ${when}: ${bits.join(', ')}.`;
}

export function botSettings({ store }) {
  const status = el('p', { class: 'muted', role: 'status', text: lastText() });
  const area = el('textarea', { class: 'field', rows: '3', 'aria-label': 'Свои слова-действия', placeholder: 'Например: заверстать, согласовать, выгрузить' });
  area.value = getActions().join(', ');
  const run = el('button', { type: 'button', class: 'btn', text: 'Разобрать входящие сейчас' });
  run.addEventListener('click', async () => {
    run.disabled = true;
    status.textContent = 'Разбираю…';
    await importInbox({ store, force: true });
    await refreshPulse();
    await refreshWeather();
    status.textContent = lastText();
    run.disabled = false;
  });
  const save = el('button', { type: 'button', class: 'btn', text: 'Сохранить слова' });
  save.addEventListener('click', async () => {
    setActions(parseActions(area.value));
    const ps = getProjectsState();
    const sent = await sendBotConfig(mergedProjects(store));
    status.textContent = sent ? 'Слова сохранены и отправлены боту.' : ps.cards.length ? 'Слова сохранены. Бот получит их, когда подключится токен.' : 'Слова сохранены. Бот получит их после загрузки проектов.';
  });
  return el('div', { class: 'settings-group' }, [
    el('h2', { text: 'Бот и входящие' }),
    el('p', { class: 'muted', text: 'Сообщения Telegram-боту и ярлыка iPhone приходят в папку inbox/ и разбираются при открытии хаба: задачи в «Задачи», заметки и ссылки в «Заметки и ссылки».' }),
    status,
    el('div', { class: 'row' }, [run]),
    el('label', { class: 'field-label', text: 'Слова-действия для бота (через запятую, от трёх букв; сверх стандартных)' }),
    area,
    el('div', { class: 'row' }, [save]),
  ]);
}
