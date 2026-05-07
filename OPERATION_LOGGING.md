# Система логирования операций API

## Описание

Система автоматического логирования всех операций API с сохранением в базу данных. Каждый HTTP-запрос к API автоматически записывается в таблицу `x_API_Operation_Logs`.

## Установка и настройка

### 1. Создание таблицы в БД

Перед первым запуском необходимо выполнить SQL-скрипт для создания таблицы логов:

```bash
# Выполните скрипт create_operation_logs_table.sql в вашей БД MS SQL Server
```

SQL-скрипт находится в корне проекта: `create_operation_logs_table.sql`

### 2. Таблица x_API_Operation_Logs

Структура таблицы:

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | BIGINT | Уникальный идентификатор записи |
| `endpoint` | NVARCHAR(500) | URL endpoint запроса |
| `http_method` | NVARCHAR(10) | HTTP метод (GET, POST, PUT, DELETE) |
| `query_params` | NVARCHAR(MAX) | Параметры query string (JSON) |
| `body_params` | NVARCHAR(MAX) | Тело запроса (JSON) |
| `route_params` | NVARCHAR(MAX) | Параметры маршрута (JSON) |
| `ip_address` | NVARCHAR(45) | IP адрес клиента |
| `user_agent` | NVARCHAR(500) | User Agent клиента |
| `status_code` | INT | HTTP код ответа |
| `execution_time_ms` | INT | Время выполнения запроса (мс) |
| `executor` | NVARCHAR(100) | ID исполнителя операции |
| `operation_result` | NVARCHAR(20) | Результат операции (success/error) |
| `error_message` | NVARCHAR(MAX) | Сообщение об ошибке (если есть) |
| `created_at` | DATETIME2 | Дата и время создания записи |

## Автоматическое логирование

Система автоматически логирует все запросы к API. Никаких дополнительных действий не требуется.

### Что логируется:

- ✅ Все HTTP запросы (GET, POST, PUT, DELETE, PATCH)
- ✅ Параметры запроса (query, body, params)
- ✅ IP адрес и User Agent клиента
- ✅ Время выполнения запроса
- ✅ Статус ответа и результат операции
- ✅ Сообщения об ошибках

### Что НЕ логируется (фильтруется):

- 🔒 Пароли
- 🔒 Токены и ключи API
- 🔒 Секретные ключи
- 🔒 Authorization заголовки

Чувствительные данные заменяются на `***FILTERED***`

## Идентификация исполнителя

Система автоматически извлекает ID исполнителя из следующих источников (в порядке приоритета):

1. `req.body.executor` - из тела запроса
2. `req.query.executor` - из параметров query
3. `req.headers['x-executor-id']` - из заголовка запроса

### Пример использования:

```javascript
// В POST запросе
{
  "productId": "12345",
  "executor": "user_123"
}

// В GET запросе
GET /api/storage/info?article=12345&executor=user_123

// В заголовке
headers: {
  'X-Executor-Id': 'user_123'
}
```

## API для просмотра логов

### GET /api/logs/report ⭐ НОВЫЙ - Для отчетов на фронтенде

Получение структурированного отчета с агрегированными данными для построения графиков и таблиц.

**Параметры запроса:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `date_from` | datetime | Начало периода (ISO 8601) |
| `date_to` | datetime | Конец периода (ISO 8601) |
| `executor` | string | Фильтр по исполнителю |
| `endpoint` | string | Фильтр по endpoint |
| `group_by` | string | Тип группировки: `hour`, `day`, `endpoint`, `executor`, `status_code`, `method` |
| `include_details` | boolean | Включить детальные логи (по умолчанию false) |

**Быстрые примеры:**

```bash
# График по часам
GET /api/logs/report?date_from=2026-02-08T00:00:00Z&date_to=2026-02-09T00:00:00Z&group_by=hour

# Топ операций
GET /api/logs/report?group_by=endpoint

# Активность пользователя
GET /api/logs/report?executor=user_123&group_by=day
```

**Подробная документация:** [REPORT_API_EXAMPLES.md](REPORT_API_EXAMPLES.md)

### GET /api/logs

Получение списка логов с фильтрацией и пагинацией.

**Параметры запроса:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `endpoint` | string | Фильтр по endpoint (частичное совпадение) |
| `http_method` | string | HTTP метод (GET, POST, PUT, DELETE, PATCH) |
| `executor` | string | ID исполнителя |
| `status_code` | integer | HTTP код статуса |
| `operation_result` | string | Результат операции (success, error) |
| `date_from` | datetime | Начало периода (ISO 8601) |
| `date_to` | datetime | Конец периода (ISO 8601) |
| `limit` | integer | Количество записей (по умолчанию 100, макс 1000) |
| `offset` | integer | Смещение для пагинации (по умолчанию 0) |

**Примеры запросов:**

```bash
# Все логи за последние 24 часа
GET /api/logs?date_from=2026-02-02T00:00:00Z&date_to=2026-02-03T00:00:00Z

# Только ошибки
GET /api/logs?operation_result=error

# Логи конкретного пользователя
GET /api/logs?executor=user_123

# Логи для конкретного endpoint
GET /api/logs?endpoint=/api/storage/move

# С пагинацией
GET /api/logs?limit=50&offset=100
```

