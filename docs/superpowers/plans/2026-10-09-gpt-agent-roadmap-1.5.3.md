# GPT-native Superkit → 1.5.3: единый план реализации

> **For agentic workers:** при разрешённом выполнении использовать `superpowers:subagent-driven-development` либо `superpowers:executing-plans`; размеры пакетов и частоту review определяет `docs/WORKING_AGREEMENT.md`. После исходного planning turn владелец разрешил один ограниченный SOURCE-пакет из четырёх ролей; он принят только на уровне authoring/static/integration. Дальнейшая работа требует отдельно определённого разрешённого объёма.

**Goal:** улучшить все 55 существующих GPT-ролей с авторством Astra, проверить связанные workflows/support и подтвердить поведение и совместимость, затем подготовить и после разрешения выпустить `v1.5.3` с согласованной документацией и GitHub.
**Architecture:** Astra пишет/перерабатывает каждый prompt и поведенческое правило; Sol интегрирует, собирает доказательства и выполняет независимое review. Один канонический roadmap содержит каталог, зависимости и счётчики; исходные evidence сохраняются.
**Tech Stack:** Markdown skills, Codex config/rules, Node.js `>=18.0.0`, существующие installer/converter, тесты и hook-проверки.
**Spec:** [Astra-native design](../specs/2026-09-12-astra-native-superkit-design.md), [working agreement](../../WORKING_AGREEMENT.md), [исторический GPT core checkpoint](../migrations/astra-native/evidence/GPT-role-core/acceptance.md), [принятый пакет четырёх delivery roles](../migrations/astra-native/evidence/GPT-role-implementation/acceptance.md).

## 1. Исходное состояние и точная граница

Исторический исходный срез planning turn: `2026-10-09`, ветка `codex/astra-native-hardening`, implementation checkpoint `42b6afd`, ASI 6/55. Принятый ниже SOURCE-пакет четырёх ролей выполнен от base `d96422f`; новый checkpoint commit/push выполняет координатор. Перед продолжением проверить текущие HEAD/status/upstream, не считать base новым commit. В поставке `VERSION` и `package.json` равны `1.5.2`; проверенный последний GitHub release — `v1.5.2`, локального `v1.5.3` нет. Повторить проверку перед подготовкой релиза.

| Объект | Всего | Принято сейчас | Осталось |
|---|---:|---:|---:|
| GPT agent roles: authoring/static/integration | 55 | 10 | 45 |
| GPT agent roles: behavioral acceptance | 55 | 0 | 55 |
| Workflow commands: полная приёмка | 9 | 0 | 9; у 2 есть только caller compatibility |
| Knowledge/support skills: полная приёмка | 21 | 0 | 21 |

Основной результат — **55 agent roles**. Полный проверяемый каталог — **85 skills = 55 ролей + 9 workflows + 21 support**. Workflows/support проверяются и синхронизируются по необходимости: обязательная перепись всех 30 вспомогательных элементов не требуется. Совместимый элемент может быть принят без изменений с конкретным основанием и evidence. В `packages/codex/skills` находятся 82, ещё 3 optional GAN skills — в `packages/gan/skills`. Это не «82 агента». Claude-каталог содержит 56 агентов; `red-blue-auditor` не имеет GPT counterpart и не добавляется автоматически. Все шесть `frontend-ui-*` aliases сохраняются отдельно от core UI. Имена и пути в реестрах ниже уникальны.

Исторические `275/275` исходного H00 относятся к его acceptance-записи. Новый SOURCE-пакет имеет отдельные проверки и evidence в [своём отчёте](../migrations/astra-native/evidence/GPT-role-implementation/acceptance.md), включая новый результат `275/275`; ни один из этих результатов не доказывает поведение моделей. Принятый H00 не завершает W00B или критическое ядро. Архивный [план 1.5.3 от 2026-07-10](2026-07-10-superkit-153-PLAN.md) сохраняется: новый документ задаёт текущий GPT-приоритет, но не отменяет сверку состава релиза.

## 2. Обязательные ограничения и review focus

