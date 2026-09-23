# Подготовка JasTalant к production

Production-контур запускает PostgreSQL, Spring Boot и собранный React frontend в одной закрытой Docker-сети. Наружу публикуется только frontend на `127.0.0.1:8080`; домен и HTTPS должен обслуживать reverse proxy на сервере.

## 1. Настройка SMTP

Создайте аккаунт у SMTP-провайдера и подтвердите домен отправителя. В DNS домена настройте записи SPF, DKIM и DMARC по инструкции провайдера. Пароль обычного почтового ящика в репозиторий добавлять нельзя: используйте отдельный SMTP API key или app password.

Скопируйте `.env.production.example` в `.env.production` и заполните:

- `MAIL_FROM` — подтвержденный адрес отправителя;
- `SMTP_HOST` и `SMTP_PORT` — адрес и порт провайдера;
- `SMTP_USERNAME` и `SMTP_PASSWORD` — выданные SMTP-данные;
- `FRONTEND_URL` — публичный HTTPS-адрес CRM.

По умолчанию используется SMTP submission на порту `587` с авторизацией и STARTTLS. При старте backend проверяет соединение с SMTP и завершает запуск с ошибкой, если данные неверны. После первого успешного запуска проверьте регистрацию, подтверждение email, приглашение и сброс пароля на реальном адресе.

## 2. Секреты

Создайте отдельные случайные значения для production:

```bash
openssl rand -base64 48
openssl rand -base64 64
```

Первое значение можно использовать как `DB_PASSWORD`, второе — как `JWT_SECRET_BASE64`. Файл `.env.production` исключен из Git. Храните его на сервере с доступом только для пользователя, запускающего приложение.

## 3. Первый запуск на сервере

На сервере должны быть установлены Docker Engine и Docker Compose. Из корня репозитория:

```bash
cp .env.production.example .env.production
# заполните .env.production
docker compose --env-file .env.production -f compose.prod.yaml up -d --build
docker compose --env-file .env.production -f compose.prod.yaml ps
```

Проверки на самом сервере:

```bash
curl --fail http://127.0.0.1:8080/healthz
docker compose --env-file .env.production -f compose.prod.yaml exec backend curl --fail http://localhost:8080/actuator/health/readiness
```

Перед открытием сервиса пользователям настройте домен, TLS-сертификат и проксирование на `http://127.0.0.1:8080`. Значение `FRONTEND_URL` должно точно совпадать с внешним HTTPS-адресом.

## 4. CI/CD

Workflow `.github/workflows/ci.yml` при push и pull request запускает backend-тесты, frontend lint/build и сборку обоих контейнеров. После успешного push в `main` контейнеры публикуются в GitHub Container Registry:

- `ghcr.io/allkhvnn/jastalant-backend:latest`;
- `ghcr.io/allkhvnn/jastalant-frontend:latest`.

Тег Git вида `v1.0.0` дополнительно создает версии образов `1.0.0` и `1.0`. Для запуска опубликованных образов задайте `BACKEND_IMAGE` и `FRONTEND_IMAGE` в `.env.production`, затем выполните:

```bash
docker compose --env-file .env.production -f compose.prod.yaml pull
docker compose --env-file .env.production -f compose.prod.yaml up -d --no-build
```

Автоматический вход на сервер и перезапуск контейнеров нужно добавить после выбора хостинга. Для этого потребуются адрес сервера, SSH-пользователь, SSH-ключ и путь установки; эти значения будут храниться в GitHub Actions Secrets.

## 5. Перед публичным запуском

- включите обязательный HTTPS и не публикуйте порт PostgreSQL;
- настройте ежедневный `pg_dump` и проверьте восстановление копии;
- настройте внешний мониторинг `https://ваш-домен/healthz`;
- подключите сбор ошибок и централизованные логи;
- проверьте политику хранения персональных данных детей и доступ родителей;
- проведите smoke-тест всех ролей и изоляции двух академий;
- сохраните SMTP, database и JWT-секреты вне репозитория.
