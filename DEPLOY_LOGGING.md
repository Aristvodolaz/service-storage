# Инструкция по развертыванию системы логирования на сервере

## Шаги развертывания

### 1. Подготовка базы данных

Подключитесь к вашему MS SQL Server и выполните SQL-скрипт:

```bash
# Из файла create_operation_logs_table.sql
```

Или выполните SQL напрямую:

```sql
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'x_API_Operation_Logs')
BEGIN
    CREATE TABLE x_API_Operation_Logs (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        endpoint NVARCHAR(500) NOT NULL,
        http_method NVARCHAR(10) NOT NULL,
        query_params NVARCHAR(MAX),
        body_params NVARCHAR(MAX),
        route_params NVARCHAR(MAX),
        ip_address NVARCHAR(45),
        user_agent NVARCHAR(500),
        status_code INT,
        execution_time_ms INT,
        executor NVARCHAR(100),
        operation_result NVARCHAR(20),
        error_message NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE(),
        INDEX idx_created_at (created_at DESC),
        INDEX idx_endpoint (endpoint),
        INDEX idx_executor (executor),
        INDEX idx_status_code (status_code)
    );
END
GO
```

### 2. Проверка подключения к БД

Убедитесь, что приложение имеет права на запись в таблицу `x_API_Operation_Logs`:

```sql
-- Проверьте права пользователя
GRANT SELECT, INSERT ON x_API_Operation_Logs TO [ваш_пользователь];
```

### 3. Пересборка проекта на сервере

#### Вариант A: Docker (рекомендуется)

```bash
# Остановить текущие контейнеры
npm run docker:stop

# Пересобрать и запустить (production)
npm run docker:prod

# Или для разработки
npm run docker:dev
```

#### Вариант B: Без Docker

```bash
# Установить зависимости (если есть новые)
npm install

# Перезапустить приложение
npm start
```

#### Вариант C: С помощью PM2

```bash
# Перезапустить приложение
pm2 restart storage-service

# Или полная перезагрузка
pm2 stop storage-service
pm2 delete storage-service
pm2 start src/server.js --name storage-service
```

### 4. Проверка работы системы

#### 4.1. Проверьте запуск сервера

```bash
# Просмотр логов Docker
npm run docker:logs

# Или для PM2
pm2 logs storage-service
```

Должны увидеть сообщение: `Сервер запущен на порту 3006`

#### 4.2. Выполните тестовый запрос

```bash
# Тестовый запрос к API
curl http://localhost:3006/api/storage/info

# Или
curl http://your-server-ip:3006/api/storage/info
```

#### 4.3. Проверьте, что лог записался в БД

```sql
-- Проверить последние логи
SELECT TOP 10 * 
FROM x_API_Operation_Logs 
ORDER BY created_at DESC;
```

Должна появиться запись о вашем тестовом запросе.

#### 4.4. Проверьте API логов

```bash
# Получить последние логи через API
curl http://localhost:3006/api/logs?limit=10

# Получить статистику
curl http://localhost:3006/api/logs/statistics
```

### 5. Проверка Swagger документации

Откройте в браузере:

```
http://localhost:3006/api-docs
```

или

```
http://your-server-ip:3006/api-docs
```

Найдите секцию **"Логи операций"** - там должны быть два новых endpoint.

### 6. Мониторинг работы

#### Отслеживание логов в реальном времени

```bash
# Docker
docker logs -f storage-service

# PM2
pm2 logs storage-service --lines 100
```

#### SQL запросы для мониторинга

```sql
-- Количество логов за последний час
SELECT COUNT(*) as logs_last_hour
FROM x_API_Operation_Logs
WHERE created_at >= DATEADD(hour, -1, GETDATE());

-- Количество ошибок за последний час
SELECT COUNT(*) as errors_last_hour
FROM x_API_Operation_Logs
WHERE created_at >= DATEADD(hour, -1, GETDATE())
  AND operation_result = 'error';

-- Средние время выполнения запросов
SELECT 
  AVG(execution_time_ms) as avg_time_ms,
  MAX(execution_time_ms) as max_time_ms,
  MIN(execution_time_ms) as min_time_ms
FROM x_API_Operation_Logs
WHERE created_at >= DATEADD(hour, -1, GETDATE());
```

