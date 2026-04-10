# Ресерч: adrianhajdin (JavaScript Mastery) — репозитории для дейтинг-лендинга

> **Дата:** 2026-04-09
> **Цель:** Найти полезные паттерны для презентации/лендинга дейтинг-приложения (GSAP + R3F + Three.js + Tailwind)
> **Источник:** https://github.com/adrianhajdin?tab=repositories
> **Проанализировано:** 18 репозиториев

---

## TIER 1 — Критически важные (анимации + 3D)

### 1. gsap_macbook_landing (165 stars) — ЭТАЛОН

**Стек:** React 19, Vite 7, Tailwind 4, GSAP 3.13, Three.js 0.180, R3F 9.3, Zustand 5.0.8

**Что берём:**
- ScrollTrigger + pin + scrub — секция прибивается, анимация на скролле
- ModelSwitcher — переключение 3D моделей с GSAP fade (opacity + translateX)
- StudioLights — Environment + Lightformer + 3 SpotLight (профессиональное освещение)
- Zustand для 3D state — минималистичный стор для цвета/размера/текстуры
- Scroll-synced видео — currentTime привязан к скроллу

**Ключевые файлы:**
- `src/components/Showcase.jsx` — ScrollTrigger pin + scrub + chained timeline
- `src/components/three/ModelSwitcher.jsx` — переключение 3D моделей
- `src/components/three/StudioLights.jsx` — студийное освещение R3F
- `src/store/index.js` — Zustand паттерн для 3D

**Ссылка:** https://github.com/adrianhajdin/gsap_macbook_landing

---

### 2. award-winning-website (974 stars) — Awwwards Site Of The Month

**Стек:** React 18, Vite 5, Tailwind 3, GSAP 3.12

**Что берём:**
- AnimatedTitle — пословная 3D анимация (translate3d + rotateY + rotateX, stagger 0.02s, power2.inOut)
- BentoTilt — 3D hover-эффект на карточках (perspective 700px, чисто React + CSS)
- Clip-path морфинг — видеофрейм морфится из полигона в прямоугольник на скролле
- Radial gradient follow — курсор-следящий градиент

**Ключевые файлы:**
- `src/components/Hero.jsx` — clip-path морфинг + видеопереходы
- `src/components/AnimatedTitle.jsx` — пословная 3D анимация
- `src/components/Features.jsx` — BentoTilt + radial gradient follow

**Ссылка:** https://github.com/adrianhajdin/award-winning-website

---

### 3. iphone (1,622 stars) — клон Apple iPhone 15 Pro

**Стек:** React 18, Vite 5, Tailwind 3, GSAP 3.12, Three.js 0.162, R3F 8.15

**Что берём:**
- 3D модель телефона с переключением цветов — два ModelView с независимым вращением
- GSAP Video Carousel — карусель с прогресс-барами и gsap.ticker
- Lights.jsx — продвинутое студийное освещение (Environment 256 + Lightformer + 3 SpotLight)
- View.Port паттерн — несколько 3D видов в одном Canvas

**Ключевые файлы:**
- `src/components/Model.jsx` — главный 3D viewer
- `src/components/Lights.jsx` — студийное освещение
- `src/components/VideoCarousel.jsx` — GSAP-powered карусель
- `src/components/IPhone.jsx` — 3D модель с динамическими материалами

**Ссылка:** https://github.com/adrianhajdin/iphone

---

### 4. jsm_gta_vi_landing (168 stars)

**Стек:** React 19, Vite 6, Tailwind 4, GSAP 3.13

**Что берём:**
- Scroll-synced видео — видео currentTime привязан к скроллу через pin + scrub
- Mask-based reveals — radial gradient mask анимируется на скролле (вайп-эффект)
- Synchronized multi-element animations — параллельные анимации через timeline position syntax

**Ключевые файлы:**
- `src/sections/Hero.jsx` — mask reveals + multi-element timeline
- `src/sections/FirstVideo.jsx` — scroll-synced видео

**Ссылка:** https://github.com/adrianhajdin/jsm_gta_vi_landing

---

### 5. gsap_cocktails (313 stars)

**Стек:** React 19, Vite 6, Tailwind 4, GSAP 3.13

**Что берём:**
- SplitText text reveals — разбиение на chars/words, yPercent:100, expo.out, stagger 0.06s
- Параллакс с декоративными элементами — scrub-привязанный
- Video scrubbing — scroll-linked видео с адаптивными trigger points

**Ключевые файлы:**
- `src/components/Hero.jsx` — SplitText reveal + parallax + video scrub

**Ссылка:** https://github.com/adrianhajdin/gsap_cocktails

---

## TIER 2 — Очень полезные (3D + архитектура)

### 6. 3d-portfolio (568 stars)

