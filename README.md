# JasTalant

JasTalant — CRM для футбольных академий. Backend и frontend находятся в одном Git-репозитории.

## Структура

```text
.
├── backend/   Spring Boot, Java 21, Gradle, PostgreSQL
└── frontend/  React, TypeScript, Vite
```

## Локальный запуск

Backend запускается на `http://localhost:8080`. Инструкции по базе данных, переменным окружения и тестам находятся в [backend/README.md](backend/README.md).

Для локальной разработки используем Mailpit и профиль `local`. Для демонстрации
и закрытого пилота — Gmail SMTP и профили `local,smtp`.
Команды и настройка почты: [режимы отправки писем](backend/docs/smtp.md).

Для администраторов и владельца платформы доступна [история действий](backend/docs/audit.md)
с разграничением академий, фильтрами и интерфейсом на трёх языках.

Frontend:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Dev-сервер frontend доступен на `http://localhost:5173` и проксирует запросы `/api` на backend. Адрес backend для прокси можно переопределить через `VITE_API_PROXY_TARGET`.

Секреты и локальные `.env` не добавляются в Git. В репозитории хранятся только файлы `.env.example`.

