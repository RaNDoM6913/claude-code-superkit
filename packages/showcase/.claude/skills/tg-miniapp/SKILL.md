---
name: tg-miniapp
description: >
  Telegram Mini App battle-tested solutions — safe areas, fixed positioning, BackButton, sharing.
  Активируй когда работаешь с TG WebApp API, safe area, fullscreen, модалями или bottom sheets.
---

# Telegram Mini App — Critical Patterns

## 🔴 CRITICAL: Safe Area в Fullscreen

`safeAreaInset` может вернуть `0` при инициализации — нельзя читать один раз.
Значения обновляются асинхронно. iOS и Android дают разные safe areas.

**Решение — реактивный хук** (файл: `src/hooks/useSafeAreaInset.ts`):

```typescript
import { useSafeAreaInset } from "@/hooks/useSafeAreaInset";

// В компоненте:
const safeArea = useSafeAreaInset();

// Полные поля:
safeArea.top         // комбинированная safe area (systemTop + contentTop, с fallback)
safeArea.bottom      // нижний отступ
safeArea.systemTop   // высота статус-бара устройства (0 вне fullscreen)
safeArea.contentTop  // высота TG-контролов — "Закрыть", "˅", "..." (0 вне fullscreen)
safeArea.isFullscreen // true если Mini App в fullscreen

// Простое использование — paddingTop = combined safe area:
<div style={{ paddingTop: safeArea.top }}>
```

**Минимальные fallback для fullscreen:**
- iOS: `top = 100px` (если сумма < 80)
- Android: `top = 80px` (если сумма < 80)

**Архитектура safe area зон (fullscreen):**
```
┌──────────────────────────────┐
│  22:54   📶  📶  🔋          │  ← systemTop (статус-бар / notch)
│ ✕ Закрыть          ˅  ...   │  ← contentTop (TG floating controls)
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │  ← safeArea.top = systemTop + contentTop
│       App content            │
```

- `safeAreaInset.top` и `contentSafeAreaInset.top` — **аддитивны** в fullscreen
- Вне fullscreen оба = 0 (нативный TG-хидер управляет сам)

**Sticky header с safe area:**
```tsx
// WRONG — контент просвечивает сквозь gap
<div className="sticky top-0">Header</div>

// CORRECT
<div className="sticky top-0" style={{ paddingTop: safeArea.top, background: COLORS.bg }}>
  Header
</div>
```

## 🔴 CRITICAL: Брендинг в зоне TG-контролов (fullscreen header)

В fullscreen режиме можно разместить текст/логотип **между** системными кнопками TG
("Закрыть" слева, "˅ + ..." справа). Это заменяет кастомный хидер и экономит место.

**Паттерн — branding в TG controls zone:**
```tsx
const safeArea = useSafeAreaInset();

{/* Прозрачный spacer = вся safe area */}
{safeArea.top > 0 && (
  <div className="shrink-0 relative" style={{ height: safeArea.top }}>
    {/* Текст позиционирован точно в зоне TG-контролов */}
    {safeArea.isFullscreen && safeArea.contentTop > 0 && (
      <div
        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none"
        style={{
          top: safeArea.systemTop,
          height: safeArea.contentTop,
        }}
      >
        <span
          className="text-[15px] font-bold tracking-[0.08em] uppercase"
          style={{ color: "rgba(228,228,240,0.55)" }}
        >
          MyApp
        </span>
      </div>
    )}
  </div>
)}
```

**Ключевые правила:**
- `pointer-events-none` обязателен — чтобы не перекрывать клики по TG-кнопкам
- `top: systemTop` — ниже статус-бара, `height: contentTop` — ровно высота ряда TG-контролов
- Цвет текста полупрозрачный (`rgba(..., 0.55)`) — не конкурирует с системными кнопками
- Вне fullscreen spacer не рендерится (`safeArea.top === 0`)
- Не используй `position: fixed` — TG применяет transform к контейнеру (см. ниже)

**Кастомизация:**
- Можно менять текст ("MyApp" → любой бренд) или ставить иконку/логотип
- Можно добавить кнопку справа/слева (но `pointer-events-none` нужно убрать для неё)
- Для разных табов — условный рендер по `activeTab`

**Файл-референс:** `src/app/App.tsx` → MainApp component, секция "Safe area spacer"

## 🔴 CRITICAL: position:fixed не работает в TG

Telegram применяет CSS `transform` к контейнеру → `position:fixed` съезжает.

**Решение — React createPortal:**
```tsx
import { createPortal } from 'react-dom';

function BottomSheet({ children }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999]">{children}</div>,
    document.body
  );
}
```

Применять для: bottom sheets, модалей, tooltips, toast-уведомлений.

## 🔴 CRITICAL: BackButton handler не срабатывает

Использовать `@telegram-apps/sdk` вместо raw `window.Telegram.WebApp.BackButton`:

```typescript
import { mountBackButton, showBackButton, hideBackButton, onBackButtonClick, offBackButtonClick } from '@telegram-apps/sdk';

mountBackButton(); // один раз при инициализации

useEffect(() => {
  if (shouldShowBack) {
    showBackButton();
    onBackButtonClick(handleBack);
  } else {
    hideBackButton();
  }
  return () => offBackButtonClick(handleBack);
}, [shouldShowBack, handleBack]);
```

## 🟡 Тест перед деплоем

- [ ] Открыть из папки (список чатов)
- [ ] Открыть из прямого чата
- [ ] Тест на iOS (safe area top 44+)
- [ ] Тест на Android (safe area top ~24)
- [ ] BackButton работает
- [ ] Bottom sheet не съезжает
- [ ] Sticky header без просвета

## 🟢 Debug Overlay (dev only)

```tsx
function DebugOverlay() {
  if (import.meta.env.PROD) return null;
  const webApp = window.Telegram?.WebApp;
  return (
    <div className="fixed bottom-20 right-2 bg-black/80 p-2 text-xs z-[9999] rounded-lg text-white">
      <div>Platform: {webApp?.platform ?? 'browser'}</div>
      <div>Fullscreen: {webApp?.isFullscreen ? 'Y' : 'N'}</div>
      <div>Safe top: {webApp?.safeAreaInset?.top ?? '—'}</div>
      <div>Content safe top: {webApp?.contentSafeAreaInset?.top ?? '—'}</div>
    </div>
  );
}
```

## Ресурсы

- [Telegram Mini Apps Docs](https://core.telegram.org/bots/webapps)
- [@telegram-apps/sdk](https://github.com/Telegram-Mini-Apps/telegram-apps)
- Hook файл: `src/hooks/useSafeAreaInset.ts`
