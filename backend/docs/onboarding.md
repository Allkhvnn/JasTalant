# Подключение академий

## Настройка

Нужны Java 21, PostgreSQL, обязательный `JWT_SECRET_BASE64` (минимум 32 случайных
байта в Base64) и SMTP. Для локальной разработки `docker compose up -d --wait`
запускает PostgreSQL и Mailpit. Профиль `local` использует SMTP localhost:1025,
веб-интерфейс почты доступен на http://localhost:8025.

Для рабочего SMTP задайте `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`,
`SMTP_AUTH=true`, `SMTP_STARTTLS=true`, `MAIL_FROM`. Публичный сервер должен
работать через HTTPS. Не храните секреты в Git и не используйте тестовый JWT-ключ.
Перед публичным запуском настройте ограничение частоты регистрации и входа на
reverse proxy; прикладное ограничение сейчас есть у повторной отправки кода и
писем восстановления пароля.

## Первое создание владельца платформы

Команда запускается оператором сервера один раз, с теми же DB_PASSWORD и
JWT_SECRET_BASE64, которые используются приложением. Приложение не поднимает
HTTP-сервер и завершает работу после создания владельца.

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL = 'your-email@example.kz'
$env:BOOTSTRAP_ADMIN_NAME = 'Your name'
$ownerPassword = Read-Host 'Owner password (12–128 characters)' -AsSecureString
$env:BOOTSTRAP_ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $ownerPassword).Password
try {
    .\gradlew.bat bootRun --args='--spring.profiles.active=local,bootstrap-admin --spring.main.web-application-type=none'
} finally {
    Remove-Item Env:BOOTSTRAP_ADMIN_PASSWORD -ErrorAction SilentlyContinue
}
```

Не передавайте пароль аргументом командной строки. Профиль не назначает права
существующему пользователю и отказывается создавать второго SUPER_ADMIN.
Email владельца считается подтверждённым этим доверенным действием оператора.
После этого запускайте обычный профиль `local` и входите через API.

## API

JSON используется для запросов и ответов. Авторизация: `Authorization: Bearer <accessToken>`.
JWT действует 15 минут. Refresh-токен действует 30 дней, ротируется при каждом
обновлении и передаётся только в cookie `jastalant_refresh` с `HttpOnly`,
`SameSite=Lax` и `Secure` в рабочем профиле. В БД хранятся только хеши токенов.
Клиент не может задать platformRole, academyId или emailVerified при регистрации.

| Метод | URL | Назначение |
|---|---|---|
| POST | `/api/auth/register` | Создать пользователя и заявку, отправить письмо |
| POST | `/api/auth/verify-email` | Подтвердить email одноразовым кодом |
| POST | `/api/auth/login` | Войти и получить JWT |
| POST | `/api/auth/refresh` | Обновить JWT и ротировать refresh-cookie |
| POST | `/api/auth/logout` | Отозвать refresh-сессию и удалить cookie |
| POST | `/api/auth/forgot-password` | Запросить письмо восстановления |
| POST | `/api/auth/reset-password` | Задать новый пароль по одноразовому токену |
| GET | `/api/auth/me` | Получить свою учётную запись |
| GET | `/api/auth/academies` | Получить академии и роли текущего пользователя |
| POST | `/api/auth/resend-verification` | Отправить новый код себе, нужен JWT |
| GET | `/api/applications/mine` | Посмотреть свою заявку и причину отказа |
| GET | `/api/platform/applications?status=PENDING&page=0&size=20` | Список заявок для SUPER_ADMIN |
| POST | `/api/platform/applications/{id}/approve` | Одобрить заявку |
| POST | `/api/platform/applications/{id}/reject` | Отклонить заявку с причиной |
| GET | `/api/academies/{id}` | Прочитать академию, если есть членство или SUPER_ADMIN |

Регистрация — ответ 201:

```json
{
  "academyName": "Almaty Football Academy",
  "fullName": "Academy administrator",
  "email": "admin@example.kz",
  "password": "your-long-unique-password"
}
```

В ответе есть `id` заявки и статус `EMAIL_UNVERIFIED`. Код берётся из письма,
не из HTTP-ответа или логов. Подтверждение — `POST /api/auth/verify-email`:

```json
{"token": "код-из-письма"}
```

Успешный ответ 204 переводит заявку в `PENDING`. Код действует 24 часа и
используется один раз; повторная отправка аннулирует старый код. Между отправками
должно пройти 60 секунд. Сбой SMTP возвращает 503 и откатывает операцию.
При редком сбое фиксации транзакции после отправки письма код может оказаться
недействительным; повторите регистрацию или запросите новый код.

Вход — `POST /api/auth/login`:

```json
{"email": "admin@example.kz", "password": "your-long-unique-password"}
```

Ответ содержит `accessToken`, `tokenType=Bearer`, `expiresIn=900` и устанавливает
refresh-cookie. Frontend восстанавливает сессию после перезагрузки и обновляет JWT
за минуту до истечения.
Вход возможен до подтверждения и одобрения, но не открывает доступ к CRM.

Запрос восстановления всегда отвечает 204, независимо от существования email.
Ссылка действует один час и используется один раз. Успешная смена пароля отзывает
все refresh-сессии пользователя; на остальных устройствах потребуется новый вход.

`GET /api/auth/academies` возвращает только реальные членства текущего пользователя:

```json
[
  {
    "academyId": "UUID",
    "academyName": "Test Academy",
    "roles": ["ADMIN"]
  }
]
```

Этот endpoint используется клиентом после каждого входа, чтобы определить доступ к академии
для администратора, тренера или родителя. Права в ответе не заменяют серверную проверку:
каждый запрос к данным академии всё равно проверяет актуальное членство в БД.

SUPER_ADMIN отправляет POST approve без тела либо POST reject с телом:

```json
{"reason": "Уточните данные академии"}
```

Одобрение создаёт академию, членство с ролью ADMIN и статус APPROVED одной
транзакцией. Заявка блокируется при рассмотрении; повторное или конкурирующее
решение возвращает 409. Отклонение не создаёт академию. В текущем MVP у пользователя
одна заявка, повторная подача отклонённой заявки и редактирование ещё не реализованы.

Ошибки: 400 — неверные данные/код; 401 — нет действительного токена или неверный
пароль; 403 — недостаточно прав; 404 — нет своей заявки/доступной академии;
409 — дубликат или недопустимый переход статуса; 429 — частая повторная отправка;
503 — недоступен SMTP. Списки ограничены 100 заявками на страницу.

## Границы реализации и проверки

Frontend содержит формы регистрации, входа, восстановления и смены пароля. SMTP в HTTP-тестах
подменён: реальные письма внешним адресатам тесты не отправляют. Тесты используют
реальные PostgreSQL и JWT; проверяют подтверждение, отказ, границы доступа,
удаление прав владельца, откат при ошибке почты и конкурирующее одобрение.

Группы, игроки и назначения тренеров описаны в [roster.md](roster.md), приглашения
и связь родителя с ребёнком — в [invitations.md](invitations.md).
RLS, уведомление об одобрении по email и повторная подача заявки
остаются следующими этапами. Результат рассмотрения уже доступен в личной заявке.

Используются стандартные механизмы [Spring Security JWT](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html)
и [Spring JavaMailSender](https://docs.spring.io/spring-framework/reference/integration/email.html).
