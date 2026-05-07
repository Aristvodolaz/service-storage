# Быстрое руководство: API отчетов для фронтенда

## 🎯 Основной эндпоинт

```
GET /api/logs/report
```

## 📊 Типы группировки (group_by)

| Тип | Описание | Использование на фронте |
|-----|----------|------------------------|
| `hour` | По часам | График активности по часам |
| `day` | По дням | Недельный/месячный отчет |
| `endpoint` | По операциям | Топ популярных операций |
| `executor` | По пользователям | Активность пользователей |
| `status_code` | По HTTP кодам | Pie chart ошибок |
| `method` | По HTTP методам | GET/POST распределение |

## 🚀 Быстрые примеры

### График за последние 24 часа
```javascript
fetch('/api/logs/report?date_from=2026-02-08T00:00:00Z&date_to=2026-02-09T00:00:00Z&group_by=hour')
```

### Топ операций за неделю
```javascript
fetch('/api/logs/report?date_from=2026-02-01T00:00:00Z&date_to=2026-02-08T00:00:00Z&group_by=endpoint')
```

### Активность конкретного пользователя
```javascript
fetch('/api/logs/report?executor=user_123&group_by=day')
```

### Детальный отчет с логами
```javascript
fetch('/api/logs/report?group_by=hour&include_details=true')
```

## 📦 Структура ответа

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_operations": 1250,
      "successful_operations": 1180,
      "failed_operations": 70,
      "success_rate": "94.40",
      "avg_execution_time_ms": 145,
      "max_execution_time_ms": 3200
    },
    "grouped_data": [
      {
        "total_count": 85,
        "success_count": 82,
        "error_count": 3,
        "success_rate": "96.47",
        "avg_execution_time": 138,
        "min_execution_time": 45,
        "max_execution_time": 450,
        "unique_executors": 12,
        "unique_ips": 8
      }
    ],
    "group_by": "hour"
  }
}
```

## 💡 Готовые данные для графиков

Данные уже подготовлены для использования:
- ✅ Все метрики рассчитаны
- ✅ Success rate в процентах
- ✅ Время округлено
- ✅ Отсортировано по релевантности

Просто возьмите `grouped_data` и используйте в Chart.js, Recharts, или любой библиотеке!

## 📖 Полная документация

- **Детальные примеры:** [REPORT_API_EXAMPLES.md](REPORT_API_EXAMPLES.md)
- **Swagger UI:** http://localhost:3006/api-docs
- **Общая документация:** [OPERATION_LOGGING.md](OPERATION_LOGGING.md)
