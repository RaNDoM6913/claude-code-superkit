# Миграция setup.sh → npx claude-code-superkit

> Дата: 2026-03-26
> Статус: Проектирование

## Проблема

setup.sh (593 строки bash) — единственный тяжёлый bash-инсталлятор во всей экосистеме Claude Code.
Найдено 6 критических багов, связанных с Bash 3.2 (дефолт macOS) + `set -euo pipefail`:

1. Молчаливые падения при неинтерактивном запуске (heredoc/pipe)
2. Bash 3.2 несовместимость (предупреждает, но ломается)
3. Пустые массивы + `set -u` = unbound variable
4. `cd` в `{ }` блоке меняет рабочую директорию
5. Нет `--defaults` для CI/CD
6. `ls | wc -l` + `pipefail` = ложные ошибки

Все топовые репо в экосистеме (oh-my-claudecode, GSD-2, Everything Claude Code, Superpowers, vibe-tools) используют либо npm/npx, либо plugin marketplace. Ни один не использует тяжёлый bash-скрипт.

## Решение

Переписать инсталлятор на Node.js. Пользователь Claude Code гарантированно имеет Node.js (Claude Code сам требует его).

### Способ установки для пользователя

```bash
# Основной способ — одна команда, ничего не ставя заранее:
npx claude-code-superkit

# С параметрами:
npx claude-code-superkit --defaults
npx claude-code-superkit --stacks=go,typescript --profile=strict

# Для тех, кто уже клонировал репо:
node bin/cli.js
# или тонкий shell-wrapper:
./setup.sh
```

### Имя npm-пакета

**`claude-code-superkit`** — совпадает с GitHub-репо, максимальная узнаваемость.

Алиас в bin: `superkit` → пользователь может также `npx superkit`.

## Архитектура

### Структура файлов

```
claude-code-superkit/
├── bin/
│   └── cli.js              ← #!/usr/bin/env node, точка входа
├── lib/
│   ├── installer.js         ← основная логика установки
│   ├── prompts.js           ← интерактивные вопросы (readline)
│   ├── settings-builder.js  ← сборка settings.json (заменяет jq)
│   ├── docs-scaffold.js     ← документация + project tree
│   ├── superpowers.js       ← установка superpowers плагина
│   ├── codex.js             ← установка Codex CLI поддержки
│   ├── validator.js         ← пост-установочная валидация
│   └── utils.js             ← цвета, копирование, detect git
├── packages/                ← без изменений (agents, commands, hooks, rules, skills)
├── setup.sh                 ← тонкая обёртка (5 строк): проверяет node → запускает bin/cli.js
├── package.json
└── ...остальные файлы репо
```

### package.json

```json
{
  "name": "claude-code-superkit",
  "version": "1.3.3",
  "description": "Production-tested agents, commands, hooks & skills for Claude Code and Codex CLI",
  "type": "module",
  "bin": {
    "claude-code-superkit": "./bin/cli.js",
    "superkit": "./bin/cli.js"
  },
  "files": [
    "bin/",
    "lib/",
    "packages/"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": [
    "claude-code", "codex", "ai-agents", "cli", "scaffolding",
    "code-review", "hooks", "skills"
  ],
  "license": "MIT"
}
```

### Зависимости

**Ноль внешних зависимостей.** Всё на встроенных модулях Node.js:

| Задача | Было (bash) | Стало (Node.js) |
|--------|-------------|-----------------|
| Интерактивные вопросы | `read -rp` | `node:readline/promises` |
| Копирование файлов | `cp -r`, `copy_file()` | `node:fs` cpSync / copyFileSync |
| Сборка JSON | `jq` (внешняя зависимость) | `JSON.parse/stringify` |
| Подсчёт файлов | `ls \| wc -l \| tr -d ' '` | `readdirSync().filter().length` |
| Цвета в терминале | `echo -e "\033[..."` | `\x1b[...` литералы |
| Проверка git | `git rev-parse` | `child_process.execSync('git ...')` |
| Обнаружение ОС | `uname` | `process.platform` |
| Дерево проекта | `tree` / `find` | рекурсивный `readdirSync` |

## Логика установки (port из bash)

### Флаги CLI

```
npx claude-code-superkit [options]

Options:
  --defaults              Всё по умолчанию, без вопросов
  --stacks=go,ts,py,rust  Выбрать стеки явно
  --profile=fast|standard|strict  Профиль хуков
  --extras=bot,design     Выбрать extras явно
  --no-docs               Пропустить создание docs/
  --no-superpowers        Пропустить установку superpowers
  --codex                 Также установить для Codex CLI
  --help, -h              Показать справку
  --version, -v           Показать версию
```

### Пошаговый флоу (тот же что в bash, но надёжнее)

