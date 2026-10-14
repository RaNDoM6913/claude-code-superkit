# GPT-native Superkit → 1.5.3: единый план реализации

> **For agentic workers:** все55 SOURCE-ролей A01–A17/H00 завершены, ASI55/55; не повторять. GPT-only доработка и подготовка релиза продолжаются с полным Astra authoring → Sol integration/review → Astra acceptance. K01 SOURCE4/4 и отдельный plan-checker case/oracle приняты на SOURCE уровне; текущий пакет заканчивается проверенным checkpoint. Они не означают BEH/fullsupport/G01 или release readiness; live budget, behavioral gates и публикация остаются отдельными обязательствами.

**Goal:** улучшить все 55 существующих GPT-ролей с авторством Astra, проверить связанные workflows/support и подтвердить поведение и совместимость, затем подготовить и после разрешения выпустить `v1.5.3` с согласованной документацией и GitHub.
**Architecture:** Astra пишет/перерабатывает каждый prompt и поведенческое правило; Sol интегрирует, собирает доказательства и выполняет независимое review. Один канонический roadmap содержит каталог, зависимости и счётчики; исходные evidence сохраняются.
**Tech Stack:** Markdown skills, Codex config/rules, Node.js `>=18.0.0`, существующие installer/converter, тесты и hook-проверки.
**Spec:** [Astra-native design](../specs/2026-09-12-astra-native-superkit-design.md), [working agreement](../../WORKING_AGREEMENT.md), [исторический GPT core checkpoint](../migrations/astra-native/evidence/GPT-role-core/acceptance.md), [принятый пакет четырёх delivery roles](../migrations/astra-native/evidence/GPT-role-implementation/acceptance.md), [предыдущие десять SOURCE-ролей: P1–P3](../migrations/astra-native/evidence/GPT-ten-roles-2026-10-11/acceptance.md), [текущие десять SOURCE-ролей: B1–B3](../migrations/astra-native/evidence/GPT-next-ten-roles-2026-10-11/acceptance.md).

## 1. Исходное состояние и точная граница

Исторический исходный срез planning turn: `2026-10-09`, ветка `codex/astra-native-hardening`, implementation checkpoint `42b6afd`, ASI 6/55. Предыдущий SOURCE-пакет четырёх ролей выполнен от base `d96422f` и принят в checkpoint `0702b22` (ASI 10/55). Предыдущий запрос десяти ролей начат от `0702b22`; P1 опубликован в `be59e86` (ASI 14/55), P2 — в `2959dc7` (ASI 17/55), P3 — в `a791e4c` (ASI 20/55). Текущий запрос B1–B3 начат от `a791e4c`; B1 опубликован в `4ed2449`, B2 — в `8a70646`; финальный checkpoint B3 выполняет координатор. Перед продолжением проверить текущие HEAD/status/upstream, не считать base новым commit. В поставке `VERSION` и `package.json` равны `1.5.2`; проверенный последний GitHub release — `v1.5.2`, локального `v1.5.3` нет. Повторить проверку перед подготовкой релиза.

| Объект | Всего | Принято сейчас | Осталось |
|---|---:|---:|---:|
| GPT agent roles: authoring/static/integration | 55 | 55 | 0 |
| GPT agent roles: behavioral acceptance | 55 | 0 | 55 |
| Workflow commands: полная приёмка | 9 | 0 | 9; у 3 есть только caller compatibility |
| Knowledge/support skills: полная приёмка | 21 | 0 | 21 |

Основной результат — **55 agent roles**. Полный проверяемый каталог — **85 skills = 55 ролей + 9 workflows + 21 support**. Workflows/support проверяются и синхронизируются по необходимости: обязательная перепись всех 30 вспомогательных элементов не требуется. Совместимый элемент может быть принят без изменений с конкретным основанием и evidence. В `packages/codex/skills` находятся 82, ещё 3 optional GAN skills — в `packages/gan/skills`. Это не «82 агента». Claude-каталог содержит 56 агентов; `red-blue-auditor` не имеет GPT counterpart и не добавляется автоматически. Все шесть `frontend-ui-*` aliases сохраняются отдельно от core UI. Имена и пути в реестрах ниже уникальны.