**Стек:** React 19, Vite 6, Tailwind 4, GSAP 3.12, Three.js 0.174, R3F 9.1, postprocessing

**Что берём:**
- HeroExperience — полный 3D scene setup (Camera + OrbitControls + Suspense)
- Particles — 100 частиц в 3D (для романтических эффектов)
- GlowCard — карточки со свечением
- AnimatedCounter — анимированный счётчик ("500K+ пар")
- Responsive 3D — useMediaQuery + разные масштабы

**Ссылка:** https://github.com/adrianhajdin/3d-portfolio

---

### 7. threejs-portfolio (1,014 stars)

**Стек:** React 18, Vite 5, Tailwind 3, GSAP 3.12, Three.js 0.167, R3F 8.17, Framer Motion

**Что берём:**
- react-globe.gl — интерактивный 3D глобус ("пользователи по всему миру")
- Видеотекстуры на 3D объектах — UI на экране 3D-компьютера/телефона
- leva — GUI для дебага 3D сцен
- calculateSizes — адаптация позиций 3D объектов под устройства

**Ссылка:** https://github.com/adrianhajdin/threejs-portfolio

---

### 8. project_3D_developer_portfolio (7,048 stars) — САМЫЙ ПОПУЛЯРНЫЙ

**Стек:** React 18, Vite 4, Tailwind 3, Three.js 0.149, R3F 8.11, Framer Motion 9.0

**Что берём:**
- Framer Motion variants — готовая библиотека анимаций (`src/utils/motion.js`)
- Stars.jsx — звёздный 3D фон (романтика!)
- Earth.jsx — 3D Земля (глобальная аудитория)
- SectionWrapper HOC — единообразные анимации всех секций
- react-tilt — 3D tilt-эффект на карточках

**Ссылка:** https://github.com/adrianhajdin/project_3D_developer_portfolio

---

## TIER 3 — Full-stack паттерны для дейтинга

| Репо | Stars | Стек | Что полезно |
|------|-------|------|-------------|
| sportz-websockets | 59 | Express, PostgreSQL, WS, Zod | WebSocket: heartbeat, backpressure, rate-limit (20 burst / 10 msg/sec) — **для чата** |
| university-library-jsm | 556 | Next.js 15, Neon Postgres, Drizzle, Upstash | Rate limiting, automated workflows, role-based access |
| signalist | 458 | Next.js 15, Better Auth, MongoDB, Inngest | Better Auth (OAuth+MFA), event-driven workflows, cmdk, sonner |
| saas-template | 151 | Next.js 15.4, Clerk 6.20, Supabase | Clerk + Supabase паттерн, подписки |
| saas-app | 400 | Next.js 15, Clerk, Supabase, Lottie | Lottie-react анимации для лендинга |
| coinpulse | 125 | Next.js 16, WebSockets, TradingView | Самый свежий Next.js, real-time WebSocket |
| yc_directory | 945 | Next.js 15, next-auth 5, Sanity CMS | App Router + Partial Prerendering, серверная auth |
| project_shareme_social_media | 1,731 | React, Tailwind, Sanity.io | Социальная лента: upload, feed, profiles, likes |
| project_mern_memories | 5,131 | React, Node, Express, MongoDB, Redux | MERN социальная архитектура |

---

## План применения для нашего лендинга

### Hero-секция
1. SplitText reveal заголовка (gsap_cocktails)
2. 3D телефон с UI приложения (iphone + gsap_macbook_landing)
3. Clip-path морфинг при скролле (award-winning-website)
4. Stars/Particles фон (project_3D_developer_portfolio / 3d-portfolio)

### Секция фичей
1. BentoTilt карточки с 3D hover (award-winning-website)
2. ScrollTrigger pin + scrub (gsap_macbook_landing)
3. Scroll-synced демо-видео (jsm_gta_vi_landing)

### Секция "Пользователи по миру"
1. react-globe.gl с точками (threejs-portfolio)
2. AnimatedCounter со статистикой (3d-portfolio)

### Архитектурные паттерны
1. Zustand для 3D state (gsap_macbook_landing)
2. useMediaQuery + calculateSizes для responsive 3D (threejs-portfolio)
3. SectionWrapper HOC (project_3D_developer_portfolio)
4. WebSocket для чата (sportz-websockets)
5. Better Auth для auth (signalist)
6. Upstash rate limiting (university-library-jsm)

---

## TODO
- [ ] Добавить ссылки на лучшие репо в README суперкита (секция рекомендаций)
- [ ] Изучить конкретные файлы из TIER 1 при работе над лендингом
- [ ] Адаптировать StudioLights паттерн для нашей 3D сцены
- [ ] Портировать AnimatedTitle компонент
- [ ] Интегрировать react-globe.gl для "users worldwide" секции
