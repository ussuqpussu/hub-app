# hub-app

Публичная оболочка личного хаба: чистые HTML, CSS и JS, без сборки и без фреймворков.
Здесь только код приложения. Личные данные и ключи в этот репозиторий не попадают:
данные лежат в приватном репозитории `hub-data`.

Статус: работает на GitHub Pages. Вкладка «Знания» читает папку knowledge из hub-projects (index.json собирает scripts/build-knowledge.mjs в GitHub Actions).

## Шрифты и лицензии
- Onest и Golos Text (assets/fonts): SIL Open Font License 1.1, тексты лицензий рядом (Onest-OFL.txt, GolosText-OFL.txt). Файлы взяты из пакетов @fontsource-variable/onest и @fontsource-variable/golos-text.
- Движение, графики и остров перенесены из присланного motion-kit (демо-код без внешних зависимостей), свои реализации в js/motion-kit.js, js/island.js, js/mk-widgets.js, js/kanban.js.
