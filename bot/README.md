# Бот хаба на Cloudflare Workers

Что делает: принимает сообщения из Telegram и ярлыка iPhone и кладёт их файлами в `inbox/` приватного репозитория `hub-data`; раз в 5 минут проверяет сайты проектов («Пульс») и пишет в Telegram только о проблемах. Хаб при открытии сам разбирает `inbox/`.

Не проверено на живом Cloudflare и Telegram: код проверен тестами с имитацией GitHub и Telegram (tests/bot.test.mjs). Лимиты бесплатного тарифа и доступность из России сверь на странице Cloudflare перед настройкой.

Секреты никогда не кладём в репозиторий. Все токены ниже задаются только командой `wrangler secret put`.

## Что понадобится

1. Аккаунт Cloudflare (бесплатный) и Node.js 18+ на компьютере.
2. Новый бот в Telegram: напиши @BotFather, команда `/newbot`, имя на выбор. Он выдаст токен бота. Это отдельный бот для хаба, не бот Impulse Group.
3. Твой Telegram ID (число): напиши боту @userinfobot, он ответит.
4. Токен GitHub для бота: GitHub → Settings → Developer settings → Fine-grained tokens → Generate. Репозиторий: только `hub-data`. Права: Contents: Read and write. Срок: не больше года.
5. Две случайные строки (по 32+ символа): `WEBHOOK_SECRET` и `SHARE_KEY`. В PowerShell: `-join ((48..57)+(97..122) | Get-Random -Count 40 | % {[char]$_})`.

## Установка (PowerShell, папка `bot` внутри клона hub-app)

```
cd путь\к\hub-app\bot
npx wrangler login
```

Открой `wrangler.toml` и замени `ЗАМЕНИ-НА-ЛОГИН` на свой логин GitHub, проверь `TZ_OFFSET_MIN`. Затем секреты (каждая команда спросит значение):

```
npx wrangler secret put BOT_TOKEN
npx wrangler secret put OWNER_ID
npx wrangler secret put GH_TOKEN
npx wrangler secret put WEBHOOK_SECRET
npx wrangler secret put SHARE_KEY
npx wrangler deploy
```

После деплоя Wrangler покажет адрес вида `https://hub-bot.ТВОЁ-ИМЯ.workers.dev`. Проверка: открой `/health` в браузере, должно быть `ok`.

## Подключить Telegram

Подставь свои значения (токен вводи только у себя на компьютере, не присылай его в чат):

```
$T = "ТОКЕН_БОТА"; $U = "https://hub-bot.ТВОЁ-ИМЯ.workers.dev"; $S = "WEBHOOK_SECRET"
Invoke-RestMethod "https://api.telegram.org/bot$T/setWebhook" -Method Post -ContentType "application/json" -Body (@{url="$U/tg"; secret_token=$S; allowed_updates=@("message","callback_query")} | ConvertTo-Json)
Invoke-RestMethod "https://api.telegram.org/bot$T/setMyCommands" -Method Post -ContentType "application/json" -Body (@{commands=@(@{command="t";description="Задача"},@{command="n";description="Заметка"},@{command="q";description="Открытый вопрос"})} | ConvertTo-Json -Depth 4)
```

Напиши боту «купить хлеб завтра»: он ответит и покажет кнопки. Открой хаб: задача появится (разбор идёт при входе и при возврате в приложение, или кнопкой в Настройки → «Бот и входящие»).

## Как бот решает

- Команды главные: `/t` или `/з` задача, `/n` или `/н` заметка, `/q` или `/в` открытый вопрос.
- Без команды: ссылка → закладка; название проекта и слово-действие → задача с проектом; только слово-действие → задача; остальное → заметка.
- Сроки: «завтра», «в пятницу», «в 15:00».
- Кнопки под ответом: [В заметки] [В задачи] [Отменить]. Если хаб уже забрал запись, исправляй в самом хабе.
- Названия проектов и сайты бот берёт из файла `bot-config.json`, который хаб сам кладёт в `hub-data` после загрузки проектов. Свои слова-действия: Настройки → «Бот и входящие».

## Пульс проектов

Раз в 5 минут функция открывает сайт каждого проекта (адрес из ссылки «Сайт» в карточке). Сообщение приходит после двух неудачных проверок подряд, один раз; потом один раз «снова отвечает». Статус пишется в `pulse/status.json`, хаб показывает его на странице проекта. Ошибка самого хаба (сейчас: не обновились карточки проектов) приходит так же один раз через `pulse/hub.json`.

Ограничение: процесс самого Telegram-бота проекта снаружи не проверить. Только сайт отвечает или нет.

## Ярлык iPhone

Адрес: `https://hub-bot.ТВОЁ-ИМЯ.workers.dev/share`, метод POST, JSON `{"key": "SHARE_KEY", "text": "...", "source": "share"}`. Шаги по «Командам» подробно в плане, Приложение А, вариант 1. Ключ только добавляет сообщения. Сменить: `npx wrangler secret put SHARE_KEY` и поправить ярлык.

## Если что-то не работает

- Бот молчит: `npx wrangler tail` показывает журнал; проверь `getWebhookInfo` (`https://api.telegram.org/botТОКЕН/getWebhookInfo`, поле last_error_message).
- «Не получилось записать в GitHub»: токен GH_TOKEN просрочен или нет права Contents: Read and write на `hub-data`.
- Чужие сообщения бот игнорирует молча (проверка по OWNER_ID).
- Отключить бота: `setWebhook` с пустым url или удалить Worker в панели Cloudflare. Данные в хабе не пострадают.