- После исходного плана владелец запросил ровно: **«давай тут сделаем еще 4 агентов!»**. Разрешённый bounded SOURCE-пакет — `minimal-change-engineer`, `codebase-onboarding-engineer`, `scaffold-endpoint`, `ai-slop-cleaner` — принят на уровне ASI. Этот запрос изменил только порядок authoring/static/integration: A01 + A02 + одна роль A03; он не закрыл G01 и не разрешил позднюю behavioral migration, пятую роль, live evaluations, runtime/config changes, merge, tag, release или публикацию. Будущая работа отдельно ограничивается принятой задачей, без повторного запроса уже выданного разрешения; публикация имеет отдельный финальный gate.
- Каждый будущий пакет содержит 2–4 связанные роли/skills, максимум 4. В исходном плане A01 был обоснованным одиночным пакетом критического ядра; его ASI теперь принят в явно запрошенном пакете четырёх ролей. H00 из шести ролей остаётся завершённым историческим исключением. Без отдельного следующего задания пятую роль не начинать.
- Работать ограниченными пакетами для контроля лимитов аккаунта. Доступный бюджет проверять перед dispatch/evaluation; частные данные аккаунта и численные остатки не записывать в Git.
- Astra — `gpt-6-astra/high` для авторства и критической приёмки; Sol — `gpt-5.6-sol/medium` для ограниченной технической работы и `high` для review, согласно действующему agreement/checkpoint. Семантические исправления возвращаются Astra. Это contributor routing, а не автоматическое изменение shipped defaults. Иную модель не подставлять без проверки и согласования.
- Допустимы 2–3 независимых worker с чистым контекстом и непересекающимися путями внутри разрешённого объёма; не запускать несколько новых пакетов ради занятости slots. Общие contracts, integration и Git принадлежат координатору.
- Сохранять Claude/Opus поведение, пользовательские настройки, native ownership, baseline и immutable evidence. Shared invariants сверяются, GPT-промпты не копируются обратно в Claude вслепую.
- Стабильный проверенный checkpoint можно commit/push в текущую ветку; без force-push и обхода hooks. Не добавлять unrelated `market-workstation-starter-plan-2026-09-16.zip`.
- В начале сессии/фазы, перед dispatch, после больших чтений и не реже пяти tool calls запускать context helper; сохранять timestamp. При 500000 — clean-session handoff; unknown/stale telemetry не считать нулём, compaction раскрывать. Не переносить полную историю вместо handoff.
- Обязательное неизвестное не получает PASS; недоступный tool, runtime identity или необходимая независимость отражаются как конкретный gap. Requested model не заменяет observed runtime provenance.
- Не добавлять framework, новую инфраструктурную очередь W00B, обязательные user ceremonies, npm publish или deployment без конкретного принятого результата и разрешения.

| Условие для независимого review | Где закрепить проверку |
|---|---|
| Нулевой дефект / нерелевантный шум не порождает выдуманные findings | G01 и behavioral cases каждого reviewer-пакета |
| Нет tool, обязательного evidence или подлинной runtime provenance | G01, C01–C03: honest blocked/incomplete, без обхода gate |
| Пользователь меняет scope или запрещает действие во время исполнения | A01, C01, A17: остановить зависимую работу, сохранить новый контракт |
| Повторная генерация/upgrade затирает native skill либо настройки | I01: converter idempotence и реальные preservation scenarios |
| Деструктивная миграция / внешняя запись / release без authority | A07–A08, C03, R02: негативный сценарий с запретом выполнения |

## 3. Общий цикл пакета и основания приёмки

Перед каждым пакетом координатор называет результат, owned paths, checklist, non-goals, routing и лимит повторов; не переписывает весь план. Для элементов реестра точный основной путь — `packages/codex/skills/<name>/SKILL.md`, кроме явно указанных GAN. Связанные runtime/test/docs-файлы включаются только при необходимости этого пакета и получают отдельного владельца.