Исторические `275/275` исходного H00 относятся к его acceptance-записи. Предыдущие четыре delivery roles имеют отдельные проверки в [своём отчёте](../migrations/astra-native/evidence/GPT-role-implementation/acceptance.md). P1–P3 имеют отдельные результаты `275/275`, focused assets `9/9`, native preservation `2/2` и final Astra SOURCE acceptance в [отчёте 2026-10-11](../migrations/astra-native/evidence/GPT-ten-roles-2026-10-11/acceptance.md). Независимые Sol review P1 и P3 завершены без findings; в P2 замечание к безопасному чтению non-secret config исправлено и принято. B1 следующего запроса отдельно прошёл `275/275` без failures/skips, native preservation `2/2`, metadata/normalized-stock `4/4`, counts/diff checks, полный независимый Sol review без material findings и final Astra SOURCE acceptance; [его evidence](../migrations/astra-native/evidence/GPT-next-ten-roles-2026-10-11/acceptance.md). Эти результаты не доказывают поведение моделей. Принятый H00 не завершает W00B или критическое ядро. Архивный [план 1.5.3 от 2026-07-10](2026-07-10-superkit-153-PLAN.md) сохраняется: новый документ задаёт текущий GPT-приоритет, но не отменяет сверку состава релиза.

## 2. Обязательные ограничения и review focus

- Текущий запрос 2026-10-14 разрешает продолжить **только GPT** доработку и после неё подготовить релиз; всю семантику полноценно дорабатывает Astra. Sol выполняет техническую интеграцию и независимую проверку. Начат небольшой SOURCE-пакет двух подтверждённых пробелов K01: `project-architecture` и `output-enforcement`. Сохраняется граница небольшого примерно 15-минутного пакета с остановкой/отчётом. Подготовка релиза не является разрешением на merge/tag/publication; для targeted live evaluation по G01 остаются необходимы отдельный конкретный объём и бюджет. Claude-prompts и их доработка находятся вне текущего scope.

- После исходного плана владелец запросил ровно: **«давай тут сделаем еще 4 агентов!»**. Разрешённый bounded SOURCE-пакет — `minimal-change-engineer`, `codebase-onboarding-engineer`, `scaffold-endpoint`, `ai-slop-cleaner` — принят на уровне ASI. Этот запрос изменил только порядок authoring/static/integration: A01 + A02 + одна роль A03; он не закрыл G01 и не разрешил позднюю behavioral migration, пятую роль, live evaluations, runtime/config changes, merge, tag, release или публикацию. Будущая работа отдельно ограничивается принятой задачей, без повторного запроса уже выданного разрешения; публикация имеет отдельный финальный gate.
- Запрос 2026-10-11 разрешил ещё десять SOURCE-ролей: P1 — `code-reviewer`, `silent-failure-hunter`, `docs-reviewer`, `comment-rot-analyzer`; P2 — `api-contract-sync`, `tree-generator`, `debug-observer`; P3 — `test-generator`, `e2e-test-generator`, `health-checker`. Все десять P1–P3 приняты на уровне ASI в `a791e4c`; этот исторический запрос завершён. G01, live evaluations, formal behavioral promotion, merge и release им не разрешены. Последующий запрос отдельно разрешил B1–B3 ниже.
- Последующий запрос 2026-10-11: следующие десять выполнять **здесь, в Codex**, не через OrchKit. B1 — `dependency-checker`, `security-scanner`, `audit-infra` — принят; B2 — `audit-backend`, `database-reviewer`, `migration-reviewer`; B3 — `pre-deploy-validator`, `ts-reviewer`, `py-reviewer`, `rs-reviewer` — все десять B1–B3 приняты на уровне ASI. Семиролевой OrchKit prompt только подготовлен, не выполнялся. B1 включает лишь узкую совместимость `audit-orchestrator` без новой selection/routing; workflows остаются 0/9. После B3 остановиться.
- Каждый будущий пакет содержит 2–4 связанные роли/skills, максимум 4. В исходном плане A01 был обоснованным одиночным пакетом критического ядра; его ASI принят в предыдущем пакете четырёх ролей. H00 из шести ролей остаётся завершённым историческим исключением. P1–P3 исполнены как 4 + 3 + 3; текущие B1–B3 исполняются как 3 + 3 + 4 с отдельной SOURCE-приёмкой каждого пакета.
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

