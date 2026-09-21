# Расписание тренировок

Занятие содержит группу, назначенного ей тренера, дату, время начала и окончания,
место и статус `SCHEDULED` или `CANCELLED`. В одной группе не может быть двух
занятий с одинаковыми датой и временем начала.

Администратор создаёт, изменяет и удаляет занятия. Тренер читает календарь только
назначенных ему групп. Родителю общий календарь академии недоступен.

## API

```text
GET    /api/academies/{academyId}/trainings?from=YYYY-MM-DD&to=YYYY-MM-DD&groupId={optional}
GET    /api/academies/{academyId}/trainings/{trainingId}
POST   /api/academies/{academyId}/trainings
PUT    /api/academies/{academyId}/trainings/{trainingId}
DELETE /api/academies/{academyId}/trainings/{trainingId}
```

Диапазон календаря ограничен 92 днями. Тренер в запросе должен иметь роль
`COACH` в этой академии и быть назначен выбранной группе.

Посещаемость конкретного занятия:

```text
GET /api/academies/{academyId}/trainings/{trainingId}/attendance
PUT /api/academies/{academyId}/trainings/{trainingId}/attendance
```

Отмечать будущую или отменённую тренировку нельзя. Каждое занятие имеет отдельную
ведомость, поэтому две тренировки одной группы в один день не смешивают отметки.
Удаление занятия с сохранённой ведомостью запрещает внешний ключ; его следует
оставить в истории или перевести в отменённый статус.