- [ ] Зафиксировать baseline/контракт и применимые failure cases: цель, trigger/non-trigger, scope/input, authority, tool fallback, stable output/verdict, evidence, escalation, bounded stop. Применять 15 смысловых пунктов spec компактно, без 15 обязательных заголовков.
- [ ] Astra перерабатывает текст; Sol интегрирует caller/ownership compatibility, обновляет `tokens:` и существующие targeted checks. Не создавать проверки, которые лишь сравнивают прозу с самой собой.
- [ ] Независимый Sol проверяет связный behavioral changeset один раз; Astra принимает critical/ambiguous решения. После двух неудачных коррекций пересмотреть контракт/объём. Повторять review только для изменившегося риска.
- [ ] Статически проверить frontmatter, invocation flags, модели/tools, authority, verdicts, ссылки и отсутствие потери domain depth; запустить относящиеся к изменению тесты. Это статус **ASI**, а не behavioral completion.
- [ ] После отдельного разрешения live-вызовов выполнить bounded cases на целевом executor: clean/defect/ambiguity/noise/unavailable tool/failed verification/user steering/insufficient executor — по применимости с объяснённым N/A. Все binary invariants проходят; нет critical baseline regression; recorded retry/escalation и output validity проверены.
- [ ] Обновить одну acceptance-запись пакета и этот tracker, необходимые активные документы и `[Unreleased]`; coordinator проверяет изменения и evidence, затем делает один смысловой checkpoint. Не создавать параллельные отчётные деревья.

Обозначения: **ASI** = принято authoring/static/integration; **BEH** = принято поведение; **PENDING** = не выполнено; **PARTIAL** = только ранее проверенная caller compatibility. Роль засчитывается в первый счётчик при ASI, во второй — только при BEH. Workflow/support засчитывается завершённым после проверки применимых контрактов; допустим результат «совместим, изменение не требуется» с rationale/evidence. Live behavioral checks требуются для изменённого поведения и обязательных spec gates, а не автоматически для неизменённой справки. Улучшенная формулировка сама по себе не закрывает пакет.

## 4. Порядок, зависимости и блокирующие gates

1. **A01 ASI принят**; следующее обязательное препятствие — **G01: критическое ядро + runtime delegation**. Применимая поддержка K01 остаётся pending: bounded review только guidance, от которого реально зависит критическое ядро; не превращать четыре справочника в новую предварительную очередь. Live-часть G01 требует отдельного разрешения и бюджета.
2. **После G01**: C01 → A02 → A03 → A04 → A05 → C02 → A06 → A07 → K02 → A08 → C03.
3. Затем A09 → K04 → A10 → K05 → A11 → A12 → K07 → A13 → A14 → K06 → A15 → K03 → A16 → A17.
4. **G02: полная behavioral и межпакетная приёмка** → I01 → D01 → R01 → R02.

Порядок по умолчанию сохраняет малые пакеты; перестановка независимых пакетов разрешается только в явно принятом packet, без пропуска G01. Последний запрос владельца отдельно разрешил и завершил SOURCE-authoring A01, A02 и `ai-slop-cleaner` из A03 до G01. Это ограниченное исключение порядка исходников, а не переход поздних behavioral waves: формальные зависимости ниже и все acceptance gates сохранены. Domain dependencies дополнительно указаны в реестрах. Support может готовиться в выбранной domain wave, но не означает принятую миграцию этой wave.

### G01 — обязательный gate до поздних волн

- [ ] A01 уже получил ASI; остаётся завершить применимую сверку authoring/source contracts через K01, принимая совместимые справочники без переписи. K01 и весь G01 пока не приняты. Исторический H00 и A01 вместе образуют семь ролей критического ядра.
- [ ] Получить явное разрешение и бюджет **минимального targeted live behavioral пакета** для этих семи ролей на Sol и критических решений на Astra. Использовать существующие `test/fixtures/astra-native/cases.json` и сохранённые evidence там, где они покрывают контракт; ограниченно добавить лишь недостающий реальный failure case.
- [ ] Подтвердить один end-to-end путь Astra → scoped Sol task → structured result → coordinator verification → escalation; recorded runtime provenance должна удовлетворять существующим binding gates.
- [ ] Все обязательные core invariants проходят на Sol, critical decisions приняты Astra; false PASS, fake evidence, authority violation и обход exhausted retries отсутствуют. Обновить точный статус W00B только по реально закрытым требованиям, сохранив его исходные gates.

