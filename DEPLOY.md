# Деплой PickGen (бесплатно): Neon + Render + Vercel

Схема: **фронтенд → Vercel**, **бэкенд → Render**, **база → Neon (Postgres)**.
Всё на бесплатных тарифах. Занимает ~30–40 минут.

> Локальная разработка при этом не меняется: без `DATABASE_URL` бэкенд по-прежнему
> использует локальный SQLite.

---

## Шаг 0. Выложить код на GitHub

Render и Vercel деплоят из GitHub-репозитория.

1. Создай аккаунт на https://github.com (если нет) и новый **приватный** репозиторий, напр. `pickgen`.
2. В терминале в папке проекта:
   ```bash
   cd /Users/ielts.gg/pickgen
   git add -A
   git commit -m "PickGen MVP"
   git branch -M main
   git remote add origin https://github.com/ТВОЙ_ЛОГИН/pickgen.git
   git push -u origin main
   ```
   > `.env` с ключами НЕ попадёт в репозиторий — он в `.gitignore`. Секреты вводятся
   > отдельно в панелях Render (см. ниже).

---

## Шаг 1. База данных — Neon (Postgres)

1. Зарегистрируйся на https://neon.tech (можно через GitHub).
2. **Create project** → имя `pickgen`, регион поближе (напр. EU/Frankfurt).
3. После создания открой **Connection string** (Dashboard → Connect) и скопируй строку вида:
   ```
   postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
   Сохрани её — понадобится на шаге 2 как `DATABASE_URL`.

---

## Шаг 2. Бэкенд — Render

1. Зарегистрируйся на https://render.com (через GitHub).
2. **New → Blueprint** → выбери свой репозиторий `pickgen`. Render найдёт `render.yaml`.
3. Перед деплоем задай значения секретов (поля с «sync: false»):
   - `DATABASE_URL` — строка из Neon (шаг 1).
   - `FAL_KEY` — твой ключ fal.ai (`616d5e18-…:4f76e8…`).
   - `CLIENT_ORIGIN` — пока поставь заглушку `https://example.vercel.app` (обновим на шаге 4).
   - `JWT_SECRET` — Render сгенерирует сам.
4. Нажми **Apply / Deploy**. Дождись сборки (первый раз ~2–4 мин).
5. Скопируй адрес сервиса, напр. `https://pickgen-backend.onrender.com`.
6. Проверь: открой `https://pickgen-backend.onrender.com/api/health` — должно вернуть
   `{"status":"ok","ai":"fal","payment":"mock"}`.

> ⚠️ Бесплатный Render «засыпает» после 15 мин без запросов — первый заход после паузы
> грузится ~30–60 сек. Это нормально для free-тарифа.

---

## Шаг 3. Фронтенд — Vercel

1. Зарегистрируйся на https://vercel.com (через GitHub).
2. **Add New → Project** → импортируй репозиторий `pickgen`.
3. В настройках проекта:
   - **Root Directory** → выбери `frontend`.
   - Framework Preset определится как **Vite** автоматически.
   - Раздел **Environment Variables** → добавь:
     - `VITE_API_URL` = адрес бэкенда с шага 2, напр. `https://pickgen-backend.onrender.com`
4. **Deploy**. Через ~1–2 мин получишь адрес, напр. `https://pickgen.vercel.app`.

---

## Шаг 4. Связать фронт и бэк (важно!)

Бэкенд должен разрешить запросы именно с адреса фронтенда (CORS + cookies):

1. Вернись в **Render → сервис pickgen-backend → Environment**.
2. Измени `CLIENT_ORIGIN` на реальный адрес Vercel с шага 3, напр. `https://pickgen.vercel.app`
   (без слэша в конце).
3. Сохрани — Render передеплоит автоматически.

---

## Шаг 5. Проверка

Открой свой `https://pickgen.vercel.app`:
- Войди по email → должно начислить 20 кредитов.
- Сгенерируй картинку → пойдёт реальная генерация через fal.ai.
- Галерея, тарифы (мок-оплата), темы — работают.

Готово — сайт живёт в интернете 🎉

---

## Частые проблемы

| Симптом | Причина / решение |
|---|---|
| Логин «проходит», но сразу разлогинивает | `CLIENT_ORIGIN` на Render ≠ адрес Vercel. Проверь шаг 4 (точное совпадение, https, без слэша). |
| Ошибка CORS в консоли браузера | То же — не совпадает `CLIENT_ORIGIN`. |
| Генерация: «Сервис временно недоступен» | Кончился баланс fal.ai (пополни) или неверный `FAL_KEY`. |
| Первый запрос очень долгий | Render проснулся из сна (free-тариф). Норма. |
| База «пустая» после передеплоя | Проверь, что `DATABASE_URL` задан — иначе бэкенд падает на SQLite (на Render он эфемерный). |

---

## Куда расти дальше

- Свой домен (`pickgen.com`) — привязывается в Vercel и Render.
- Реальная оплата — Lemon Squeezy (заменить `PAYMENT_PROVIDER=lemonsqueezy` + ключи).
- Платный Render ($7/мес) — чтобы бэкенд не «засыпал».
