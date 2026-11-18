# Перекрёстная проверка Claude-пакета — 2026-11-18

Статус: исходная проверка части B завершена; Claude-исходники не изменялись. Результат — находки для проверки Fable и исправления владельцем Claude-слоя; это не исправленный пакет и не live-квалификация моделей.

## Основание, снимки и метод

Основание: `docs/superpowers/plans/2026-07-02-opus-rework/2026-11-17-astra-codex-sync-and-crosscheck-BRIEF.md`, часть B. Область: агенты/команды/скиллы Claude, Go references, вызывающие команды, hook output, tools, безопасные диагностические команды, installer/CLI/merge/updater. Не запускались реальные миграции, updater с сетью, внешние сервисы, загрузка зависимостей или атакующие сценарии.

Фиксированный проверенный source snapshot: `babb37dfd21dd42e2ea231f7f7cab7a005c6b409`; `v1.5.4^{commit}=412b87e01fe9bac8109c11df93b10e4dcd17ffec`. `v1.5.4` — аннотированный тег: объект тега `6025c249…` не является commit `412b87e…`. Команда:

```text
git diff --stat v1.5.4 babb37dfd21dd42e2ea231f7f7cab7a005c6b409 -- packages/core packages/stack-agents packages/stack-hooks packages/stack-rules packages/frontend-ui packages/frontend-3d packages/gan packages/extras lib bin/cli.js
```

не показала различий в проверяемом Claude-слое. Следовательно, приведённые ниже ссылки относятся и к релизу, и к текущему Claude-source. Изменения `2cf6f27..v1.5.4` использованы как контекст; находки не ограничены только этим diff.

Метод: чтение исходников, source tracing caller → output → hook/installer, поиск по всему указанному дереву и безопасные фикстуры в временных каталогах. Проверены frontmatter всех 56 shipped Claude-агентов и отдельно 28 showcase-агентов, выполнен индекс/поиск всех 34 Go references (9 364 строки). Семантическая проверка каждого примера всех 34 документов **не заявляется**; конкретное подтверждённое покрытие и UNVERIFIED перечислены в конце. Инструменты code-review-graph не предоставлены в текущем окружении, поэтому использован файловый поиск.

Серьёзность описывает последствия дефекта пакета. Ошибочная инструкция не доказывает, что модель уже выполнила её в пользовательском проекте. `CONFIRMED` ниже означает подтверждение исходного пункта/дефекта исходников, а не измеренный процент воспроизведения моделью.

## Находки

### B01 — merge перезаписывает настройки пользователя

[WARNING / HIGH] `lib/installer.js:397` — режим «Merge — add new files, skip existing» (`lib/installer.js:92`) безусловно вызывает `writeSettings`; `lib/settings-builder.js:42–46` строит JSON только из package defaults и записывает его поверх существующего файла. Это удаляет пользовательские hooks, deny permissions, env и настройки плагинов даже при `--defaults`, который выбирает merge (`lib/installer.js:85–87`). Безопасная temp-фикстура с `customSentinel` и `permissions.deny=["Bash(demo)"]` дала `customSentinel preserved=false; original deny preserved=false`. Минимальное исправление: передавать mode и сохранять существующие настройки в merge; добавления hooks/plugins объединять по определённому контракту с backup, пользовательские ограничения не заменять defaults.

### B02 — frontend-ui umbrella теряется в merge

[WARNING / HIGH] `lib/installer.js:194` — сначала устанавливается core `ui-reviewer.md`, затем frontend-ui пытается положить файл с тем же именем (`lib/installer.js:300`); `lib/utils.js:50–53` пропускает уже существующий destination в merge. Даже пустая существующая `.claude/` с выбранным frontend-ui получает core reviewer, а не umbrella. Temp-фикстура реальных `copyDir` дала `core retained=true; specialist routing=false`. В fresh/overwrite порядок, напротив, оставляет umbrella. Минимальное исправление: заранее выбрать ровно один package-owned вариант `ui-reviewer` перед копированием; отличать known pristine core от пользовательской правки и сообщать конфликт без её перезаписи.

