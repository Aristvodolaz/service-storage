# Тестирование API логирования

## Быстрые команды для проверки

### 1. Базовые запросы

```bash
# Проверка работы сервера
curl http://localhost:3006/api/storage/info

# Получить последние 5 логов
curl http://localhost:3006/api/logs?limit=5

# Получить статистику
curl http://localhost:3006/api/logs/statistics
```

### 2. Отчеты (для фронтенда)

```bash
# Отчет по часам
curl "http://localhost:3006/api/logs/report?group_by=hour"

# Отчет по дням за неделю
curl "http://localhost:3006/api/logs/report?date_from=2026-02-01T00:00:00Z&date_to=2026-02-08T00:00:00Z&group_by=day"

# Топ операций
curl "http://localhost:3006/api/logs/report?group_by=endpoint"

# Активность пользователей
curl "http://localhost:3006/api/logs/report?group_by=executor"

# По HTTP статус-кодам
curl "http://localhost:3006/api/logs/report?group_by=status_code"

# По HTTP методам
curl "http://localhost:3006/api/logs/report?group_by=method"
```

### 3. Фильтрация

```bash
# Отчет для конкретного пользователя
curl "http://localhost:3006/api/logs/report?executor=user_123&group_by=day"

# Отчет для конкретной операции
curl "http://localhost:3006/api/logs/report?endpoint=/api/storage/move&group_by=hour"

# С детальными логами
curl "http://localhost:3006/api/logs/report?group_by=hour&include_details=true"
```

### 4. SQL проверки

```sql
-- Проверить, что таблица создана
SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'x_API_Operation_Logs';

-- Посмотреть последние 10 логов
SELECT TOP 10 * FROM x_API_Operation_Logs ORDER BY created_at DESC;

-- Количество логов
SELECT COUNT(*) as total FROM x_API_Operation_Logs;

-- Статистика по результатам
SELECT 
  operation_result,
  COUNT(*) as count
FROM x_API_Operation_Logs
GROUP BY operation_result;

-- Средние время выполнения
SELECT 
  AVG(execution_time_ms) as avg_time,
  MIN(execution_time_ms) as min_time,
  MAX(execution_time_ms) as max_time
FROM x_API_Operation_Logs;
```

## PowerShell (для Windows)

```powershell
# Получить отчет и сохранить в файл
Invoke-WebRequest -Uri "http://localhost:3006/api/logs/report?group_by=hour" -OutFile report.json

# Получить и показать в консоли
(Invoke-WebRequest -Uri "http://localhost:3006/api/logs/report?group_by=hour").Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

## JavaScript (Node.js / Browser Console)

```javascript
// В браузере или Node.js
fetch('http://localhost:3006/api/logs/report?group_by=hour')
  .then(res => res.json())
  .then(data => {
    console.log('Всего операций:', data.data.summary.total_operations);
    console.log('Success rate:', data.data.summary.success_rate + '%');
    console.log('Групп данных:', data.data.grouped_data.length);
    console.table(data.data.grouped_data);
  });
```

## Python

```python
import requests
import json

# Получить отчет
response = requests.get('http://localhost:3006/api/logs/report?group_by=hour')
data = response.json()

# Показать summary
print('Всего операций:', data['data']['summary']['total_operations'])
print('Success rate:', data['data']['summary']['success_rate'] + '%')

# Показать grouped_data
for item in data['data']['grouped_data']:
    print(f"Час {item['hour_of_day']}: {item['total_count']} операций, success rate: {item['success_rate']}%")
```

## Postman Collection

Импортируйте в Postman:

```json
{
  "info": {
    "name": "Operation Logs API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get Logs",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "http://localhost:3006/api/logs?limit=10",
          "host": ["http://localhost:3006"],
          "path": ["api", "logs"],
          "query": [{"key": "limit", "value": "10"}]
        }
      }
    },
    {
      "name": "Get Report by Hour",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "http://localhost:3006/api/logs/report?group_by=hour",
          "host": ["http://localhost:3006"],
          "path": ["api", "logs", "report"],
          "query": [{"key": "group_by", "value": "hour"}]
        }
      }
    },
    {
      "name": "Get Statistics",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "http://localhost:3006/api/logs/statistics",
          "host": ["http://localhost:3006"],
          "path": ["api", "logs", "statistics"]
        }
      }
    }
  ]
}
```

## Проверка работы системы

### Пошаговая проверка:

1. **Запустите сервер**
```bash
npm run docker:prod
# или
npm start
```

2. **Сделайте тестовый запрос**
```bash
curl http://localhost:3006/api/storage/info
```

3. **Проверьте, что лог записался в БД**
```sql
SELECT TOP 1 * FROM x_API_Operation_Logs ORDER BY created_at DESC;
```

4. **Получите отчет**
```bash
curl "http://localhost:3006/api/logs/report?group_by=hour"
```

5. **Проверьте Swagger**
Откройте в браузере:
```
http://localhost:3006/api-docs
```

## Ожидаемые результаты

### Успешный ответ GET /api/logs/report

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_operations": 150,
      "successful_operations": 145,
      "failed_operations": 5,
      "success_rate": "96.67",
      "avg_execution_time_ms": 120,
      "max_execution_time_ms": 450
    },
    "grouped_data": [...],
    "group_by": "hour"
  }
}
```

### Ошибка если таблица не создана

```json
{
  "success": false,
  "message": "Ошибка при генерации отчета: Invalid object name 'x_API_Operation_Logs'."
}
```

**Решение:** Выполните SQL-скрипт `create_operation_logs_table.sql`

## Нагрузочное тестирование

```bash
# Apache Bench - 100 запросов
ab -n 100 -c 10 http://localhost:3006/api/storage/info

# После этого проверьте, что все 100 логов записались
# В SQL:
SELECT COUNT(*) FROM x_API_Operation_Logs 
WHERE created_at >= DATEADD(minute, -1, GETDATE());
```

## Troubleshooting

### Логи не пишутся в БД

1. Проверьте логи приложения:
```bash
docker logs storage-service
# или
pm2 logs storage-service
```

2. Проверьте подключение к БД:
```sql
SELECT 1;
```

3. Проверьте права:
```sql
GRANT INSERT ON x_API_Operation_Logs TO [ваш_пользователь];
```

### API возвращает пустой массив

Это нормально, если в БД еще нет логов. Сделайте несколько запросов к API и повторите.

### Медленная работа

Проверьте индексы:
```sql
SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('x_API_Operation_Logs');
```

Должно быть 4 индекса + PK.
