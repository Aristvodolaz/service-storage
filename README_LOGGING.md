# 📊 Система логирования операций API

Полнофункциональная система автоматического логирования всех API операций с сохранением в базу данных и API для построения отчетов.

## 🎯 Основные возможности

- ✅ **Автоматическое логирование** - все запросы логируются автоматически
- ✅ **База данных** - хранение в MS SQL Server с индексами
- ✅ **Безопасность** - фильтрация паролей и токенов
- ✅ **API для отчетов** - готовые данные для графиков на фронтенде
- ✅ **Swagger документация** - интерактивная документация API
- ✅ **Высокая производительность** - асинхронная запись, не блокирует запросы

## 🚀 Быстрый старт

### 1. Создайте таблицу в БД
```bash
sqlcmd -S ваш_сервер -i create_operation_logs_table.sql
```

### 2. Пересоберите проект
```bash
npm run docker:prod
```

### 3. Готово! Логи пишутся автоматически

## 📊 API для отчетов на фронтенде

### Эндпоинт
```
GET /api/logs/report
```

### Примеры использования

**График активности по часам:**
```javascript
fetch('/api/logs/report?group_by=hour')
  .then(res => res.json())
  .then(data => {
    // data.grouped_data готов для Chart.js
    console.log('Успешных операций:', data.summary.successful_operations);
  });
```

**Топ популярных операций:**
```javascript
fetch('/api/logs/report?group_by=endpoint')
  .then(res => res.json())
  .then(data => {
    // Список endpoint с количеством вызовов
    data.grouped_data.forEach(item => {
      console.log(item.endpoint, item.total_count);
    });
  });
```

**Активность пользователя:**
```javascript
fetch('/api/logs/report?executor=user_123&group_by=day')
  .then(res => res.json())
  .then(data => {
    // Статистика по дням для конкретного пользователя
  });
```

### Типы группировки

| Параметр `group_by` | Описание |
|---------------------|----------|
| `hour` | График по часам |
| `day` | Отчет по дням |
| `endpoint` | Топ операций |
| `executor` | По пользователям |
| `status_code` | HTTP коды |
| `method` | GET/POST/PUT |

### Пример ответа

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_operations": 1250,
      "successful_operations": 1180,
      "failed_operations": 70,
      "success_rate": "94.40",
      "avg_execution_time_ms": 145
    },
    "grouped_data": [
      {
        "hour_of_day": 14,
        "total_count": 85,
        "success_count": 82,
        "error_count": 3,
        "success_rate": "96.47",
        "avg_execution_time": 138
      }
    ]
  }
}
```

## 📖 Документация

| Файл | Описание |
|------|----------|
| **[LOGGING_SUMMARY.md](LOGGING_SUMMARY.md)** | 📋 **Итоговая справка** - начните отсюда |
| [REPORT_API_EXAMPLES.md](REPORT_API_EXAMPLES.md) | 💡 Примеры API с кодом для фронтенда |
| [REPORT_QUICK_GUIDE.md](REPORT_QUICK_GUIDE.md) | ⚡ Быстрое руководство по отчетам |
| [DEPLOY_LOGGING.md](DEPLOY_LOGGING.md) | 🚀 Инструкция по развертыванию |
| [OPERATION_LOGGING.md](OPERATION_LOGGING.md) | 📚 Полная техническая документация |
| [LOGGING_QUICK_START.md](LOGGING_QUICK_START.md) | 🎯 Быстрый старт |

## 🎨 Готовый React компонент

```jsx
import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';