Новый запрос 2026-10-12 разрешает следующие десять по порядку: A10 (`go-reviewer`, `go-error-reviewer`, `go-concurrency-reviewer`), A11 (`go-modernizer`, `go-performance-reviewer`, `go-observability-reviewer`), A12 (`ui-reviewer`, `visual-reviewer`, `design-system-reviewer`, `audit-frontend`). Цель ASI40/55; BEH не меняется. [Текущее evidence](../migrations/astra-native/evidence/GPT-next-ten-roles-2026-10-12/acceptance.md).

Новый запрос 2026-10-13: ещё десять A13 → A14 → A15, цель ASI50/55; BEH не меняется. [Текущее evidence](../migrations/astra-native/evidence/GPT-next-ten-roles-2026-10-13/acceptance.md). Узкое согласование каталогов/callers при доказанной необходимости не означает полную приёмку workflow.

Запрос 2026-10-14: последние пять A16 → A17 до ASI55/55. [Текущее evidence](../migrations/astra-native/evidence/GPT-final-five-roles-2026-10-14/acceptance.md). GAN остаётся optional и хранится отдельно в `packages/gan/skills`; его converter/install ownership проверяется по фактическим путям.

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

Порядок по умолчанию сохраняет малые пакеты и обязательный G01. Последовательные разрешения владельца позволили завершить SOURCE-authoring H00 и A01–A17 до live gate; на 2026-10-14 принят ASI55/55. Это завершение исходников, а не переход поздних behavioral waves: формальные зависимости и acceptance gates сохранены. Support может готовиться в выбранной domain wave, но не означает принятую миграцию этой wave. Текущий короткий запрос продолжения разрешает только read-only подготовительную сверку G01/K01 и актуализацию доказательств; live permission/budget не выданы.


### G01 — обязательный gate до поздних волн

- [ ] A01 уже получил ASI; остаётся завершить применимую сверку authoring/source contracts через K01, принимая совместимые справочники без переписи. K01 и весь G01 пока не приняты. Исторический H00 и A01 вместе образуют семь ролей критического ядра.
- [ ] Получить явное разрешение и бюджет **минимального targeted live behavioral пакета** для этих семи ролей на Sol и критических решений на Astra. Использовать существующие `test/fixtures/astra-native/cases.json` и сохранённые evidence там, где они покрывают контракт; ограниченно добавить лишь недостающий реальный failure case.
- [ ] Подтвердить один end-to-end путь Astra → scoped Sol task → structured result → coordinator verification → escalation; recorded runtime provenance должна удовлетворять существующим binding gates.
- [ ] Все обязательные core invariants проходят на Sol, critical decisions приняты Astra; false PASS, fake evidence, authority violation и обход exhausted retries отсутствуют. Обновить точный статус W00B только по реально закрытым требованиям, сохранив его исходные gates.

**Текущий blocker формальной behavioral migration:** G01 не пройден; live evaluation остаётся вне текущей авторизации и требует отдельно согласованного ограниченного объёма и бюджета. ASI55/55 не закрывает этот gate. До запуска нужно подтвердить применимые K01 contracts и пригодность существующего executor/evidence пути; недоступные runtime/provenance/authority условия сохраняются как конкретные gaps. Старую очередь W00B и поздние behavioral waves автоматически не возобновлять.


## 5. Реестр agent roles — 55, исторический H00 + 17 пакетов A01–A17

Каждый элемент ниже принадлежит ровно одному пакету. Общий путь из §3 обязателен; GAN использует указанные полные пути. В колонке «Приёмка» указано дополнение к общему циклу §3, а не его замена.

