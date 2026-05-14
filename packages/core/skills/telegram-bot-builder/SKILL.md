---
name: telegram-bot-builder
description: Expert in building Telegram bots — bot architecture, the Telegram Bot API, inline keyboards, conversation flows, payments, scaling. Use when the task mentions Telegram bot, bot API, tg bot, Telegraf, grammY, aiogram, pyrogram, or telethon
tokens: 1480
user-invocable: false
---

# Telegram Bot Builder

Telegram Bot architect. Builds bots that feel like helpful assistants, not clunky interfaces. Understands the full Telegram ecosystem — what's possible, what's popular, and what monetizes. Designs conversations that feel natural and retain users.

## Use this skill when

- Building a new Telegram bot or extending an existing one
- Designing inline keyboards, conversation flows, or command handlers
- Planning monetization via Telegram Payments or freemium models
- Setting up webhooks, graceful shutdown, or background processing

## Do not use this skill when

- The task involves a Telegram Mini App UI (use the frontend / Mini App skills)
- You need general backend architecture unrelated to Telegram APIs

## Stack Selection

Choose the library based on project requirements:
- **Telegraf** — most Node.js projects, mature ecosystem
- **grammY** — TypeScript-first projects with modern async patterns
- **python-telegram-bot** — quick Python prototypes
- **aiogram** — async, scalable Python bots
- **pyrogram / telethon** — userbot or low-level client features

## Bot Architecture

A well-structured bot separates concerns:

```
src/
├── bot.ts                # bot initialization, handler registration
├── commands/             # one file per /command
├── handlers/             # message + callback query handlers
├── keyboards/            # reusable inline keyboard builders
├── middleware/           # auth, logging, rate-limit, i18n
├── services/             # business logic, DB access
└── config.ts             # env parsing
```

Bot initialization registers command handlers, text handlers, and callback query handlers, then calls `bot.launch()` (Telegraf) or `bot.start()` (grammY). Graceful shutdown is essential: register `SIGINT` and `SIGTERM` handlers that call `bot.stop()`.

## Inline Keyboards

Keyboards are built with `Markup.inlineKeyboard()` using arrays of button arrays. Single-column arrays produce vertical menus; multi-element inner arrays produce rows (yes/no pairs, pagination controls, grids).

Patterns by use case:
- **Single column** for simple menus
- **Multi-column** for binary choices and pagination
- **Grid layout** for category selection
- **URL buttons** for external links and payment flows

For paginated lists: compute the visible slice from current page and items-per-page, build item buttons from that slice, then append navigation buttons (previous/next) only when relevant.

Callback query handlers respond with `ctx.answerCbQuery()` to dismiss the spinner and `ctx.editMessageText()` to update the message in-place.

## Bot Monetization

Revenue models by complexity:
- **Ads and affiliate links** — low effort, low revenue
- **Per-use payments** — low effort via Telegram Payments
- **Freemium with usage limits** — medium effort, common pattern
- **Subscription** — medium effort, requires retention work

Telegram Payments require creating an invoice with `ctx.replyWithInvoice()` specifying title, description, payload, provider token, currency, and prices array. Handle the `successful_payment` event to activate purchased features.

Freemium strategy: define a daily usage limit for free users, check it before each action, and prompt an upgrade when the limit is reached. Track usage per `userId` in the database.

## Error Handling

Always register a global error handler. Send a user-friendly error message instead of letting requests time out. Log errors with enough context for debugging. Apply rate limiting to prevent abuse.

```typescript
bot.catch((err, ctx) => {
  logger.error({ err, update: ctx.update }, 'bot error');
  ctx.reply('Что-то пошло не так. Уже разбираемся.').catch(() => {});
});
```

## Background Processing

For operations longer than Telegram's response timeout (~10s for webhooks, ~30s for long polling), acknowledge the request immediately with a typing indicator (`ctx.sendChatAction('typing')`) or a confirmation message, process in the background, then send the result when ready.

For heavier workloads use a queue (BullMQ, Celery, RabbitMQ) and reply with a "processing…" message that gets edited on completion.

## Behavioral Traits

- Acknowledges long operations immediately rather than letting users wait
- Always registers `SIGINT`/`SIGTERM` shutdown handlers
- Validates user input and handles edge cases before processing
- Uses `ctx.answerCbQuery()` for every callback query to dismiss the spinner
- Checks usage limits before executing paid or rate-limited actions
- Keeps messages concise — Telegram users read on mobile

## Important Constraints

- **NEVER** perform blocking I/O synchronously in a handler — Telegram has strict timeout limits
- **ALWAYS** answer callback queries with `ctx.answerCbQuery()` or users see a spinner forever
- **NEVER** expose internal errors or stack traces in bot replies
- **ALWAYS** handle the `successful_payment` event to activate paid features before replying

## Webhook vs Long Polling

| Aspect | Webhook | Long polling |
|--------|---------|--------------|
| Latency | Low | Higher |
| Hosting | Requires public HTTPS endpoint | Any environment |
| Scaling | Horizontal (load balancer) | Single process (or distributed via shared queue) |
| Dev experience | Need ngrok / cloudflared locally | Just run |
| Best for | Production | Local dev, low traffic |

Use webhook in production via Telegraf `bot.createWebhook()` / grammY `webhookCallback()` integrated with the web framework.

Adapted from vibeship-spawner-skills (Apache 2.0).
