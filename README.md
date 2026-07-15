# PickGen — веб-сервис генерации изображений ИИ

Монорепо: **backend** (Fastify + SQLite) и **frontend** (React + Vite). Сервис
генерирует изображения по текстовому описанию на любом языке, тарифицирует
генерации в кредитах и принимает оплату через Merchant of Record.

> Реализовано по ТЗ v1.0. Весь ключевой цикл работает **локально без внешних
> ключей** — на мок-провайдере ИИ (SVG-плейсхолдеры) и мок-оплате. Реальные
> fal.ai и Lemon Squeezy включаются переменными окружения.

## Быстрый старт

Нужен Node ≥ 20 (в этом окружении установлен через nvm — `node v24`).

```bash
# из корня pickgen/
npm install

# backend .env (мок-режим уже настроен)
cp .env.example backend/.env

# запустить оба сервера (backend :8787, frontend :5173)
npm run dev
```

Открыть http://localhost:5173, войти по любому email — новому пользователю
начисляется 20 кредитов и 10 бесплатных черновиков в день.

Запуск по отдельности:

```bash
npm run dev:backend
npm run dev:frontend
```

## Как это устроено

```
Браузер (React) ──prompt+режим──▶ Backend Fastify
                                    │ проверка кредитов/лимита  ──▶ SQLite
                                    │ перевод + улучшение промпта
                                    │ (ключ ИИ только здесь)
                                    ▼
                                  Провайдер ИИ (mock | fal.ai)
                                    ├ Черновик → Flux Schnell  (1 кредит)
                                    ├ Качество → Flux 2 Pro     (5 кредитов)
                                    └ Текст    → Ideogram/GPT    (10 кредитов)
Оплата: Браузер ▶ MoR (mock | Lemon Squeezy) ▶ webhook ▶ Backend (баланс)
```

- **Ключ ИИ и платежи никогда не попадают в браузер** (FR-8.1) — всё на backend.
- Кредиты списываются атомарно с возвратом при сбое генерации (FR-1.6, NFR-2).
- Проверки оплаты/лимитов только на сервере, их нельзя обойти из клиента (FR-8.3).

## Переменные окружения (`backend/.env`)

| Переменная | Назначение | По умолчанию |
|-----------|-----------|--------------|
| `AI_PROVIDER` | `mock` \| `fal` | `mock` |
| `FAL_KEY` | ключ fal.ai (для `fal`) | — |
| `OPENAI_API_KEY` | перевод промптов (необязательно) | — |
| `PAYMENT_PROVIDER` | `mock` \| `lemonsqueezy` | `mock` |
| `LEMONSQUEEZY_*` | ключ/store/webhook-секрет | — |
| `JWT_SECRET` | подпись сессии | dev-значение |
| `FREE_SIGNUP_CREDITS` | бесплатные кредиты новичку | 20 |
| `FREE_DAILY_DRAFTS` | бесплатных черновиков в день | 10 |
| `RATE_LIMIT_PER_MIN` | лимит генераций в минуту | 12 |

## Структура

```
backend/src
  config.ts              режимы, стили, форматы, тарифы, кредиты
  db/                    схема SQLite + репозитории (users/generations/payments)
  auth/                  JWT-cookie сессии
  providers/image/       ImageProvider: mock.ts, fal.ts
  providers/payment/     PaymentProvider: mock.ts, lemonsqueezy.ts
  services/              prompt (перевод+улучшение), moderation, rateLimit
  routes/                auth, me, generate, gallery, payments
frontend/src
  App.tsx                оркестрация: сессия, вьюхи, тосты
  components/            Generator, Gallery, Pricing, Account, Header, ...
```

## API (кратко)

| Метод | Путь | Назначение |
|------|------|-----------|
| POST | `/api/auth/login` | вход/регистрация по email |
| GET  | `/api/config` | каталог режимов/стилей/тарифов |
| GET  | `/api/me` | текущий пользователь |
| POST | `/api/generate` | генерация (проверка кредитов+лимита) |
| GET/DELETE | `/api/generations[/:id]` | история/удаление |
| POST | `/api/checkout` | создать оплату (MoR) |
| POST | `/api/payments/mock-complete` | завершить мок-оплату (dev) |
| POST | `/api/webhooks/lemonsqueezy` | webhook начисления/возврата |

## Что нужно для продакшена (вне кода)

Из ТЗ, раздел 11–12: оформленный статус ИП/самозанятости (KZ), пользовательское
соглашение, политика возврата и правила контента (требования MoR), реальные
ключи fal.ai и Lemon Squeezy с настроенными variant id пакетов, замена
dev-логина на magic-link/OAuth и Postgres вместо SQLite при росте.
```