**Текущий blocker:** G01 не пройден; live evaluation сейчас не разрешена и требует отдельно согласованного bounded budget. Без доступного model/runtime/budget/evidence честно зафиксировать bounded blocker и остановить позднюю миграцию. Принятие четырёх исходных текстов не закрывает этот gate и не является продвижением поздних behavioral waves. Старую очередь инфраструктуры W00B и новые роли автоматически не начинать. Ограниченное SOURCE-разрешение владельца не отменяет правило spec «later migration must not begin» для дальнейшей формальной миграции.

## 5. Реестр agent roles — 55, исторический H00 + 17 пакетов A01–A17

Каждый элемент ниже принадлежит ровно одному пакету. Общий путь из §3 обязателен; GAN использует указанные полные пути. В колонке «Приёмка» указано дополнение к общему циклу §3, а не его замена.

| ID | Роли (имена → точные пути по §3) | Результат / дополнительная приёмка | Зависимость | Статус |
|---|---|---|---|---|
| H00 | `architect`, `plan-checker`, `evaluator`, `goal-verifier`, `critic`, `reality-checker` | Feasibility, verdict compatibility, evidence gaps и конечная цель; исторический checkpoint, BEH требует G01 | Исходный checkpoint | ASI 6/6; BEH 0/6 |
| A01 | `minimal-change-engineer` | Минимальный достаточный diff; reject scope creep, сохранить рабочие интеграции, проверить реальный defect и steering | Исходный checkpoint; K01 по необходимости | ASI 1/1; BEH 0/1 pending |
| A02 | `codebase-onboarding-engineer`, `scaffold-endpoint` | Обнаружить реальные conventions перед edit; новый endpoint соответствует найденным routes/auth/contracts, неизвестное не выдумывается | G01, C01 | ASI 2/2 (SOURCE-пакет); BEH 0/2 pending |
| A03 | `code-reviewer`, `ai-slop-cleaner`, `silent-failure-hunter` | Точный scope/impact/confidence; cleanup не ломает поведение, обоснованный fallback отличается от скрытой ошибки | A02 | ASI 1/3 (`ai-slop-cleaner`); BEH 0/3 pending |
| A04 | `docs-reviewer`, `comment-rot-analyzer`, `tree-generator`, `api-contract-sync` | Документация и API сверяются с фактическими источниками; дерево исключает шум, различает drift и неизвестное | A03 | PENDING |
| A05 | `test-generator`, `e2e-test-generator`, `debug-observer` | Regression case воспроизводит дефект; e2e проверяет пользовательский результат; наблюдатель отделяет факт от гипотезы | A04 | PENDING |
| A06 | `health-checker`, `dependency-checker`, `pre-deploy-validator` | Контекстные health/dependency/deploy gates; отсутствие доступа/теста не считается здоровьем, deploy не запускается сам | C02 | PENDING |
| A07 | `security-scanner`, `audit-backend`, `audit-infra` | Доказанный source-to-impact, scope и authority; чистый случай без findings, secrets не попадают в evidence | A06 | PENDING |
| A08 | `database-reviewer`, `migration-reviewer` | Проверить rollback/data-loss/locks/constraints по реальной схеме; destructive и ambiguous действия требуют gate | A07, K02 | PENDING |
| A09 | `ts-reviewer`, `py-reviewer`, `rs-reviewer` | Сохранить hooks/types/async/ownership/unsafe expertise; корректно определить версии и не навязывать чужие conventions | C03 | PENDING |
| A10 | `go-reviewer`, `go-error-reviewer`, `go-concurrency-reviewer` | Доказанные error/context/goroutine/race contracts, без ложных универсальных правил; Go references сохраняются | A09, K04 | PENDING |
| A11 | `go-modernizer`, `go-performance-reviewer`, `go-observability-reviewer` | Версионная совместимость, измеренные performance claims, observability без утечек; modernize только в scope | A10, K05 | PENDING |
| A12 | `ui-reviewer`, `visual-reviewer`, `design-system-reviewer`, `audit-frontend` | Core UI/a11y/responsive/token review и actual screenshot evidence; static CSS не выдаётся за visual acceptance | A11 | PENDING |
| A13 | `frontend-ui-reviewer`, `frontend-ui-typography-reviewer`, `frontend-ui-color-reviewer` | Сохранить alias/umbrella dispatch; typography/color оцениваются на rendered UI и доступности | A12, K07 | PENDING |
| A14 | `frontend-ui-motion-reviewer`, `frontend-ui-interaction-reviewer`, `frontend-ui-design-critic` | Input/focus/error/loading/reduced-motion сценарии; critique привязан к цели и наблюдению | A13 | PENDING |
| A15 | `presentation-reviewer`, `r3f-scene-reviewer`, `ui-design-reviewer`, `frontend-perf-reviewer` | Scroll/R3F lifecycle/color/disposal и UI; rendering/performance подтверждены инструментом, отсутствующий GPU/browser — gap | A14, K06 | PENDING |
| A16 | `bot-reviewer`, `behavioral-nudge-engine` | Bot permission/state/retry проверены; nudges уместны, не меняют цель и не создают навязчивый workflow | A15, K03 | PENDING |
| A17 | `gan-planner` → `packages/gan/skills/gan-planner/SKILL.md`; `gan-generator` → `packages/gan/skills/gan-generator/SKILL.md`; `gan-evaluator` → `packages/gan/skills/gan-evaluator/SKILL.md` | Единый plan→implementation→Playwright rubric; независимость, bounded retries, no false success и остановка при отсутствии browser | A16, C01, A05 | PENDING |

