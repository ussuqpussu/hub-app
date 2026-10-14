// Описание новых тем хаба. Из этого файла собираются: js/theme-data.js (для css/themes.css и хаба)
// и список тем в движке (theme/engine.html). Сцены каждой темы лежат рядом: theme/src/tNN-<id>.js.
// Цвета подобраны так, чтобы текст читался (проверяет tests/themes.test.mjs): текст ≥ 7:1, серый ≥ 4,5:1, надпись на кнопке ≥ 4,5:1.
const SANS = "'Segoe UI Variable','SF Pro Text','Segoe UI',system-ui,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";
const MONO = "'Cascadia Mono','SF Mono',Consolas,ui-monospace,monospace";

export const NEW_THEMES = [
  { id: 'lighthouse', name: 'Маяк', group: 'Тёмные', dark: true, note: 'Тёмная: ночное море, янтарный свет маяка', desc: 'Ночное море и маяк. Анимации: луч маяка над волнами, лодка с фонарём, прибой на песке, подводные лучи и медузы',
    bg: '#07131f', surface: '#0d2033', text: '#e6f0f6', accent: '#ffd27a', onAccent: '#07131f', dim: '#9fb6c6', font: SANS, card: '.9em', btn: '99px', layout: 'float', pal: ['#ffd27a', '#5fa8c8', '#16384f', '#e6f0f6'] },
  { id: 'constellation', name: 'Созвездие', group: 'Тёмные', dark: true, note: 'Тёмная: звёздная карта, сиреневый акцент, засечки', desc: 'Звёздное небо и карта. Анимации: небесный свод с метеорами, звёздная карта, фазы Луны, комета над горизонтом',
    bg: '#0b0d24', surface: '#14173a', text: '#e8e9ff', accent: '#b7a6ff', onAccent: '#0b0d24', dim: '#a4a8d6', font: SERIF, card: '.6em', btn: '99px', layout: 'air', pal: ['#b7a6ff', '#ffd9a0', '#262a5c', '#e8e9ff'] },
  { id: 'aurora', name: 'Аврора', group: 'Тёмные', dark: true, note: 'Тёмная: северное сияние над снежными горами', desc: 'Север и сияние. Анимации: ленты сияния над горами, озеро с отражением, изморозь на стекле, снег в соснах',
    bg: '#08141a', surface: '#0f232b', text: '#e4f4ee', accent: '#7ff0c0', onAccent: '#08141a', dim: '#9bbcb2', font: SANS, card: '1em', btn: '99px', layout: 'side', pal: ['#7ff0c0', '#8aa7ff', '#173540', '#e4f4ee'] },
  { id: 'blueprint', name: 'Чертёж', group: 'Тёмные', dark: true, note: 'Тёмная: синька, белые линии, моноширинный шрифт', desc: 'Чертёжная синька. Анимации: циркуль и окружности, зубчатая передача, изометрический куб, ферма моста с размерными линиями',
    bg: '#0e3560', surface: '#14457a', text: '#eef6ff', accent: '#ffe27a', onAccent: '#0e3560', dim: '#b9d3ee', font: MONO, card: '0', btn: '0', layout: 'side', pal: ['#ffe27a', '#8fc3f5', '#1d5a9c', '#eef6ff'] },
  { id: 'zen', name: 'Дзен', group: 'Светлые', dark: false, note: 'Светлая: сад камней, тёплая бумага, киноварь', desc: 'Сад камней и тушь. Анимации: граблями расчерченный песок, круг энсо, бамбук на ветру, пруд с карпами',
    bg: '#efece4', surface: '#f8f6f0', text: '#23211d', accent: '#8f2d2a', onAccent: '#ffffff', dim: '#5f5a50', font: SERIF, card: '.4em', btn: '.4em', layout: 'air', pal: ['#8f2d2a', '#6b6a5c', '#d9d4c6', '#23211d'] },
  { id: 'circuit', name: 'Контур', group: 'Тёмные', dark: true, note: 'Тёмная: плата, графит, салатовые импульсы', desc: 'Электроника. Анимации: дорожки платы с импульсами, кристалл процессора со сканом, осциллограф, радар',
    bg: '#0b0f0e', surface: '#121917', text: '#dff5ea', accent: '#9dff4d', onAccent: '#0b0f0e', dim: '#8fb3a2', font: MONO, card: '.3em', btn: '.3em', layout: 'side', pal: ['#9dff4d', '#35d6b4', '#1b2723', '#dff5ea'] },
  { id: 'pixel', name: 'Пиксель', group: 'Тёмные', dark: true, note: 'Тёмная: 8-битный пейзаж, фиолетовая ночь, розовый акцент', desc: 'Пиксельная графика. Анимации: смена дня и ночи с параллаксом, дождливый город, закат над морем, звёздный полёт',
    bg: '#1b1230', surface: '#271a45', text: '#f6efff', accent: '#ff6fae', onAccent: '#1b1230', dim: '#bfb0e0', font: MONO, card: '0', btn: '0', layout: 'float', pal: ['#ff6fae', '#ffd166', '#3a2766', '#f6efff'] },
  { id: 'papercut', name: 'Бумажный театр', group: 'Светлые', dark: false, note: 'Светлая: слои вырезанной бумаги, тёплые тени', desc: 'Слои бумаги. Анимации: холмы и солнце, лесной театр, бумажное море, городские силуэты — слои качаются с глубиной',
    bg: '#f4ede1', surface: '#fffaf0', text: '#2b2118', accent: '#c84a24', onAccent: '#ffffff', dim: '#6a5b4c', font: SANS, card: '1.1em', btn: '99px', layout: 'float', pal: ['#c84a24', '#e9a23b', '#7a9a8a', '#2b2118'] },
  { id: 'embers', name: 'Угли', group: 'Тёмные', dark: true, note: 'Тёмная: камин, тлеющие угли, оранжевый жар', desc: 'Огонь и тепло. Анимации: искры над углями, пламя камина, свечи, лавовая лампа',
    bg: '#120c09', surface: '#1d130e', text: '#f5e6da', accent: '#ff8a3d', onAccent: '#120c09', dim: '#bda391', font: SANS, card: '.8em', btn: '99px', layout: 'air', pal: ['#ff8a3d', '#ffd08a', '#3a2418', '#f5e6da'] },
  { id: 'letterpress', name: 'Типограф', group: 'Светлые', dark: false, note: 'Светлая: типографская краска на кремовой бумаге, киноварь', desc: 'Книжная печать. Анимации: литеры встают в строку, оттиск штампа, растр печатной краски, листы с типографским набором',
    bg: '#f3eddc', surface: '#fbf7ea', text: '#181512', accent: '#c0261d', onAccent: '#ffffff', dim: '#5b5448', font: SERIF, card: '0', btn: '0', layout: 'side', pal: ['#c0261d', '#181512', '#e1d8bd', '#6a5f45'] },
];