### B03 — updater не покрывает self-contained packages и extras

[WARNING / HIGH] `packages/core/hooks/superkit-update.sh:285` — цикл установленных stacks читает только `stack-agents/$stack`, `stack-hooks/$stack` и `stack-rules/$stack`, затем заканчивается на строке 323. В отличие от installer (`lib/installer.js:288–336`), пути `packages/frontend-ui/*` и `packages/frontend-3d/*` не обрабатываются. `SUPERKIT_EXTRAS` записывается в meta (`lib/installer.js:468`), но updater его не читает: установленные bot/design/red-blue assets также остаются старыми. При этом meta version безусловно повышается на строке 354, создавая впечатление обновлённой установки. Доказательство — просмотр полного updater и поиск `frontend-ui|frontend-3d|SUPERKIT_EXTRAS` в нём: нет совпадений. Минимальное исправление: добавить те же self-contained/extras roots с существующим pristine-preserve правилом и явной политикой коллизии `ui-reviewer`; включить поддерживаемые helper scripts/patterns.

### B04 — выбранный --profile не меняет runtime-профиль

[WARNING / HIGH] `lib/installer.js:404` — installer сообщает «Built settings.json with ${profile} profile», но `profile` не передаётся в builder, а сохраняется только как `SUPERKIT_PROFILE` в meta (`lib/installer.js:469`). Поиск `SUPERKIT_PROFILE|CLAUDE_HOOK_PROFILE` в `lib/`, `bin/cli.js`, `packages/core/settings.json` нашёл лишь meta-запись. Хуки выбирают `${CLAUDE_HOOK_PROFILE:-standard}` (`packages/core/hooks/lib/profile.sh:23`) и meta не читают. Поэтому `--profile=fast`/`strict` само по себе оставляет standard. Минимальное исправление: сохранять выбранный профиль в поддерживаемом settings.env `CLAUDE_HOOK_PROFILE`, сохраняя существующие env при merge; либо убрать неработающее обещание/опцию.

### B05 — Specialist follow-up не имеет caller-контракта

[WARNING / HIGH] `packages/stack-agents/go/go-reviewer.md:139` — агент запрещает себе dispatch и возвращает `Specialist follow-up` (`:166`), но `/dev`, `/review`, `/audit` не читают эту строку. Глобальный поиск `Specialist follow-up|go-error-reviewer|go-concurrency-reviewer|go-performance-reviewer|go-modernizer|go-observability-reviewer` в `packages/core/commands`, `packages/core/skills`, `packages/core/CLAUDE.md` не дал совпадений. `/dev` явно исполняет только UI `Specialist routing` (`packages/core/commands/dev.md:219`); `/review` dispatches статическую таблицу (`packages/core/commands/review.md:56–90`). Go-specialists доступны для ручного вызова, но детерминированного второго прохода по recommendation нет, а follow-up может исчезнуть из итогового отчёта. Минимальное исправление: caller собирает эти строки, либо dispatches доступного specialist один раз с исходным scope, либо переносит его в Open Questions/coverage с причиной; отсутствие автоматического dispatcher назвать явно. Возможная спонтанная делегация главной моделью это не установленный контракт.

### B06 — /review не связывает выбранный target с diff context

[WARNING / HIGH] `packages/core/commands/review.md:35` — Step 1 определяет способ получения списка файлов для branch/PR/default, но нигде не задаёт `${BASE}`, используемый для stat/hunks. При пустом BASE получается `git diff ...HEAD`: в чистом checkout это сравнение HEAD с HEAD, то есть пустые hunks, хотя `git diff --name-only HEAD~1` перечислил изменённые файлы. PR mode читает только `gh pr diff … --name-only`, а hunks всё равно получает из локального HEAD. Это может дать ложный clean или проверку другого commit. Безопасная git-фикстура подтвердила `EMPTY BASE clean diff lines=0`. Минимальное исправление: явно разрешить и зафиксировать range/commit для каждого режима, получать PR hunks через тот же PR target, передавать base/head в REVIEW_CONTEXT и reviewers; отдельно определить, включается ли dirty working tree. Уточнение исходного пункта: понятие «Diff base» в команде есть, отсутствует его обязательное присваивание и согласованный payload.

