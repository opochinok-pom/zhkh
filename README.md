# ЖКХ — Учёт коммунальных платежей 2026

Тёмный золотой интерфейс · 10 объектов · 9 услуг · AI-разбор квитанций · Голосовой ввод

---

## ⚡ Быстрый старт (локально)

```bash
# 1. Установить зависимости
cd backend && npm install
cd ../frontend && npm install

# 2. Заполнить Supabase начальными данными
cd backend && node seed.js

# 3. Запустить backend (порт 3001)
cd backend && npm run dev

# 4. Запустить frontend (порт 5173)
cd frontend && npm run dev

# Открыть: http://localhost:5173
```

---

## 🗄️ Supabase — создать таблицы

Перейди в **Supabase Dashboard → SQL Editor** и выполни содержимое файла `supabase/schema.sql`.

Подключение:
- URL: `https://pyabrzbliszumqfuibtl.supabase.co`
- Anon Key: в `.env` файле

---

## 🤖 Anthropic API

Получи ключ на [console.anthropic.com](https://console.anthropic.com) и добавь в `backend/.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 🚀 Деплой на Render (бесплатно)

1. Создай аккаунт на [render.com](https://render.com)
2. **New → Web Service** → подключи GitHub репозиторий
3. **Backend:**
   - Root directory: `backend`
   - Build: `npm install`
   - Start: `npm start`
   - Env vars: `SUPABASE_URL`, `SUPABASE_KEY`, `ANTHROPIC_API_KEY`
4. **Frontend:**
   - New → Static Site → Root: `frontend`
   - Build: `npm install && npm run build`
   - Publish dir: `dist`
   - Env var: `VITE_API_URL=https://YOUR-BACKEND.onrender.com`

---

## 🚀 Деплой на Railway

1. Установи [Railway CLI](https://docs.railway.app/develop/cli)
2. `railway login && railway new`
3. Добавь env vars через dashboard
4. `railway up`

---

## 📁 Структура проекта

```
zhkh/
├── backend/
│   ├── server.js          # Express API
│   ├── seed.js            # Импорт начальных данных
│   ├── package.json
│   └── .env               # SUPABASE_URL, SUPABASE_KEY, ANTHROPIC_API_KEY
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Главный компонент
│   │   ├── index.css      # Тёмная золотая тема
│   │   └── components/
│   │       ├── PayTable.jsx      # Таблица месяца
│   │       ├── YearTable.jsx     # Годовая сводка
│   │       ├── AIPanel.jsx       # AI-разбор квитанций
│   │       ├── CommandBar.jsx    # Голос/текст команды
│   │       ├── HistoryPanel.jsx  # История изменений
│   │       └── Toast.jsx         # Уведомления
│   └── vite.config.js
├── supabase/
│   └── schema.sql         # CREATE TABLE payments, history
└── render.yaml            # Деплой конфиг
```

---

## ✨ Функции

| Функция | Описание |
|---------|----------|
| 📅 Выбор месяца | Табы январь–декабрь в шапке |
| 📊 Режим "ВСЕ" | Годовая сводка с группировкой по месяцам или услугам |
| ✏️ Редактирование | Клик на ячейку → ввод суммы → Enter |
| 🤖 AI-квитанция | Фото → Claude Opus → автозаполнение |
| 🎤 Голос/текст | "Л25/28 электроэнергия июнь 3500" |
| ⚠️ Контроль | Красные точки в незаполненных ячейках |
| 📋 История | Все изменения с временными метками |
| ⬇️ CSV | Экспорт всего года одной кнопкой |
| 🔄 Синхронизация | Данные в Supabase, доступны с любого устройства |