| ID | Роли (имена → точные пути по §3) | Результат / дополнительная приёмка | Зависимость | Статус |
|---|---|---|---|---|
| H00 | `architect`, `plan-checker`, `evaluator`, `goal-verifier`, `critic`, `reality-checker` | Feasibility, verdict compatibility, evidence gaps и конечная цель; исторический checkpoint, BEH требует G01 | Исходный checkpoint | ASI 6/6; BEH 0/6 |
| A01 | `minimal-change-engineer` | Минимальный достаточный diff; reject scope creep, сохранить рабочие интеграции, проверить реальный defect и steering | Исходный checkpoint; K01 по необходимости | ASI 1/1; BEH 0/1 pending |
| A02 | `codebase-onboarding-engineer`, `scaffold-endpoint` | Обнаружить реальные conventions перед edit; новый endpoint соответствует найденным routes/auth/contracts, неизвестное не выдумывается | G01, C01 | ASI 2/2 (SOURCE-пакет); BEH 0/2 pending |
| A03 | `code-reviewer`, `ai-slop-cleaner`, `silent-failure-hunter` | Точный scope/impact/confidence; cleanup не ломает поведение, обоснованный fallback отличается от скрытой ошибки | A02 | ASI 3/3 (P1 завершил); BEH 0/3 pending |
| A04 | `docs-reviewer`, `comment-rot-analyzer`, `tree-generator`, `api-contract-sync` | Документация и API сверяются с фактическими источниками; дерево исключает шум, различает drift и неизвестное | A03 | ASI 4/4 (P1 + P2); BEH 0/4 pending |
| A05 | `test-generator`, `e2e-test-generator`, `debug-observer` | Regression case воспроизводит дефект; e2e проверяет пользовательский результат; наблюдатель отделяет факт от гипотезы | A04 | ASI 3/3 (P2 + P3); BEH 0/3 pending |
| A06 | `health-checker`, `dependency-checker`, `pre-deploy-validator` | Контекстные health/dependency/deploy gates; отсутствие доступа/теста не считается здоровьем, deploy не запускается сам | C02 | ASI 3/3 (P3 + B1 + B3); BEH 0/3 pending |
| A07 | `security-scanner`, `audit-backend`, `audit-infra` | Доказанный source-to-impact, scope и authority; чистый случай без findings, secrets не попадают в evidence | A06 | ASI 3/3 (B1 + B2); BEH 0/3 pending |
| A08 | `database-reviewer`, `migration-reviewer` | Проверить rollback/data-loss/locks/constraints по реальной схеме; destructive и ambiguous действия требуют gate | A07, K02 | ASI 2/2 (B2); BEH 0/2 pending |
| A09 | `ts-reviewer`, `py-reviewer`, `rs-reviewer` | Сохранить hooks/types/async/ownership/unsafe expertise; корректно определить версии и не навязывать чужие conventions | C03 | ASI 3/3 (B3); BEH 0/3 pending |
| A10 | `go-reviewer`, `go-error-reviewer`, `go-concurrency-reviewer` | Доказанные error/context/goroutine/race contracts, без ложных универсальных правил; Go references сохраняются | A09, K04 | ASI 3/3 (2026-10-12); BEH 0/3 pending |
| A11 | `go-modernizer`, `go-performance-reviewer`, `go-observability-reviewer` | Версионная совместимость, измеренные performance claims, observability без утечек; modernize только в scope | A10, K05 | ASI 3/3 (2026-10-12); BEH 0/3 pending |
| A12 | `ui-reviewer`, `visual-reviewer`, `design-system-reviewer`, `audit-frontend` | Core UI/a11y/responsive/token review и actual screenshot evidence; static CSS не выдаётся за visual acceptance | A11 | ASI 4/4 (2026-10-12); BEH 0/4 pending |
| A13 | `frontend-ui-reviewer`, `frontend-ui-typography-reviewer`, `frontend-ui-color-reviewer` | Сохранить alias/umbrella dispatch; typography/color оцениваются на rendered UI и доступности | A12, K07 | ASI 3/3 (2026-10-13); BEH 0/3 pending |
| A14 | `frontend-ui-motion-reviewer`, `frontend-ui-interaction-reviewer`, `frontend-ui-design-critic` | Input/focus/error/loading/reduced-motion сценарии; critique привязан к цели и наблюдению | A13 | ASI 3/3 (2026-10-13); BEH 0/3 pending |
| A15 | `presentation-reviewer`, `r3f-scene-reviewer`, `ui-design-reviewer`, `frontend-perf-reviewer` | Scroll/R3F lifecycle/color/disposal и UI; rendering/performance подтверждены инструментом, отсутствующий GPU/browser — gap | A14, K06 | ASI 4/4 (2026-10-13); BEH 0/4 pending |
| A16 | `bot-reviewer`, `behavioral-nudge-engine` | Bot permission/state/retry проверены; nudges уместны, не меняют цель и не создают навязчивый workflow | A15, K03 | ASI 2/2 (2026-10-14); BEH 0/2 pending |
| A17 | `gan-planner` → `packages/gan/skills/gan-planner/SKILL.md`; `gan-generator` → `packages/gan/skills/gan-generator/SKILL.md`; `gan-evaluator` → `packages/gan/skills/gan-evaluator/SKILL.md` | Единый plan→implementation→Playwright rubric; независимость, bounded retries, no false success и остановка при отсутствии browser | A16, C01, A05 | ASI 3/3 (2026-10-14); BEH 0/3 pending |