## Возможные проблемы и решения

### Проблема: Таблица не создается

**Решение:**
1. Проверьте права пользователя БД
2. Выполните скрипт под пользователем с правами CREATE TABLE
3. Проверьте синтаксис SQL для вашей версии MS SQL Server

### Проблема: Логи не записываются

**Решение:**
1. Проверьте логи приложения на наличие ошибок
2. Убедитесь, что таблица создана: `SELECT * FROM x_API_Operation_Logs`
3. Проверьте права на INSERT в таблицу
4. Убедитесь, что middleware подключен в `src/app.js`

### Проблема: Ошибка "Connection timeout"

**Решение:**
1. Проверьте подключение к БД в `src/config/database.js`
2. Убедитесь, что сервер БД доступен
3. Проверьте настройки firewall

### Проблема: API /api/logs не работает

**Решение:**
1. Убедитесь, что роуты зарегистрированы в `src/app.js`
2. Проверьте, что файл `src/routes/operationLog.js` существует
3. Перезапустите сервер

## Откат изменений

Если нужно отключить логирование в БД:

### 1. Временное отключение

Закомментируйте middleware в `src/app.js`:

```javascript
// app.use(operationLogger); // Временно отключено
```

Перезапустите сервер.

### 2. Полное удаление

```bash
# Удалить файлы
rm src/middlewares/operationLogger.js
rm src/services/OperationLogService.js
rm src/repositories/OperationLogRepository.js
rm src/models/OperationLog.js
rm src/controllers/OperationLogController.js
rm src/routes/operationLog.js

# Удалить из app.js импорты и использование
```

### 3. Удаление таблицы из БД

```sql
DROP TABLE x_API_Operation_Logs;
```

## Рекомендации

1. **Регулярно очищайте старые логи** (старше 90 дней)
2. **Мониторьте размер таблицы** логов
3. **Настройте резервное копирование** таблицы логов
4. **Добавьте аутентификацию** для доступа к `/api/logs/*` endpoint
5. **Настройте алерты** при превышении порога ошибок

## Автоматическая очистка старых логов

Создайте SQL Agent Job для автоматической очистки:

```sql
-- Создать Job для очистки логов старше 90 дней
-- Запускать каждую ночь в 02:00

USE [msdb];
GO

EXEC sp_add_job
    @job_name = N'CleanupOperationLogs',
    @enabled = 1;
GO

EXEC sp_add_jobstep
    @job_name = N'CleanupOperationLogs',
    @step_name = N'Delete old logs',
    @subsystem = N'TSQL',
    @command = N'DELETE FROM x_API_Operation_Logs WHERE created_at < DATEADD(day, -90, GETDATE());',
    @database_name = N'ваша_база_данных';
GO

EXEC sp_add_schedule
    @schedule_name = N'Daily at 2 AM',
    @freq_type = 4,
    @freq_interval = 1,
    @active_start_time = 20000;
GO

EXEC sp_attach_schedule
    @job_name = N'CleanupOperationLogs',
    @schedule_name = N'Daily at 2 AM';
GO

EXEC sp_add_jobserver
    @job_name = N'CleanupOperationLogs';
GO
```

## Контрольный список развертывания

- [ ] SQL-скрипт создания таблицы выполнен
- [ ] Таблица `x_API_Operation_Logs` создана и доступна
- [ ] Права на INSERT в таблицу предоставлены
- [ ] Код обновлен на сервере (git pull)
- [ ] Проект пересобран и перезапущен
- [ ] Сервер успешно запустился
- [ ] Тестовый запрос выполнен
- [ ] Лог записался в БД
- [ ] API `/api/logs` работает
- [ ] Swagger документация обновлена
- [ ] Мониторинг настроен

## Завершение

После успешного развертывания система автоматически начнет логировать все операции. Никаких дополнительных действий не требуется.

Для просмотра логов используйте:
- API: `GET /api/logs`
- SQL: `SELECT * FROM x_API_Operation_Logs`
- Swagger: `http://your-server:3006/api-docs`