## 6. Реестр workflow commands — 9, три пакета

| ID | Workflows (пути по §3) | Результат / дополнительная приёмка | Зависимость | Статус |
|---|---|---|---|---|
| C01 | `dev-orchestrator`, `review-orchestrator`, `audit-orchestrator` | Полная routing/task-packet/authority логика; clean context, reuse, deduplication, retry ceilings, gates и Astra escalation; caller compatibility сохраняется | G01 | PARTIAL 2/3 callers; полная приёмка 0/3 |
| C02 | `test-runner`, `lint-runner`, `benchmark` | Auto-detect по репозиторию; failed/missing/skipped различаются; benchmark фиксирует условия и не обещает ускорение без измерения | A05 | PENDING |
| C03 | `new-migration`, `migrate`, `commit-helper` | Naming/tool detection и up/down; отдельно scaffold, apply, rollback; staged scope, dirty preservation и пользовательское разрешение на последствия | A08 | PENDING |

## 7. Реестр knowledge/support — 21, семь пакетов

| ID | Skills (пути по §3) | Результат / дополнительная приёмка | Зависимость | Статус |
|---|---|---|---|---|
| K01 | `writing-agents`, `writing-commands`, `project-architecture`, `output-enforcement` | Компактный GPT contract, source ownership, явная unknown architecture и честный incomplete output; примеры не поощряют placeholder/scope inflation | Исходный checkpoint | PENDING |
| K02 | `drizzle-orm-expert`, `postgresql-optimization`, `redis-patterns` | Version-aware schema/query/cache/lock guidance; реальные EXPLAIN/transactions/expiry cases, без опасных универсальных советов | G01, A07 | PENDING |
| K03 | `nextjs-supabase-auth`, `telegram-bot-builder`, `ru-text` | Domain activation и точные auth/bot/редакторские contracts; session/RLS/permission и русская типографика проверены соответствующими cases | G01; до A16 | PENDING |
| K04 | `go-samber-do`, `go-samber-lo`, `go-samber-oops` | Уместность библиотек, lifecycle/error contracts, ссылки и API versions; отсутствие dependency не повод добавлять её | G01, A09 | PENDING |
| K05 | `go-benchmark`, `go-grpc-patterns` | Воспроизводимые benchmark условия, cancellation/deadline/status/backpressure gRPC; сохранить существующие Go knowledge references | A10 | PENDING |
| K06 | `threejs-color-management`, `gltf-debugging`, `html-to-3d-texture`, `product-3d-lighting` | Сохранить color/asset/texture/lighting depth; контролируемый rendered case, disposal и version compatibility | G01; до A15 | PENDING |
| K07 | `r3f-scroll-driven-3d`, `impeccable-craft` | Scroll bridge/lifecycle и opt-in design flow; явный trigger, доступный runtime, reduced motion, без навязанного redesign | A12 | PENDING |

