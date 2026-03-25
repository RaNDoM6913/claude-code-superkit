---
name: onyx-ui-standard
description: ONYX Liquid Glass design system — colors, glassmorphism, z-index layers, layout standards
---

# ONYX UI Standard — Базовая палитра и layout-стандарт

## Палитра ONYX (obsidian-black + violet accent)

Каноническое определение: `frontend/src/pages/onboarding/shared.tsx` → `COLORS`

```
bg:              #060609     // Основной фон (obsidian-black)
bgSecondary:     #0A0A10     // Вторичный фон (чуть светлее)
surface:         #0F0F18     // Поверхность карточек
surfaceElevated: #141420     // Приподнятая поверхность
brandDeep:       #1E1E35     // Глубокий бренд-цвет
brandSoft:       #8A8AA8     // Мягкий бренд
brandTint:       #151525     // Бренд-тинт
textPrimary:     #E4E4F0     // Основной текст
textSecondary:   #9898B0     // Вторичный текст
textMuted:       #6A6A82     // Приглушённый текст
textOnBrand:     #F0F0FA     // Текст на бренд-фоне
stroke:          rgba(40, 40, 65, 0.30)  // Обводки
success:         #4ED6A0     // Успех
danger:          #FF5C7A     // Ошибка
violet accent:   #6A5CFF     // Фиолетовый акцент (ключевой)
```

### Gradient backgrounds
```css
/* Простой фон */
background-color: #060609;

/* Градиент (экраны с центральной иконкой) */
background: linear-gradient(to bottom, #08080E 0%, #060609 20%);
```

## Layout-стандарт экранов

### Хедер: нативный TG хедер без дополнительных элементов

Нативный TG хедер показывает bot name + системные кнопки. Мы НЕ добавляем никаких дополнительных элементов (лейблов, кнопок "Назад") — контент экрана начинается сразу после нативного хедера. Единый цвет фона (#060609) обеспечивает визуальную целостность.

```
┌──────────────────────────────────┐
│ [< Назад]   ONYX bot   [v ...] │  ← Нативный TG хедер (#060609)
├──────────────────────────────────┤
│  Контент экрана (pt-4)           │  ← Сразу контент, без промежуточных блоков
│  [Кнопка действия]               │
└──────────────────────────────────┘
```

**Telegram API настройки:**
1. `setHeaderColor("#060609")` — цвет хедера совпадает с bg
2. `setBackgroundColor("#060609")` — цвет подложки
3. В BotFather: `/setname` → "ONYX", `/setuserpic` → аватар
4. `BackButton.show()` / `BackButton.hide()` — нативная кнопка "Назад" вместо "X Закрыть"

### Навигация между экранами

**Свайп вместо кнопки "Назад":**
- Свайп вправо → предыдущий экран
- Кнопки только для действий вперёд
- AnimatePresence с направленной анимацией (slide left/right)

```tsx
// App.tsx — swipe wrapper
<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  dragElastic={0.12}
  onDragEnd={(_, { offset }) => {
    if (offset.x > 80 && canGoBack) goBackward();
  }}
>
```

### Telegram API (telegram.ts)

```typescript
const COLORS = {
  bg: "#060609",        // ← ONYX obsidian-black
  bgSecondary: "#0A0A10",
  surface: "#0F0F18",
  surfaceElevated: "#141420",
  brandDeep: "#1E1E35",
};

tg.setHeaderColor(COLORS.bg);
tg.setBackgroundColor(COLORS.bg);
```

### Структура экрана-шаблона

```tsx
const Screen = ({ onNext }: { onNext: () => void }) => {
  const { top, bottom, left, right } = useSafeAreaInset();

  return (
    <div
      className="tg-fullscreen flex flex-col overflow-hidden"
      style={{
        backgroundColor: "#060609",
        paddingTop: top,
        paddingBottom: bottom,
        paddingLeft: left,
        paddingRight: right,
      }}
    >
      {/* Контент — НЕТ хедера, контент начинается сразу */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-4">
        {/* ... */}
      </div>

      {/* Кнопки внизу */}
      <div className="px-6 pb-6 pt-3 shrink-0">
        <NeonPrimaryButton onClick={onNext}>
          Продолжить
        </NeonPrimaryButton>
      </div>
    </div>
  );
};
```

### Нижняя часть экрана

**БЕЗ искусственных спейсеров.** Отступ снизу управляется `paddingBottom: bottom` из `useSafeAreaInset()`. Спейсер `<div className="h-4">` удалён из App.tsx.

## Glass-эффекты (из glass-system.css)

```css
/* Стандартный glass (карточки) */
.glass {
  backdrop-filter: blur(40px) saturate(180%) brightness(1.03);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 32px rgba(0,0,0,0.40);
}

/* Prominent glass (CTA кнопки) */
.glass-prominent {
  backdrop-filter: blur(48px) saturate(200%) brightness(1.08);
  background: rgba(106, 92, 255, 0.12);
  border: 1px solid rgba(106, 92, 255, 0.32);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.25), 0 8px 40px rgba(106,92,255,0.28);
}
```

## Файлы-источники

| Файл | Роль |
|------|------|
| `frontend/src/pages/onboarding/shared.tsx` | COLORS, NeonPrimaryButton, OnboardingCheckbox |
| `frontend/src/styles/glass-system.css` | .glass, .glass-prominent, .ambient-glow, .tg-fullscreen |
| `frontend/src/telegram.ts` | setHeaderColor, setBackgroundColor |
| `frontend/src/hooks/useSafeAreaInset.ts` | Safe area hook |

## Чеклист при создании нового экрана

- [ ] Использовать `COLORS` из `shared.tsx` (НЕ хардкодить цвета)
- [ ] `useSafeAreaInset()` для отступов
- [ ] `tg-fullscreen` класс на root div
- [ ] `backgroundColor: "#060609"` (или gradient с `#08080E`)
- [ ] НЕ добавлять свой хедер (bot name = ONYX в нативном TG хедере)
- [ ] НЕ добавлять кнопку "Назад" (свайп вправо через App.tsx)
- [ ] `NeonPrimaryButton` для CTA
- [ ] `100svh` (не `100vh`)
- [ ] `motion/react` (не `framer-motion`)