const OperationsDashboard = () => {
  const [report, setReport] = useState(null);

  useEffect(() => {
    fetch('/api/logs/report?group_by=hour')
      .then(res => res.json())
      .then(data => setReport(data.data));
  }, []);

  if (!report) return <div>Загрузка...</div>;

  const chartData = {
    labels: report.grouped_data.map(i => `${i.hour_of_day}:00`),
    datasets: [{
      label: 'Операции',
      data: report.grouped_data.map(i => i.total_count)
    }]
  };

  return (
    <div>
      <h2>Операций сегодня: {report.summary.total_operations}</h2>
      <p>Success Rate: {report.summary.success_rate}%</p>
      <Line data={chartData} />
    </div>
  );
};
```

Полный пример в [REPORT_API_EXAMPLES.md](REPORT_API_EXAMPLES.md)

## 🔗 Swagger UI

Интерактивная документация:
```
http://localhost:3006/api-docs
```

Раздел: **"Логи операций"**

## 📊 Что логируется

- ✅ Endpoint и HTTP метод
- ✅ Параметры запроса (query, body, params)
- ✅ IP адрес и User Agent
- ✅ Статус ответа
- ✅ Время выполнения
- ✅ ID исполнителя (если указан)
- ✅ Сообщения об ошибках
- 🔒 Пароли и токены фильтруются

## 🎯 API Endpoints

```bash
# Получить логи
GET /api/logs?limit=100&offset=0

# Статистика
GET /api/logs/statistics

# Отчет для фронтенда ⭐
GET /api/logs/report?group_by=hour
```

## 💾 Структура БД

Таблица: `x_API_Operation_Logs`

| Поле | Тип | Описание |
|------|-----|----------|
| id | BIGINT | ID записи |
| endpoint | NVARCHAR(500) | URL endpoint |
| http_method | NVARCHAR(10) | GET, POST, PUT, DELETE |
| status_code | INT | HTTP код ответа |
| execution_time_ms | INT | Время выполнения (мс) |
| executor | NVARCHAR(100) | ID исполнителя |
| operation_result | NVARCHAR(20) | success / error |
| created_at | DATETIME2 | Дата создания |
| ... | ... | + параметры запроса, IP, User Agent |

## 🛠️ Архитектура

```
HTTP Request
    ↓
Middleware (operationLogger) - перехват запроса
    ↓
Controllers → Services → Repositories
    ↓
Middleware - перехват ответа
    ↓
OperationLogService - подготовка данных
    ↓
OperationLogRepository - запись в БД
    ↓
x_API_Operation_Logs
```

## 🔧 Файлы проекта

```
src/
├── models/OperationLog.js
├── repositories/OperationLogRepository.js
├── services/OperationLogService.js
├── middlewares/operationLogger.js
├── controllers/OperationLogController.js
└── routes/operationLog.js
```

## 📝 Примеры SQL запросов

```sql
-- Последние 10 логов
SELECT TOP 10 * FROM x_API_Operation_Logs ORDER BY created_at DESC;

-- Ошибки за последний час
SELECT * FROM x_API_Operation_Logs 
WHERE created_at >= DATEADD(hour, -1, GETDATE()) 
  AND operation_result = 'error';

-- Самые медленные операции
SELECT TOP 10 endpoint, AVG(execution_time_ms) as avg_time
FROM x_API_Operation_Logs
WHERE created_at >= DATEADD(day, -7, GETDATE())
GROUP BY endpoint
ORDER BY avg_time DESC;
```

## 🎉 Готово к использованию!

После развертывания система автоматически логирует все операции.

**Для отчетов на фронтенде:**
- Используйте `GET /api/logs/report`
- Выберите `group_by` (hour, day, endpoint, executor...)
- Данные готовы для Chart.js, Recharts и других библиотек

**Документация:**
- 📋 Начните с [LOGGING_SUMMARY.md](LOGGING_SUMMARY.md)
- 💡 Примеры в [REPORT_API_EXAMPLES.md](REPORT_API_EXAMPLES.md)
- 🚀 Развертывание в [DEPLOY_LOGGING.md](DEPLOY_LOGGING.md)

---

**Вопросы?** См. раздел "Решение проблем" в [DEPLOY_LOGGING.md](DEPLOY_LOGGING.md)