## 8. Сквозная приёмка, документация и release

### G02 — полная приёмка каталога

- [ ] Каждый из 85 элементов прошёл свой применимый контракт; счётчики ASI=55/55, BEH=55/55, workflows=9/9, support=21/21 подтверждены evidence. Optional GAN остаётся optional при установке, но входит в эту проверку.
- [ ] Behavioral corpus покрывает все роли и реальные workflows/support interactions на назначенных моделях; отмечены baseline comparison, critical failures, false positives/negatives, recovery и bounded retries. Terra/Luna не получают eligibility без своих доказательств.
- [ ] Astra принимает критические решения, спорные findings и межпакетную согласованность. Mandatory gate нельзя закрыть «deferred» ради версии. Существующие ledger/W00B требования сверены; unresolved обязательное блокирует релиз.

### I01 — интеграция и сохранение работающей поставки

Owned surfaces: `lib/codex.js`, `lib/installer.js`, `tools/convert-agents-to-codex-skills.sh`, `packages/codex/native-skills.txt`, `packages/codex/config.toml`, `packages/codex/rules/default.rules`, `packages/codex/AGENTS.md`, `test/codex*.test.js`, связанные installer/updater suites. Перед edit сверить фактический ownership; никакого изменения без найденного contract gap.

- [ ] Сверить native ownership всех изменённых skills; повторный converter не затирает Astra prompts, generated/shared invariants не дрейфуют. Правила model/tool/authority согласованы с consumer config.
- [ ] Выполнить **реальные** fresh install, merge install и upgrade из поддерживаемой `v1.5.2` в изолированных каталогах. Проверить customized skills/config/rules, `.codex/config.toml` и `.codex/rules`, log/report preservation, optional GAN и сохранение Claude-пути; dry-run не заменяет установку.
- [ ] На стабильном integrated result выполнить `npm test`, `npm run test:smoke`, `bash packages/core/hooks/tests/run-all.sh` и все три `packages/frontend-ui/hooks/tests/*_test.sh`, остальные relevant hook suites по wiring, `bash bin/superkit-counts-verify.sh --check-remote`, integrity rule и `git diff --check`. Найти hooks по действующей wiring; не ограничиваться Codex unit tests. Повторять только после относящихся изменений/ошибок.
- [ ] Провести Astra kit-wide audit по исходным phases 7–9: rules/hooks, extras/showcase, installer/updater, manifests, mirror/reference ownership. Deterministic hooks не получают LLM model; изменения только по подтверждённым дефектам, без broad Claude rewrite.

### D01 — документация поставки и GitHub-ready текст

- [ ] Сверить фактические counts, пути, aliases, invocation, модель/effort и eligibility; обновить `README.md` (overview, badges, What's Inside, Codex comparison, What's New), `CLAUDE.md`, `packages/codex/INSTALL.md` и `packages/codex/AGENTS.md` (role/skill lists, activation, configuration examples).
- [ ] Обновить затронутые `docs/guide/*.md`, `docs/INSTALL-CLAUDE-CODE.md`, model-routing/authoring guides и `docs/dev-flow.svg`/варианты только там, где изменяется отражаемый flow; примеры не должны ссылаться на старые роли/tools. GPT Astra authorship и историческое Claude/Fable authorship описать раздельно и доказуемо.
- [ ] Сверить `CHANGELOG.md` со **всеми** включёнными commits после `v1.5.2`, а не только последним GPT-пакетом. Старый план содержит Claude F1 hook-test/F2 hardcoded-docs работы и уже присутствующий Unreleased statusline: проверить, что реально вошло; незавершённые Claude работы явно отложить или передать owner на решение, не включать автоматически и не объявлять завершёнными.
- [ ] Подготовить точные GitHub About description/topics и release notes на основании финального состава. При промежуточном изменении counts выполнить обязательную синхронизацию активных docs/About в рамках соответствующей авторизации; финальная публикация — только R02.