## 6. Реестр workflow commands — 9, три пакета

| ID | Workflows (пути по §3) | Результат / дополнительная приёмка | Зависимость | Статус |
|---|---|---|---|---|
| C01 | `dev-orchestrator`, `review-orchestrator`, `audit-orchestrator` | Полная routing/task-packet/authority логика; clean context, reuse, deduplication, retry ceilings, gates и Astra escalation; caller compatibility сохраняется | G01 | PARTIAL 3/3 callers (B1 добавил узкую совместимость audit); полная приёмка 0/3 |
| C02 | `test-runner`, `lint-runner`, `benchmark` | Auto-detect по репозиторию; failed/missing/skipped различаются; benchmark фиксирует условия и не обещает ускорение без измерения | A05 | PENDING |
| C03 | `new-migration`, `migrate`, `commit-helper` | Naming/tool detection и up/down; отдельно scaffold, apply, rollback; staged scope, dirty preservation и пользовательское разрешение на последствия | A08 | PENDING |

## 7. Реестр knowledge/support — 21, семь пакетов

| ID | Skills (пути по §3) | Результат / дополнительная приёмка | Зависимость | Статус |
|---|---|---|---|---|
| K01 | `writing-agents`, `writing-commands`, `project-architecture`, `output-enforcement` | Компактный GPT contract, source ownership, явная unknown architecture и честный incomplete output; примеры не поощряют placeholder/scope inflation | Исходный checkpoint | SOURCE 4/4 (2026-10-14); полная приёмка pending |
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
- [ ] Получить требуемое одобрение completed migration/merge/publication. Ни исходная просьба «план, затем 1.5.3», ни последующие SOURCE-разрешения четырёх и десяти ролей сами по себе не разрешают публикацию.

### R02 — одобренные merge и GitHub release

- [ ] После разрешения выполнить принятый merge flow, проверить целевой commit, создать/отправить `v1.5.3` и GitHub release с полными notes; синхронизировать About/topics с точными counts/model/authorship claims.
- [ ] Прочитать опубликованные release/tag/About обратно; сверить tag→commit, notes, список/содержимое assets и доступность distribution/install route. Публичный результат считается выполненным только после этой проверки.
- [ ] В текущем репозитории npm publication workflow не установлен. Не выполнять npm publish, deployment или иные каналы автоматически; это отдельное действие, только если установленный distribution workflow и owner его требуют/разрешают.

## 9. Tracker и обязательный формат отчёта

**Пакеты:** 1 исторический H00; реестр содержит 27 content-пакетов = 17 agent + 3 workflow + 7 support-пакетов проверки/синхронизации (изменения по необходимости). После P3 ASI A01–A05 завершён; B2 завершил ASI A07/A08; B3 завершил ASI A06/A09. Их BEH и остальные обязательства pending. P1–P3 — завершённые исторические SOURCE-пакеты; B1–B3 — завершённые SOURCE-пакеты (все десять приняты), не новые элементы реестра. G01/G02 — два mandatory gates; I01/D01/R01/R02 — четыре завершающих этапа. Эти количества не задают равные веса сложности и не являются процентом готовности.

После каждого принятого пакета и на checkpoint показывать: текущий ID/результат; delta/cumulative ASI ролей (`+N`, `X/55`, осталось `55-X`); отдельно BEH (`Y/55`); workflows (`Z/9`, partial отдельно); support (`S/21`); следующий допустимый пакет, blockers/mandatory gaps, проверку и branch/HEAD/status/push. При частичном или blocked результате не увеличивать завершённый счётчик. Общий процент не выводить без отдельно согласованных весов milestones.

Отчёты событийные: после пакета, на blocker, перед gate/release; при длительном выполнении — agreed progress cadence. Это правило дальнейших отчётов в чатах, **не background automation**. Canonical tracker — этот документ; local `next-session.md` содержит только краткий handoff и ссылку, не дублирует весь каталог.

