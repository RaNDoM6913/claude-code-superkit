---
name: ru-text
description: Russian typography and editorial standards — quotes, dashes, NBSP, number formatting, info-style anti-patterns. Use when writing, editing, or reviewing Russian text (UI copy, articles, emails, marketing, microcopy)
user-invocable: false
---

# ru-text — Russian Text Quality

Russian typography and editorial reference. Apply to ALL Russian-language output unless the user explicitly requests a different style.

## When to Use

- UI copy (buttons, errors, hints, microcopy)
- Articles, blog posts, marketing content
- Email, messenger, business correspondence
- Reviewing existing Russian text for typography / style issues

## Style Priority

If the user explicitly requests a specific style (casual, academic, SEO, literary), their prompt overrides these defaults where they conflict.

## Always-On: Typography Rules

Apply to ALL Russian text output:

| Rule | Wrong | Correct |
|---|---|---|
| Primary quotes: guillemets | "текст" | «текст» |
| Nested quotes: lapki | «"вложенные"» | «„вложенные"» |
| Em dash with spaces | слово - слово | слово — слово |
| En dash for ranges, no spaces | 10-15 дней | 10–15 дней |
| NBSP after single-letter prepositions | в начале | в начале |
| Ellipsis: single character | ... | … |
| Digit groups with thin spaces | 1000000 | 1 000 000 |
| Decimal comma (not dot) | 3.14 | 3,14 |
| Ordinal with hyphen | 1ый, 2ой | 1-й, 2-й |
| Numero sign | No. 5, #5 | № 5 |
| Abbreviations with NBSP | т.д., т.е. | т. д., т. е. |
| Ruble symbol after number with NBSP | 1500 руб | 1 500 ₽ |

## NBSP — Critical Cases

Place ` ` (non-breaking space) between:
- Single-letter prepositions and the next word: `в начале`, `к концу`, `с пятого`, `о проекте`, `у меня`, `и тогда`, `а потом`
- Number and unit: `5 кг`, `1500 ₽`, `№ 5`
- Abbreviation parts: `т. д.`, `т. е.`, `и. о.`
- Initials and surname: `А. С. Пушкин`

## Dashes — Three Different Marks

- `—` (em dash, U+2014) — in running text, between subject and predicate, before direct speech
- `–` (en dash, U+2013) — for numerical ranges: `10–15 дней`, `2024–2026`
- `-` (hyphen) — only inside compound words: `кто-то`, `по-русски`, `1-й`

**Limit:** max 1-2 em-dashes per paragraph. Overuse signals weak writing.

## Numbers and Money

| Wrong | Correct |
|---|---|
| 1500руб | 1 500 ₽ |
| 3.14 | 3,14 |
| 1000000 | 1 000 000 |
| 50% | 50 % (NBSP between number and %) |
| 25 С | 25 °C |

## Capitalization (Russian-specific)

- Sentence case for headings (NOT title case as in English): "Как настроить уведомления" (not "Как Настроить Уведомления")
- Days of week, months: lowercase (`понедельник`, `март`)
- Nationalities, languages: lowercase (`русский`, `англичанин`)
- Job titles: lowercase unless at start of sentence (`директор`, `менеджер`)
- Brand names: keep original casing (`iPhone`, `GitHub`)

## Top Stop-Words to Remove or Replace

| Stop-word (Russian) | Replace with |
|---|---|
| является | — (em dash) or restructure |
| осуществлять | делать, проводить |
| в настоящее время | сейчас |
| данный | этот |
| определённый | (name the specific thing) |
| произвести оплату | оплатить |
| высококачественный | (name the specific quality) |
| был осуществлён | (active voice + actor) |
| на сегодняшний день | сегодня |
| в целях | чтобы |
| в случае если | если |
| ввиду того что | потому что |
| с целью | чтобы |
| при условии что | если |

## UX Writing — Microcopy Rules

- **Buttons:** verb + object: "Сохранить изменения", "Отправить заявку" (not "Сохранение", "Отправка")
- **Errors:** state what went wrong + what to do: "Не удалось сохранить. Проверьте подключение и попробуйте ещё раз" (not "Ошибка сохранения")
- **Empty states:** explain why + suggest action: "Здесь пока пусто. Создайте первый заказ" (not "Нет данных")
- **Confirmations:** clear, no ambiguity: "Удалить заказ № 123?" with explicit "Удалить" / "Отмена" buttons (not "OK" / "Cancel")
- **Hints:** answer "что это" or "что делать", short: "Например, ivan@example.com" (not "Введите email")

## Common Anti-Patterns

1. **Russian text with English punctuation:** ASCII quotes `"`, hyphens `-` instead of em dashes
2. **Missed NBSPs:** "в начале" instead of "в начале" — text wraps awkwardly on narrow screens
3. **Decimal point instead of comma:** Russian standard is `3,14`
4. **Double spaces:** typewriter habit; modern typography uses single space
5. **Title Case as in English:** Russian uses sentence case
6. **Overuse of "являться":** removes life from sentences — use em dash or active verb
7. **Office-speak:** "осуществлять", "проводить мероприятия", "в целях оптимизации" → plain verbs
8. **Foreign loanwords with Russian endings:** "юзать", "контентмейкер", "митап" — acceptable in casual context, jarring in formal

## Quality Checklist

Before delivering Russian text:

- [ ] Quotes: « » primary, „ " nested
- [ ] Dashes: — in text, – in ranges, - only in compounds; max 1-2 per paragraph
- [ ] NBSP after single-letter prepositions (в, к, с, о, у, и, а)
- [ ] Ellipsis: … (single char)
- [ ] Abbreviations: т. д., т. п. (with NBSP)
- [ ] No double spaces, no space before punctuation
- [ ] Numbers: thin spaces for groups, comma for decimal
- [ ] Currency: 1 500 ₽ (NBSP both sides)
- [ ] Heading case: sentence case, not title case
- [ ] No office-speak: являться, осуществлять, в целях, ввиду

## Особо для TGApp и других русскоязычных продуктов

UX-копирайт — это лицо продукта. Кривая типография (ASCII-кавычки, дефис вместо тире) воспринимается как «китайский лендинг». Правильная типография — это бесплатное качество, нужно только знать правила.

Credit: based on Arseniy Kamyshev's ru-text reference (via VKirill/codex-starter-kit). Full editorial reference at https://ru-text.org.
