---
name: ru-text
description: Russian typography and editorial standards — quotes, dashes, NBSP, number formatting, info-style anti-patterns. Use when writing, editing, or reviewing Russian text (UI copy, articles, emails, marketing, microcopy)
tokens: 1768
user-invocable: false
---

# ru-text — Russian Text Quality

Russian typography and editorial reference. Apply to ALL Russian-language output unless the user requests a different style.

## Use when

- UI copy: buttons, errors, hints, empty states, microcopy
- Articles, blog posts, marketing content
- Email, messenger, business correspondence
- Reviewing existing Russian text for typography / style issues

## Do not use when

- The output is not in Russian.
- Inside code, identifiers, URLs, file paths, or email addresses — leave machine punctuation untouched.
- The user explicitly requests a conflicting style (casual, academic, SEO, literary). Their prompt overrides these defaults on conflict — this is the Style Priority escape hatch.

## Hard Rules

Apply to every Russian sentence you emit:

1. Quotes: outer «ёлочки», nested „лапки“ — never ASCII straight quotes (U+0022) in the delivered text.
2. Dashes: `—` (em) in running text, `–` (en) in ranges, `-` (hyphen) only inside words. Max 1–2 em dashes per paragraph.
3. NBSP (U+00A0) after single-letter prepositions and between number+unit, so they never wrap alone.
4. Numbers: decimal comma (`3,14`), thin-space digit groups (`1 000 000`).
5. Write `ё` where it removes ambiguity (`все`/`всё`, `небо`/`нёбо`) and in proper names.
6. Headings use sentence case, not Title Case.
7. Cut office-speak (`являться`, `осуществлять`, `в целях`, `ввиду того что`).

## Typography Rules Table

In every example below, `␣` marks a non-breaking space (U+00A0) — otherwise invisible.

| Rule | Wrong | Correct |
|---|---|---|
| Primary quotes: guillemets | "текст" | «текст» |
| Nested quotes: lapki (U+201C closing) | «"вложенные"» | «„вложенные“» |
| Em dash with spaces | слово - слово | слово — слово |
| En dash for ranges, no spaces | 10-15 дней | 10–15 дней |
| NBSP after single-letter prepositions | в начале (space wraps) | в␣начале |
| Ellipsis: single character | ... | … |
| Digit groups with thin spaces | 1000000 | 1 000 000 |
| Decimal comma (not dot) | 3.14 | 3,14 |
| Ordinal with hyphen | 1ый, 2ой | 1-й, 2-й |
| Numero sign | No. 5, #5 | №␣5 |
| Abbreviations with NBSP | т.д., т.е. | т.␣д., т.␣е. |
| Ruble symbol after number with NBSP | 1500 руб | 1␣500␣₽ |

## NBSP — Critical Cases

`␣` = NBSP (U+00A0). Insert a real non-breaking space at each `␣` position; place it between:

- Single-letter prepositions and the next word: `в␣начале`, `к␣концу`, `с␣пятого`, `о␣проекте`, `у␣меня`, `и␣тогда`, `а␣потом`
- Number and unit: `5␣кг`, `1␣500␣₽`, `№␣5`
- Abbreviation parts: `т.␣д.`, `т.␣е.`, `и.␣о.`
- Initials and surname: `А.␣С.␣Пушкин`

## Dashes — Three Different Marks

- `—` (em dash, U+2014) — in running text, between subject and predicate, before direct speech
- `–` (en dash, U+2013) — for numerical ranges: `10–15 дней`, `2024–2026`
- `-` (hyphen) — only inside compound words: `кто-то`, `по-русски`, `1-й`

**Limit:** max 1–2 em dashes per paragraph. Overuse signals weak writing.

## Numbers and Money

| Wrong | Correct |
|---|---|
| 1500руб | 1␣500␣₽ |
| 3.14 | 3,14 |
| 1000000 | 1 000 000 |
| 50 % / 50% (context) | UI copy: `50%` · print: `50␣%` |
| 25 С | 25 °C |

**Percent:** in UI/web copy write `50%` with no space (dominant web practice). In print or formal typography use `50␣%` with NBSP (GOST / Milchin). Default to UI style for interface copy.

## Capitalization (Russian-specific)

- Sentence case for headings (NOT title case as in English): `Как настроить уведомления` (not `Как Настроить Уведомления`)
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

Example strings are shown in backticks (`` ` ``); the backticks are delimiters, not part of the copy.

- **Buttons:** verb + object — `Сохранить изменения`, `Отправить заявку` (not `Сохранение`, `Отправка`)
- **Errors:** state what went wrong + what to do — `Не удалось сохранить. Проверьте подключение и попробуйте ещё раз` (not `Ошибка сохранения`)
- **Empty states:** explain why + suggest action — `Здесь пока пусто. Создайте первый заказ` (not `Нет данных`)
- **Confirmations:** clear, no ambiguity — `Удалить заказ №␣123?` with explicit `Удалить` / `Отмена` buttons (not `OK` / `Cancel`)
- **Hints:** answer «что это» or «что делать», short — `Например, ivan@example.com` (not `Введите email`)

## Common Anti-Patterns

1. **Russian text with English punctuation:** ASCII straight quotes (U+0022) and hyphens (`-`) where dashes belong, instead of «ёлочки» and `—`
2. **Missed NBSP:** `в начале` (ordinary space, wraps to a new line) instead of `в␣начале` (`␣` = NBSP) — a lone `в` at a line end reads badly on narrow screens
3. **Decimal point instead of comma:** Russian standard is `3,14`
4. **Double spaces:** typewriter habit; modern typography uses a single space
5. **Title Case as in English:** Russian uses sentence case
6. **Overuse of `являться`:** removes life from sentences — use an em dash or active verb
7. **Office-speak:** `осуществлять`, `проводить мероприятия`, `в целях оптимизации` → plain verbs
8. **Foreign loanwords with Russian endings:** `юзать`, `контентмейкер`, `митап` — acceptable in casual context, jarring in formal

## Quality Checklist

Before delivering Russian text, confirm every box (`␣` = NBSP):

- [ ] Quotes: «␣» primary, „␣“ nested (U+201C closing, never ASCII)
- [ ] Dashes: — in text, – in ranges, - only in compounds; max 1–2 per paragraph
- [ ] NBSP after single-letter prepositions (в, к, с, о, у, и, а)
- [ ] Ellipsis: … (single char)
- [ ] Abbreviations: т.␣д., т.␣п. (with NBSP)
- [ ] No double spaces, no space before punctuation
- [ ] Numbers: thin spaces for groups, comma for decimal
- [ ] Currency: 1␣500␣₽ (NBSP both sides)
- [ ] Heading case: sentence case, not Title Case
- [ ] No office-speak: являться, осуществлять, в целях, ввиду

## Recap — non-negotiables

- Outer «ёлочки», nested „лапки“ (U+201C closing) — no ASCII straight quotes in delivered text.
- Three dash marks kept distinct: — text, – ranges, - compounds; 1–2 em dashes per paragraph.
- NBSP after single-letter prepositions and inside number+unit; decimal comma; thin-space digit groups.
- Sentence-case headings; no office-speak.
- Run the Quality Checklist before delivering.

Credit: based on Arseniy Kamyshev's ru-text reference (via VKirill/codex-starter-kit). Full editorial reference at https://ru-text.org.