1. **Проверки**: Node.js 18+, git, внутри git-репо
2. **Superpowers**: проверить установлен ли, предложить установить
3. **Существующий .claude/**: merge / overwrite / abort
4. **[1/4] Стеки**: Go, TypeScript, Python, Rust (мульти-выбор)
5. **[2/4] Extras**: bot-reviewer, design-system-reviewer
6. **[3/4] Профиль хуков**: fast / standard / strict
7. **[4/4] Плагины**: базовые (always) + опциональные
8. **Установка**: копирование файлов, сборка settings.json
9. **Документация**: шаблоны + project tree
10. **Codex**: опционально
11. **Валидация**: проверка целостности
12. **Сохранение мета**: .superkit-meta для авто-обновлений
13. **Итоги**: красивый summary

### Режим `--defaults`

| Параметр | Значение по умолчанию |
|----------|-----------------------|
| Existing .claude/ | merge |
| Stacks | none |
| Extras | none |
| Profile | standard |
| Optional plugins | none |
| Docs | yes |
| Superpowers | yes (install if missing) |
| Codex | no |

### Сборка settings.json

Вместо цепочки `jq` мутаций — чистый JS:

```javascript
// Читаем базовый шаблон
const settings = JSON.parse(fs.readFileSync(coreSettingsPath, 'utf8'));

// Добавляем стек-хуки
for (const stack of selectedStacks) {
  const hookFiles = getStackHooks(stack);
  for (const hook of hookFiles) {
    settings.hooks.PostToolUse[0].hooks.push({
      type: 'command',
      command: `"$CLAUDE_PROJECT_DIR"/.claude/scripts/hooks/${hook}`
    });
  }
}

// Добавляем опциональные плагины
for (const plugin of selectedPlugins) {
  settings.enabledPlugins[`${plugin}@claude-plugins-official`] = true;
}

// Записываем — гарантированно валидный JSON
fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
```

Нет jq, нет pipefail, нет коррупции JSON, нет бэкапов.

## setup.sh — тонкая обёртка

Для тех кто уже клонировал репо, оставляем `setup.sh` как 5-строчный wrapper:

```sh
#!/bin/sh
# claude-code-superkit — installer wrapper
# Full installer: npx claude-code-superkit
command -v node >/dev/null 2>&1 || { printf 'Error: Node.js 18+ required.\nInstall: https://nodejs.org\n' >&2; exit 1; }
exec node "$(dirname "$0")/bin/cli.js" "$@"
```

POSIX sh, работает везде: bash 3.2, zsh, dash, fish. Никаких массивов, никаких `set -euo pipefail`.

## Обработка ошибок

```javascript
async function main() {
  try {
    // ... вся логика
  } catch (err) {
    if (err.code === 'ERR_USE_AFTER_CLOSE') {
      // readline закрыт (pipe/heredoc окончился) — используем defaults
      console.log('\nNon-interactive mode detected. Using --defaults.');
      return runWithDefaults();
    }
    console.error(`\n✗ Error: ${err.message}`);
    process.exit(1);
  }
}
```

Ключевое отличие от bash: если stdin закрывается в середине интерактивного режима, Node.js не падает молча — он бросает понятную ошибку, и мы можем graceful fallback на defaults.

## Что НЕ меняется

- Все файлы в `packages/` — без изменений
- Структура `.claude/` у пользователя — идентичная
- Логика merge/overwrite — та же
- Документация и шаблоны — те же
- Авто-обновления (superkit-update.sh hook) — работают
- `.superkit-meta` формат — тот же

## Что улучшается

| Аспект | Было | Стало |
|--------|------|-------|
| Установка | `git clone` + `bash setup.sh` | `npx claude-code-superkit` |
| Зависимости | bash 4+, jq, git | Node.js 18+, git |
| macOS Bash 3.2 | Молчаливые падения | Работает (Node.js) |
| zsh пользователи | Крэш на строке 47 | Работает (Node.js) |
| Windows | Не работает | Работает из коробки |
| CI/CD | Ломается в pipe | `--defaults` работает чисто |
| JSON-сборка | jq + бэкапы + валидация | Нативный JSON |
| Ошибки | `set -e` → молча уходит | try/catch → понятное сообщение |
| Тестируемость | Нельзя протестировать | Можно unit-тестами |

## Миграция и обратная совместимость

- Старый `git clone` + `bash setup.sh` продолжает работать (setup.sh = тонкая обёртка → Node.js)
- `npx claude-code-superkit` — новый основной путь
- Пользователи с установленным bash 4+ не заметят разницы
- `.superkit-meta` совместим: поле `SUPERKIT_SOURCE` указывает на каталог с packages/

## Публикация на npm

1. Зарегистрировать npm-аккаунт (если нет)
2. `npm login`
3. `npm publish` — публикует пакет с packages/ внутри
4. Пользователь запускает `npx claude-code-superkit` — npm скачивает, запускает, удаляет

Размер пакета: ~1.2 MB (245 файлов в packages/). В пределах нормы для npm.

## Риски и митигация

| Риск | Митигация |
|------|-----------|
| Имя `claude-code-superkit` занято на npm | Проверено — свободно |
| Node.js не установлен у пользователя | Claude Code сам требует Node.js 18+, поэтому 99.9% аудитории покрыты |
| Пользователь привык к `bash setup.sh` | setup.sh остаётся, просто делегирует в Node.js |
| Обновление packages/ между npm-версиями | Версия в package.json = VERSION файл, синхронизируем при релизе |

## Обновление документации

После реализации обновить:
- README.md — новый способ установки (`npx claude-code-superkit`), убрать jq из зависимостей
- docs/INSTALL-CLAUDE-CODE.md — обновить инструкции
- CHANGELOG.md — запись о миграции с bash на npx
- packages/codex/INSTALL.md — обновить раздел установки
- CLAUDE.md (этот файл) — обновить описание setup.sh
