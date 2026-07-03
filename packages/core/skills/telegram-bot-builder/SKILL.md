---
name: telegram-bot-builder
description: Expert in building Telegram bots — bot architecture, the Telegram Bot API, inline keyboards, conversation flows, payments, scaling. Use when the task mentions Telegram bot, bot API, tg bot, Telegraf, grammY, aiogram, pyrogram, or telethon
tokens: 1480
user-invocable: false
---

# Telegram Bot Builder

Design and build Telegram bots — architecture, the Bot API, inline keyboards, conversation flows, payments, and scaling — with conversations that feel natural and retain users.

## Use this skill when

- Building a new Telegram bot or extending an existing one
- Designing inline keyboards, conversation flows, or command handlers
- Planning monetization via Telegram Payments or freemium models
- Setting up webhooks, graceful shutdown, or background processing

## Do not use this skill when

- The task is a Telegram Mini App UI — that is regular frontend web work (React/Vue running inside a WebApp), not covered by this kit's skills. This skill covers only the Bot API side.
- You need general backend architecture unrelated to Telegram APIs.

## Hard Rules

1. NEVER run blocking or long I/O synchronously inside a handler — Telegram enforces tight timeouts. Acknowledge immediately (`ctx.sendChatAction('typing')` or a confirmation message), then process in the background.
2. ALWAYS call `ctx.answerCbQuery()` for every callback query, or the user sees a spinner forever.
3. NEVER expose internal errors or stack traces in replies — register a global `bot.catch` and send a friendly message instead.
4. ALWAYS handle the `successful_payment` event and activate the paid feature BEFORE replying.
5. ALWAYS register `SIGINT` and `SIGTERM` handlers that stop the bot cleanly (`bot.stop()`).
6. ALWAYS validate user input, and check usage limits before any paid or rate-limited action.
7. Keep replies concise — Telegram users read on mobile.

## Stack Selection (decide first)

Pick the library by detection, in order; stop at the first match:

1. An existing bot dependency in `package.json` / `pyproject.toml` (telegraf, grammy, aiogram, python-telegram-bot, pyrogram, telethon) → keep it; do not migrate.
2. New TypeScript/Node project → **grammY** (TypeScript-first, modern async) or **Telegraf** (mature, larger ecosystem). Prefer grammY for a fresh TS codebase; pick Telegraf if the team already knows it.
3. New Python project → **aiogram** (async, scales) for anything beyond a prototype; **python-telegram-bot** for a quick prototype.
4. Userbot / low-level MTProto client features (not a bot token) → **pyrogram** or **telethon**.
5. Default when nothing above matches → grammY (Node) or aiogram (Python).

## Bot Architecture

Separate concerns:

```
src/
├── bot.ts        # initialization, handler registration
├── commands/     # one file per /command
├── handlers/     # message + callback query handlers
├── keyboards/    # reusable inline keyboard builders
├── middleware/   # auth, logging, rate-limit, i18n
├── services/     # business logic, DB access
└── config.ts     # env parsing
```

`bot.ts` registers command, text, and callback query handlers, then starts the bot: `bot.launch()` (Telegraf) or `bot.start()` (grammY). Wire graceful shutdown per Hard Rule 5.

## Inline Keyboards

Build with `Markup.inlineKeyboard()` — an array of rows, each row an array of buttons. One button per row = vertical menu; several buttons per row = a horizontal row (yes/no, pagination). Use `Markup.button.url()` for external links and payment pages.

```typescript
import { Markup } from 'telegraf';

Markup.inlineKeyboard([
  [Markup.button.callback('Option A', 'opt_a')],          // vertical menu
  [Markup.button.callback('Yes', 'yes'),
   Markup.button.callback('No', 'no')],                   // one row, two buttons
  [Markup.button.url('Docs', 'https://example.com')],     // external link
]);
```

Paginated list — slice by page, then append nav buttons only when they exist:

```typescript
function pageKeyboard(items, page, perPage) {
  const start = page * perPage;
  const rows = items.slice(start, start + perPage)
    .map((it) => [Markup.button.callback(it.label, `pick:${it.id}`)]);
  const nav = [];
  if (page > 0) nav.push(Markup.button.callback('« Prev', `page:${page - 1}`));
  if (start + perPage < items.length) nav.push(Markup.button.callback('Next »', `page:${page + 1}`));
  if (nav.length) rows.push(nav);
  return Markup.inlineKeyboard(rows);
}

bot.action(/^page:(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();                               // Hard Rule 2
  const page = Number(ctx.match[1]);
  await ctx.editMessageText('Page ' + (page + 1), pageKeyboard(items, page, 5));
});
```

## Monetization

Revenue models, ordered low → high on both effort and revenue:

1. Ads / affiliate links — low effort, low revenue.
2. Per-use payments — low effort, via Telegram Payments.
3. Freemium with usage limits — medium effort, common pattern.
4. Subscription — medium effort, needs retention work.

Telegram Payments flow: create the invoice with `ctx.replyWithInvoice({ title, description, payload, provider_token, currency, prices })`; answer the `pre_checkout_query` with `ctx.answerPreCheckoutQuery(true)`; on `successful_payment`, activate the feature before replying (Hard Rule 4).

Freemium: store per-`userId` usage in the DB, check the daily limit before each gated action, and prompt an upgrade when the limit is reached.

## Error Handling

Register one global handler so no request times out (Hard Rule 3). Log with enough context to debug; apply rate limiting to prevent abuse.

```typescript
bot.catch((err, ctx) => {
  logger.error({ err, update: ctx.update }, 'bot error');
  ctx.reply('Что-то пошло не так. Уже разбираемся.').catch(() => {});
});
```

## Background Processing

For work longer than Telegram's response timeout (~10s for webhooks, ~30s for long polling): acknowledge immediately (typing indicator or a "processing…" message), do the work in the background, then send or edit-in the result. For heavier loads use a queue (BullMQ, Celery, RabbitMQ) and edit the "processing…" message on completion.

## Webhook vs Long Polling

| Aspect | Webhook | Long polling |
|--------|---------|--------------|
| Latency | Low | Higher |
| Hosting | Public HTTPS endpoint required | Any environment |
| Scaling | Horizontal (load balancer) | Single process (or distributed via shared queue) |
| Dev experience | Needs ngrok / cloudflared locally | Just run |
| Best for | Production | Local dev, low traffic |

Production: Telegraf `bot.createWebhook()` / grammY `webhookCallback()`, mounted on your web framework.

## Recap — non-negotiables

- Never block in a handler; acknowledge long work immediately and finish it in the background.
- Answer every callback query (`ctx.answerCbQuery()`); never leak stack traces — use `bot.catch`.
- Activate paid features on `successful_payment` before replying; check usage limits before gated actions.
- Register `SIGINT`/`SIGTERM` shutdown, validate input, and keep replies short.

Adapted from vibeship-spawner-skills (Apache 2.0).