### B07 — go-reviewer не сообщает побочные записи Go-команд

[WARNING / HIGH] `packages/stack-agents/go/go-reviewer.md:15` — разрешены `go doc/list/vet` при обещании read-only, но нет снимка/хеша до и после и нет `Side effects` в output contract (`:141–166`). Эти команды могут обновлять workspace checksums; офлайн-префикс не запрещает локальные записи. В тех же shipped specialists это прямо признано (`go-error-reviewer.md:51`, `go-observability-reviewer.md:46`). Минимальное исправление: добавить before/after content checks, включая existing ignored `go.work.sum`, обязательный Side effects и запрет незапрошенного revert; при невозможности проверки — `not checked`, не `none`.

### B08 — общий fingerprint не замечает изменение уже ignored go.work.sum

[WARNING / HIGH] `packages/stack-agents/go/go-error-reviewer.md:51` — `git status --ignored=matching` фиксирует наличие ignored файла, но не его содержание; `git diff HEAD` и `git ls-files -o --exclude-standard` содержание ignored файла исключают. То же касается `go-modernizer.md:24`, `go-performance-reviewer.md:15`; `go-concurrency-reviewer.md:15` даже не включает `--ignored`. Safe fixture переписала только ignored `go.work.sum`: `status_same=True; fingerprint_same=True`. Значит обещанное выявление changed paths не выполнено для уже существующего файла. `go-observability-reviewer.md:46` уже содержит необходимый отдельный `git hash-object <path>`. Минимальное исправление: перенести этот exact content-check на существующий workspace sum в остальные контракты и отдельно учитывать absent→present. Одно добавление `--ignored` недостаточно.

### B09 — GOPROXY=off не является абсолютным запретом module download

