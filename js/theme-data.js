// Данные тем для css/themes.css (его собирает scripts/gen-themes.mjs) и для хаба.
// Файл собирается скриптом scripts/build-engine.mjs из theme/src/themes-def.mjs, руками не правим.
// «Сотворение» описано прямо в css/tokens.css.
export const THEME_DEFS = [
 {
  "id": "myth",
  "name": "Мифы",
  "group": "Тёмные",
  "note": "Тёмная: чёрно-серебряная, по мотивам God of War и мифологии",
  "dark": true,
  "bg": "#050505",
  "surface": "#101010",
  "text": "#d4d4d4",
  "accent": "#f2f2f2",
  "onAccent": "#050505",
  "dim": "#a0a0a0",
  "font": "Georgia,'Times New Roman',serif",
  "card": ".3em",
  "btn": ".3em",
  "layout": "side",
  "pal": [
   "#f2f2f2",
   "#9097a6",
   "#4a4d55",
   "#d4d4d4"
  ]
 },
 {
  "id": "mythbento",
  "name": "Бенто",
  "group": "Тёмные",
  "note": "Тёмная: плавающая панель-капсула, асимметричное бенто, светящееся стекло, светлая карточка фокуса",
  "dark": true,
  "bg": "#040405",
  "surface": "#101012",
  "text": "#d8d8dc",
  "accent": "#f2f2f2",
  "onAccent": "#050505",
  "dim": "#8d8e96",
  "font": "Georgia,'Times New Roman',serif",
  "card": "1.75em",
  "btn": "99px",
  "layout": "float",
  "pal": [
   "#f2f2f2",
   "#9097a6",
   "#2a2b30",
   "#d8d8dc"
  ]
 },
 {
  "id": "mythmono",
  "name": "Монолит",
  "group": "Тёмные",
  "note": "Тёмная: копия «Бенто» точь-в-точь по четырём макетам: рейка с «Х», карточка с руками, кольца, светлый фокус, капсула на телефоне",
  "dark": true,
  "bg": "#040405",
  "surface": "#101012",
  "text": "#d8d8dc",
  "accent": "#f2f2f2",
  "onAccent": "#050505",
  "dim": "#8d8e96",
  "font": "Georgia,'Times New Roman',serif",
  "card": "1.75em",
  "btn": "99px",
  "layout": "float",
  "pal": [
   "#f2f2f2",
   "#9097a6",
   "#2a2b30",
   "#d8d8dc"
  ]
 }
];