**Пример ответа:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "endpoint": "/api/storage/move/12345",
      "http_method": "POST",
      "query_params": null,
      "body_params": "{\"locationId\":\"67890\",\"executor\":\"user_123\"}",
      "route_params": "{\"productId\":\"12345\"}",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "status_code": 200,
      "execution_time_ms": 145,
      "executor": "user_123",
      "operation_result": "success",
      "error_message": null,
      "created_at": "2026-02-03T10:30:00.000Z"
    }
  ],
  "meta": {
    "total": 1250,
    "limit": 100,
    "offset": 0
  }
}
```

### GET /api/logs/statistics

Получение статистики по логам.

**Параметры запроса:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `date_from` | datetime | Начало периода (ISO 8601) |
| `date_to` | datetime | Конец периода (ISO 8601) |

**Пример запроса:**

```bash
GET /api/logs/statistics?date_from=2026-02-01T00:00:00Z&date_to=2026-02-03T23:59:59Z
```

**Пример ответа:**

```json
{
  "success": true,
  "data": {
    "total": 15420,
    "successful": 14850,
    "errors": 570,
    "successRate": "96.30"
  }
}
```

## Производительность

### Оптимизации:

1. **Асинхронная запись** - логи записываются асинхронно и не блокируют ответ клиенту
2. **Обработка ошибок** - если запись лога не удалась, это не влияет на основной процесс
3. **Индексы БД** - созданы индексы для быстрого поиска по часто используемым полям
4. **Фильтрация данных** - чувствительные данные фильтруются перед сохранением

### Индексы:

- `idx_created_at` - для быстрой сортировки по дате
- `idx_endpoint` - для поиска по endpoint
- `idx_executor` - для поиска по исполнителю
- `idx_status_code` - для фильтрации по статусу

## Архитектура

```
HTTP Request
    ↓
operationLogger (middleware) - перехватывает запрос
    ↓
Routes → Controllers → Services → Repositories
    ↓
operationLogger - перехватывает ответ
    ↓
OperationLogService - подготовка данных
    ↓
OperationLogRepository - запись в БД
    ↓
x_API_Operation_Logs (таблица)
```

## Файлы проекта

### Модели
- `src/models/OperationLog.js` - модель лога операции

### Репозитории
- `src/repositories/OperationLogRepository.js` - работа с БД для логов

### Сервисы
- `src/services/OperationLogService.js` - бизнес-логика логирования

### Middleware
- `src/middlewares/operationLogger.js` - автоматическое логирование запросов

### Контроллеры
- `src/controllers/OperationLogController.js` - обработка запросов к API логов

### Маршруты
- `src/routes/operationLog.js` - эндпоинты для работы с логами

## Swagger документация

Все эндпоинты автоматически документированы в Swagger:

```
http://localhost:3006/api-docs
```

Ищите секцию **"Логи операций"**

## Обслуживание

### Очистка старых логов

Для очистки старых логов создайте SQL задачу (Job) или выполните вручную:

```sql
-- Удалить логи старше 90 дней
DELETE FROM x_API_Operation_Logs
WHERE created_at < DATEADD(day, -90, GETDATE());
```

### Мониторинг размера таблицы

```sql
-- Проверить количество записей
SELECT COUNT(*) as total_logs FROM x_API_Operation_Logs;

-- Проверить размер таблицы
EXEC sp_spaceused 'x_API_Operation_Logs';
```

## Примеры использования

### Анализ ошибок за день

```bash
GET /api/logs?operation_result=error&date_from=2026-02-03T00:00:00Z&date_to=2026-02-03T23:59:59Z
```

### Аудит действий пользователя

```bash
GET /api/logs?executor=user_123&date_from=2026-02-01T00:00:00Z
```

### Мониторинг производительности

```bash
# Получить логи с временем выполнения > 1 секунды
SELECT * FROM x_API_Operation_Logs
WHERE execution_time_ms > 1000
ORDER BY execution_time_ms DESC;
```

### Отчет по популярным endpoint

```sql
SELECT 
  endpoint,
  COUNT(*) as request_count,
  AVG(execution_time_ms) as avg_time_ms
FROM x_API_Operation_Logs
WHERE created_at >= DATEADD(day, -7, GETDATE())
GROUP BY endpoint
ORDER BY request_count DESC;
```

## Безопасность

1. **Фильтрация чувствительных данных** - автоматическая
2. **Ограничение доступа к логам** - рекомендуется добавить аутентификацию для `/api/logs/*`
3. **Ограничение размера данных** - большие JSON объекты обрезаются

## Решение проблем

### Логи не записываются

1. Проверьте, создана ли таблица `x_API_Operation_Logs`
2. Проверьте права доступа пользователя БД
3. Проверьте логи приложения на наличие ошибок
4. Убедитесь, что middleware подключен в `app.js`

### Ошибка "таблица не найдена"

Выполните SQL-скрипт `create_operation_logs_table.sql`

### Медленная работа API

Логирование асинхронное и не должно влиять на производительность. Если есть проблемы:
1. Проверьте индексы БД
2. Очистите старые логи
3. Оптимизируйте запросы к таблице логов

## Контакты и поддержка

Для вопросов и предложений обращайтесь к команде разработки.