[WARNING / HIGH] `packages/stack-agents/go/go-reviewer.md:15` — утверждение, что `GOTOOLCHAIN=local GOPROXY=off` «cannot download … module», неверно при совпадающем `GONOPROXY` (по умолчанию из `GOPRIVATE`). [Go Modules Reference](https://go.dev/ref/mod#private-module-proxy-auth) / [Privacy](https://go.dev/ref/mod#private-module-privacy) описывает direct fetch независимо от GOPROXY. Дополнительно проверен установленный Go 1.26.4: `/opt/homebrew/opt/go/libexec/src/cmd/go/internal/modfetch/proxy.go:63–65` добавляет `noproxy` перед `off`, а `repo.go:261–264` вызывает `lookupDirect`. То же обещание/префикс повторено в Go-specialists и нескольких core reviewers. Реальные сетевые запросы не выполнялись. Минимальное исправление: для запрета module download перекрывать `GONOPROXY=none` вместе с `GOPROXY=off`, учитывать checksum/database/config пути отдельно; где требуется строгий запрет любой сети, применять сетевую изоляцию или читать уже установленный source вместо запуска resolver. Не называть одни env-переменные доказательством полной изоляции.

### B10 — no-install агенты допускают автозагрузку Rust toolchain

[WARNING / HIGH] `packages/core/agents/pre-deploy-validator.md:36` — при запрете installs (`:18`) предлагается plain `cargo check/clippy/test`, без `RUSTUP_AUTO_INSTALL=0` и offline. `--locked` запрещает изменение lock, но не загрузку toolchain/deps. Аналогичные пропуски: `health-checker.md:44–53` (также Go без `GOTOOLCHAIN=local GOPROXY=off`), `scaffold-endpoint.md:58` (`cargo check --offline` блокирует Cargo dependency network, но rustup запускается раньше), `ai-slop-cleaner.md:71`; test-generator не задаёт Go/Rust wrappers в Command Policy (`:29–32`). [Rustup environment variables](https://rust-lang.github.io/rustup/environment-variables.html) подтверждает auto-install по умолчанию и отключение через `RUSTUP_AUTO_INSTALL=0`; [Go Toolchains](https://go.dev/doc/toolchain) — автоматическую смену/загрузку Go. Минимальное исправление: общий обязательный command policy для проверок без установки; Rust `RUSTUP_AUTO_INSTALL=0 cargo … --offline` плюс `--locked` только при tracked lock, Go с корректным запретом resolver download; отсутствие toolchain/deps → честный NOT RUN/UNVERIFIED. Это не запрещает намеренно сетевые advisory/freshness проверки, явно разрешённые отдельно.

### B11 — diagnostic шаблоны всё ещё используют скачивающий npx

[WARNING / HIGH] `packages/core/commands/lint.md:42` — `npx eslint`, `npx prettier` (`:44`, `:80–81`) могут разрешить и загрузить отсутствующий package вместо unavailable. GAN generator/evaluator запрещают installs, но fallback `npx playwright test` остаётся (`packages/gan/agents/gan-generator.md:22,89`, `gan-evaluator.md:17,40`; planner выдаёт его в `gan-planner.md:136`). Аналогичный пример новых команд: `packages/core/skills/writing-commands/SKILL.md:158`. [npm npx reference](https://docs.npmjs.com/cli/v11/commands/npx/) документирует исполнение local или remote package. Минимальное исправление: диагностические local-only вызовы `npx --no -- <bin> …` либо проверенный package script, отказ с unavailable при отсутствии; `--` оставить для однозначной передачи flags. Намеренные установки в setup/migration/security-scan не приравнивались автоматически к дефекту без запрета установки.

### B12 — /lint без --fix уже форматирует файлы

[WARNING / HIGH] `packages/core/commands/lint.md:77` — при `fix=false` команда всё равно запускает Format Command; таблица содержит `gofmt -w .`, `prettier --write`, `ruff format`, `black .`, `cargo fmt` (`:40–49`). Это противоречит описанию опционального `--fix` и даёт незапрошенные правки при обычном `/lint`. Минимальное исправление: для default использовать check/list варианты (`gofmt -l`, prettier `--check`, `ruff format --check`, `black --check`, `cargo fmt --check`), write-варианты только с --fix; make fmt также не запускать в default без проверки.

### B13 — удалять loop shadow по версии toolchain недостаточно

[WARNING / HIGH] `packages/stack-agents/go/references/modernize-guide.md:249–251` — рецепт предлагает удалить `item := item`, поскольку новые loop semantics «automatic with Go 1.22+ toolchain». Они определяются language version пакета (go directive/соответствующее per-file constraint), а не только версией compiler. На новом toolchain модуль с `go 1.21` сохраняет старую семантику и capture race после удаления shadow. [Официальный LoopvarExperiment](https://go.dev/wiki/LoopvarExperiment) прямо описывает совместимость. Минимальное исправление: gate на governing module/file language version и вид объявления переменной; сама версия установленного go недостаточна. Основной `go-modernizer` уже строже; reference должен ему соответствовать.

### B14 — errors.As=true не гарантирует non-nil target

[WARNING / HIGH] `packages/stack-agents/go/references/error-inspection.md:266–277` — предлагается удалить nil-check и разыменовать `verr.Field`, поскольку target якобы guaranteed non-nil. В `error` может лежать typed nil `*ValidationError`: As успешно присвоит nil pointer. Изолированный stdlib probe Go 1.26.4 дал `As=true target_nil=true error_interface_nil=false`. [errors.As contract](https://pkg.go.dev/errors#As) гарантирует matching/assignment, а не non-nil concrete pointer. Минимальное исправление: не объявлять nil guard избыточным без доказанного non-nil invariant; учитывать producer typed nil/custom As.

### B15 — errors.Unwrap не возвращает первую ветвь errors.Join

[SUGGESTION / HIGH] `packages/stack-agents/go/references/error-inspection.md:299–301` — комментарий «only gets first» неверен: `errors.Unwrap` для `Unwrap() []error` возвращает nil. Probe: `joined: Unwrap_nil=true Is_EOF=true`; подтверждено `GOTOOLCHAIN=local GOPROXY=off go doc errors.Unwrap`. Сам совет использовать Is верен; неверно его объяснение, которое может породить ошибочный ручной обход. Минимальное исправление: написать «does not unwrap Join at all», tree traversal через Is/As или явно обработанный `Unwrap() []error`.

### B16 — %v не скрывает текст чувствительной ошибки

[WARNING / HIGH] `packages/stack-agents/go/references/error-wrapping.md:164–173` — `%v` предлагается в контексте «don't expose internal error messages to HTTP responses». `%v` разрывает chain, но сохраняет `Error()` в тексте, как и `%w`: probe на фиктивном несекретном error дал `formatting v equals w=true`. Пересылка такого сообщения в HTTP по-прежнему раскрывает внутренние детали. Минимальное исправление: разделить сокрытие inspectable cause и редактирование публичного текста; для ответа использовать фиксированное безопасное сообщение/код, исходную ошибку сохранять только в разрешённой внутренней телеметрии.

### B17 — sorted map keys не заменяют ordered map

[WARNING / HIGH] `packages/stack-agents/go/references/standard-stdlib-now.md:9` — `github.com/elliotchance/orderedmap` заменяется `slices.SortedFunc + maps.Keys`, что сортирует по comparator и теряет insertion order, а также не сохраняет API структуры. [OrderedMap upstream](https://github.com/elliotchance/orderedmap) определяет insertion-order traversal; [maps.Keys](https://pkg.go.dev/maps#Keys) не гарантирует order. Минимальное исправление: ограничить замену случаями, где нужен именно sorted snapshot, либо хранить insertion order отдельно; не рекомендовать механическое удаление dependency.

### B18 — неверное различие pin/range в go.mod

[SUGGESTION / HIGH] `packages/stack-agents/go/references/module-management.md:55–56` — `require … v5.5.0 // indirect` назван «Range», а `v1.0.0` повторно назван range (`:179`). `indirect` обозначает происхождение требования, а не диапазон. Оба require задают minimum required version в MVS, так что и первый пример не является абсолютным pin всего build graph. [Go Modules Reference](https://go.dev/ref/mod#go-mod-file-require) описывает это различие. Минимальное исправление: объяснить direct/indirect отдельно от MVS и reproducible selected graph; убрать несуществующий range-синтаксис.

### B19 — несуществующий go fix -modernize

[SUGGESTION / HIGH] `packages/stack-agents/go/references/stay-updated.md:65` — `go fix -modernize` назван преемником go fix. На Go 1.26 модернизаторы уже входят в `go fix`; такого aggregate флага нет. Локальный `go help fix` показал `go fix [build flags] [-fixtool prog] [fix flags] [packages]`, [официальный modernize package](https://pkg.go.dev/golang.org/x/tools/go/analysis/passes/modernize) даёт `go fix ./...`. Старый gopls/internal command (`:69`) теперь deprecated upstream в пользу `golang.org/x/tools/go/analysis/passes/modernize/cmd/modernize`. Минимальное исправление: указать version-gated актуальные команды; отдельно назвать намеренно изменяющий source запуск, не включать его в read-only reviewer policy.

### B20 — benchmark reference обходит исключения B.Loop

[SUGGESTION / HIGH] `packages/stack-agents/go/references/benchmark-methodology.md:267–270` — отсутствие sink и ResetTimer безусловно объявлено дефектом, хотя `for b.Loop()` уже удерживает значения и сам сбрасывает timer перед loop. `go doc testing.B.Loop` на Go 1.26.4 подтвердил обе гарантии; [testing.B.Loop](https://pkg.go.dev/testing#B.Loop). Это создаёт ложные замечания на современный правильный benchmark. Минимальное исправление: version/shape gate для B.Loop, не требовать redundant sink/ResetTimer.

### B21 — path-scoped UI rules загружаются глобально

[WARNING / HIGH] `packages/frontend-ui/rules/color-and-contrast.md:6` — все семь frontend-ui rules используют `applyWhenPaths` и `alwaysApply`, тогда как Claude Code читает в rule frontmatter только `paths`. По [официальной memory reference](https://code.claude.com/docs/en/memory#rule-frontmatter-reference) неизвестные поля игнорируются; rules без paths загружаются при старте. Поэтому обещанная scope-привязка не работает: UI-рекомендации добавляются и для backend-only задач. Это не полная неработоспособность правил: ошибка именно в условной загрузке. Минимальное исправление: заменить applyWhenPaths на paths, сохранить globs; проверить загрузку на matching/non-matching file через Claude debug, не менять текст правил без отдельной задачи.

## Восемь исходных открытых пунктов — отдельные вердикты

| # | Пункт брифа | Статус | Доказательство / граница |
|---|---|---|---|
| 1 | frontend-ui rules используют applyWhenPaths вместо paths | CONFIRMED | Все семь файлов, например `packages/frontend-ui/rules/color-and-contrast.md:6`. См. B21. |
| 2 | core ui-reviewer вытесняет umbrella в merge | CONFIRMED | B02; воспроизведено реальными copy helpers. Fresh/overwrite имеют другой результат. |
| 3 | updater пропускает frontend-ui/frontend-3d | CONFIRMED | B03; отсутствие relevant roots во всём updater. |
| 4 | Specialist follow-up никто не читает | CONFIRMED | B05 в shipped command/skill caller-контрактах; не утверждается отсутствие произвольной делегации модели. |
| 5 | у Go-specialists нет dispatcher | CONFIRMED | B05; ручной вызов доступен, автоматический follow-up не задан. |
| 6 | у /review нет base ref | CONFIRMED | Уточнение B06: target concept есть, BASE/payload не разрешается согласованно. |
| 7 | go-reviewer не проверяет effects go.work.sum | CONFIRMED | B07; плюс отдельный existing-ignored пробел у ряда specialists B08. |
| 8 | showcase остался allowed-tools | CONFIRMED | Намеренное исключение: 28 из 28 showcase agent frontmatters. По брифу showcase не исправляется; это зарегистрированное исключение, не отдельный дефект. |

## Проверки и компактное воспроизведение

1. Безопасные local fixtures (временные каталоги, затем удалены) использовали реальные `copyDir`/`writeSettings` и git inspection; пользовательский checkout не устанавливался и не очищался. Выводы:

   ```text
   MERGE ui-reviewer: core retained=true; specialist routing=false
   MERGE settings: customSentinel preserved=false; original deny preserved=false
   IGNORED rewrite: status_same=True; fingerprint_same=True
   EMPTY BASE clean diff lines=0
   typed nil: As=true target_nil=true error_interface_nil=false
   joined: Unwrap_nil=true Is_EOF=true
   one unwrap reaches root=false Is reaches root=true
   formatting v equals w=true
   ```

2. `node --test test/utils.test.js test/settings-builder.test.js test/red-blue-auditor.test.js`: первоначально 19 PASS / 2 CANCELLED, потому что global commit signing не смог подписать **временный fixture commit**. После повторного запуска с только process-local `GIT_CONFIG_COUNT=1`, `GIT_CONFIG_KEY_0=commit.gpgsign`, `GIT_CONFIG_VALUE_0=false`: **21 PASS, 0 FAIL, 0 CANCELLED**. Source/config пользователя не изменялись. Проверен и `--extras=red-blue-auditor`: agent, executable scan.sh и patterns устанавливаются. Из этой проверки не следует полная корректность всех merge/update путей.
3. `bash packages/core/hooks/tests/subagent-stop-validate_test.sh`: **28 passed, 0 failed**. Повторный полный npm suite этой частью B не запускался; интеграционный suite части A выполняет координатор.
4. Stdlib probes использовали установленный `go version go1.26.4 darwin/arm64`, временный standalone source и `GOTOOLCHAIN=local GOPROXY=off`; внешние modules не использовались. Ничего не скачивалось. Read-only `go doc`/`go help` выполнялись вне project module в temp.
5. В этой части изменён только этот report; без staging/commit/tag/branch/публикации и без изменения Claude-source. Фикстуры и полный вывод локальных проверок сохранены для текущей сессии в `/private/tmp/superkit-b-*`; это временные вспомогательные материалы, не обязательные долговременные артефакты.

## Покрытие, UNVERIFIED и итоговые счётчики

- **21 подтверждённая находка:** 17 WARNING/HIGH и 4 SUGGESTION/HIGH; CRITICAL не заявлялись. Восемь исходных пунктов проверены индивидуально: 8 CONFIRMED (один — намеренное showcase-исключение), 0 REFUTED, 0 UNVERIFIED. Общий report verdict: **WARN**; это не clean-оценка всего пакета.
- Проверены категории всего брифа: facts/Go references, callers/output/hooks, tools, no-download commands, installer CLI/extras/merge/updater. Полностью прочитаны `bin/cli.js`, `lib/installer.js`, `lib/utils.js`, `lib/settings-builder.js`, updater и SubagentStop validator; прочитаны caller-контракты `/dev`, `/review`, `/audit`, `/test`, `/lint`, затронутые agent policies/output и названные reference-фрагменты.
- **UNVERIFIED:** live firing/вывод в установленном Claude Code; реальная загрузка rules в matching/non-matching проекте; запуски всех 56 моделей/агентов и качество их поведения; сетевой updater fetch/pull/self-bootstrap/pristine lifecycle в consumer-проекте; полная семантическая/компиляционная корректность каждого примера всех 34 Go references и API сторонних библиотек. Статический поиск — покрытие пространства, не доказательство всех фактов. Внешние факты, от которых зависят перечисленные находки, проверены по первичным источникам 2026-11-18; будущий drift возможен.

## Проверено, проблем нет

- `tools:`/командные `allowed-tools:` различаются корректно: все 56 shipped agent frontmatters используют `tools:`, `AskUserQuestion` в них отсутствует; 28 showcase files оставлены по явному исключению брифа. Нельзя объявлять все списки без Bash сломанными: [текущие официальные tools docs](https://code.claude.com/docs/en/tools-reference#glob-tool-behavior) прямо восстанавливают listed Glob/Grep для subagent без Bash. `audit-backend`, `minimal-change-engineer`, `behavioral-nudge-engine`, `gan-planner` явно не требуют самостоятельного shell execution; на этом основании дефект им не приписан. Фактический pool конкретной установленной версии остаётся live-UNVERIFIED.
- `/dev` Phase 12 явно dispatches строки UI umbrella со Status=route и сохраняет `not found locally` в Open Questions (`packages/core/commands/dev.md:219`): исходный UI follow-up контракт существует; B02 мешает получить правильный umbrella именно в merge.
- `test-generator` и `e2e-test-generator` выдают `Generated N tests … — Result: …` и `Execution: … exit …`, соответствующие текущему hook parser. Hook различает severity tag и обычную прозу/счётчики, HIGH confidence не путается с CRITICAL severity; PASS/FAIL без Execution и NOT RUN предупреждаются; 28 соответствующих fixtures зелёные. Hook advisory, exit 0: гарантия блокирования/достоверности тестов не заявлялась.
- `/audit` различает 12-check PASS/WARN/FAIL и security severities, проверяет суммы/явно сохраняет malformed/skipped reports; основной security-scanner Risk Summary печатает только non-zero severity counts (`packages/core/agents/security-scanner.md:292–293`).
- Installer/CLI принимает `--extras=red-blue-auditor`, кладёт agent в `.claude/agents/`, script и 35 pattern definitions рядом в `.claude/scripts/red-blue-auditor/`; 21-test run проверил CLI install и scanner contract, включая critical-only exit 2 и invalid args exit 4. Не делался вывод о безопасности всех adversarial сценариев scanner.
- Rust reviewer сам запрещает cargo/rustc/компиляцию; dependency-checker уже применяет `RUSTUP_AUTO_INSTALL=0`; silent-failure-hunter Python probe использует `-I -S -B`; Go-modernizer имеет более строгие version gates, чем B13 reference; go-observability-reviewer отдельно хеширует existing go.work.sum. Эти исправленные места не объявлялись повторными дефектами из-за похожих строк в других файлах.