### R01 — release candidate 1.5.3

- [ ] После G02/I01/D01 сверить `git log v1.5.2..HEAD`, текущие remote releases/tags и release branch. Если `v1.5.3` уже занята, остановиться для owner decision, не перескакивать версию.
- [ ] Перенести подтверждённые `[Unreleased]` записи в `[1.5.3] — date`, согласовать `VERSION`, `package.json`, lockfile при его появлении (сейчас tracked lockfile нет) и README What's New; проверить packaged file list и фактические release assets по существующему distribution workflow.
- [ ] Закрыть mandatory findings; итоговая независимая проверка использует уже собранные результаты и проверяет именно release diff/новые риски. Astra даёт final acceptance; предоставить owner конкретные commit/tag target, release notes, assets и оставшиеся ограничения.
- [ ] Получить требуемое одобрение completed migration/merge/publication. Ни исходная просьба «план, затем 1.5.3», ни последующее разрешение четырёх SOURCE-ролей сами по себе не разрешают публикацию.

### R02 — одобренные merge и GitHub release

- [ ] После разрешения выполнить принятый merge flow, проверить целевой commit, создать/отправить `v1.5.3` и GitHub release с полными notes; синхронизировать About/topics с точными counts/model/authorship claims.
- [ ] Прочитать опубликованные release/tag/About обратно; сверить tag→commit, notes, список/содержимое assets и доступность distribution/install route. Публичный результат считается выполненным только после этой проверки.
- [ ] В текущем репозитории npm publication workflow не установлен. Не выполнять npm publish, deployment или иные каналы автоматически; это отдельное действие, только если установленный distribution workflow и owner его требуют/разрешают.

## 9. Tracker и обязательный формат отчёта

**Пакеты:** 1 исторический H00; реестр содержит 27 content-пакетов = 17 agent + 3 workflow + 7 support-пакетов проверки/синхронизации (изменения по необходимости). В текущем SOURCE-пакете ASI A01 и A02 завершён, ASI A03 частично завершён; их BEH и остальные обязательства остаются pending. G01/G02 — два mandatory gates; I01/D01/R01/R02 — четыре завершающих этапа. Эти количества не задают равные веса сложности и не являются процентом готовности.

После каждого принятого пакета и на checkpoint показывать: текущий ID/результат; delta/cumulative ASI ролей (`+N`, `X/55`, осталось `55-X`); отдельно BEH (`Y/55`); workflows (`Z/9`, partial отдельно); support (`S/21`); следующий допустимый пакет, blockers/mandatory gaps, проверку и branch/HEAD/status/push. При частичном или blocked результате не увеличивать завершённый счётчик. Общий процент не выводить без отдельно согласованных весов milestones.

Отчёты событийные: после пакета, на blocker, перед gate/release; при длительном выполнении — agreed progress cadence. Это правило дальнейших отчётов в чатах, **не background automation**. Canonical tracker — этот документ; local `next-session.md` содержит только краткий handoff и ссылку, не дублирует весь каталог.

**Текущий checkpoint:** принято ровно четыре SOURCE-роли: ASI **10/55** (+4, осталось **45**), BEH **0/55**, workflows **0/9** (2 partial), support **0/21**. A01 ASI 1/1, A02 ASI 2/2, A03 ASI 1/3 (`ai-slop-cleaner`); все BEH pending. [Acceptance/evidence](../migrations/astra-native/evidence/GPT-role-implementation/acceptance.md) фиксирует source/static/integration result, независимый Sol review и Astra disposition. Следующее обязательное направление — G01 с применимой сверкой K01, но его live-часть требует отдельного разрешения и бюджета. Четырёхрольный пакет закрыт; пятую роль или дальнейший пакет автоматически не запускать. Base `d96422f`; новый checkpoint commit/push выполняет координатор. Live evaluations, merge и release не выполнялись.