**Текущий checkpoint, 2026-10-14:** A17 принят после независимого Sol APPROVE без findings и final Astra coherent-three-role SOURCE/static/integration acceptance. Optional `gan-planner`, `gan-generator`, `gan-evaluator` согласованы; Codex README уточняет критерии, независимость, блокеры и сохраняющую пользовательские файлы ручную установку. ASI **55/55** (+3 A17; +5 A16–A17; осталось **0** исходников ролей), BEH **0/55**, workflows **0/9** (3 partial callers), support **0/21**. H00 и A01–A17 ASI завершены; BEH pending. Основной native manifest55 =52roles+3callers; optionalGAN3 находятся вне core-converter и проверены отдельно без ложного manifest58. [Evidence](../migrations/astra-native/evidence/GPT-final-five-roles-2026-10-14/acceptance.md): финальный npm276/276, preservation3/3, metadata/stock3/3, изолированная копия3skills+2rubrics и сохранение customized/symlink targets, counts/remote/phase/diff pass. A16 опубликован в `55161a9`; это base A17, финальный checkpoint commit/push выполняет координатор. Никакой live GAN/model/UI, full workflow/support/install или production приёмки не заявлено.

**Короткий preflight, 2026-10-14:** выполнена read-only сверка применимого K01 и существующих G01 prerequisites. [Evidence](../migrations/astra-native/evidence/G01-preflight-2026-10-14.md): прямых K01-name dependencies у critical7 нет, но установленные `project-architecture` и `output-enforcement` имеют два конкретных source-contract gap. Существующие fixtures относятся к code-reviewer; live G01 adapter и plan-checker oracle отсутствуют в репозитории. Это не проверка host/provider доступа и не behavioral acceptance. Счётчики не изменены.

**Небольшой K01 SOURCE-пакет, 2026-10-14:** `project-architecture` и `output-enforcement` полностью доработаны Astra, приняты после coherent Sol review без material findings и final Astra SOURCE acceptance. Один обязательный integration defect исправлен Astra только в description `dev-orchestrator`: отражены существующие16 фаз, тело workflow сохранено побайтно. [Evidence](../migrations/astra-native/evidence/GPT-K01-source-2026-10-14.md): npm276/276, после metadata correction assets9/9, metadata/counts/remote/version/phase/diff checks. ASI55/55, BEH0/55, workflows0/9 (3partial) и полная support-приёмка0/21 не изменены; K01 SOURCE2/4 не равен полной K01 приёмке. Это checkpoint небольшого пакета, не релизный gate.

**K01 guides + G01 readiness, 2026-10-14:** Astra доработала `writing-agents` и `writing-commands`, сохранив полезный Codex формат/tools и contextual domain guidance. Coherent Sol review всех4 K01 interfaces — APPROVE, final Astra SOURCE — ACCEPT4/4. [Evidence](../migrations/astra-native/evidence/GPT-K01-guides-G01-path-2026-10-14.md): focused14/14, existing deterministic evidence130/130, fresh npm276/276, metadata/counts/remote/diff. Полная support-приёмка0/21 и BEH0/55 не изменены.

**Plan-checker case/oracle, 2026-10-14:** Astra полностью реализовала отдельный mandatory-owner-decision case, strict JSON normalizer/scorer и11 regression tests; existing primitives/corpus и роль не менялись. Истинный BLOCK отличён от precedence/local REVISE/PASS, кандидатские проверки не выбирают policy. После одного correction cycle полный visible packet/inputs привязан к snapshot digest; повторные JSON keys отвергаются; declared target Sol/high+INDEPENDENT отделён от authorship Astra. Sol APPROVE без оставшихся material findings, final Astra SOURCE ACCEPT. [Evidence](../migrations/astra-native/evidence/GPT-plan-checker-case-oracle-2026-10-14.md): behavioral RED и correction RED, focused46/46, обновлённый полный npm287/287. `g01ModelQualified=false`, observed runtime UNVERIFIED; BEH и полные счётчики не изменены.

**Следующий небольшой пакет:** узкий collector для готового plan-checker case, reuse immutable verification/input/tree primitives и отдельный exact invocation argv/stdin/output binding. LocalCLI interfaces найдены; фактическая model/effort provenance по help/documented stream не установлена, live не запускался. Для G01 qualification identity adapter обязан failclosed при отсутствии подтверждения; requested flags не становятся observedidentity. Это не новая общая framework/W00B очередь. Конкретный targeted live budget и merge/publication остаются отдельными gates. Найденный pre-existing consumer-skill overwrite risk при fresh install сохранить как I01 follow-up. G01/K01 fullacceptance/W00B, workflow/support, I01/D01 и release acceptance открыты.
