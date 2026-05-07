# API для отчетов по логам операций

## Эндпоинт для получения отчетов

```
GET /api/logs/report
```

Этот метод возвращает структурированные данные, идеально подходящие для создания отчетов на фронтенде.

## Параметры запроса

| Параметр | Тип | Значения | Описание |
|----------|-----|----------|----------|
| `date_from` | datetime | ISO 8601 | Начало периода |
| `date_to` | datetime | ISO 8601 | Конец периода |
| `executor` | string | - | Фильтр по исполнителю |
| `endpoint` | string | - | Фильтр по endpoint (частичное совпадение) |
| `group_by` | string | `hour`, `day`, `endpoint`, `executor`, `status_code`, `method` | Тип группировки |
| `include_details` | boolean | `true`, `false` | Включить детальные логи (макс 1000) |

## Примеры использования

### 1. Отчет по часам за последние 24 часа

```bash
GET /api/logs/report?date_from=2026-02-08T00:00:00Z&date_to=2026-02-09T00:00:00Z&group_by=hour
```

**Использование на фронте:** График активности по часам

**Пример ответа:**
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
      "max_execution_time_ms": 3200,
      "period": {
        "from": "2026-02-08T00:00:00Z",
        "to": "2026-02-09T00:00:00Z"
      },
      "filters": {
        "executor": "все",
        "endpoint": "все"
      }
    },
    "grouped_data": [
      {
        "year": 2026,
        "month": 2,
        "day": 9,
        "hour": 14,
        "date": "2026-02-09",
        "hour_of_day": 14,
        "total_count": 85,
        "success_count": 82,
        "error_count": 3,
        "success_rate": "96.47",
        "avg_execution_time": 138,
        "min_execution_time": 45,
        "max_execution_time": 450,
        "unique_executors": 12,
        "unique_ips": 8
      },
      {
        "year": 2026,
        "month": 2,
        "day": 9,
        "hour": 13,
        "date": "2026-02-09",
        "hour_of_day": 13,
        "total_count": 92,
        "success_count": 88,
        "error_count": 4,
        "success_rate": "95.65",
        "avg_execution_time": 152,
        "min_execution_time": 38,
        "max_execution_time": 680,
        "unique_executors": 15,
        "unique_ips": 10
      }
    ],
    "group_by": "hour"
  }
}
```

**Как использовать на фронте (React/Chart.js):**
```javascript
const response = await fetch('/api/logs/report?date_from=2026-02-08T00:00:00Z&date_to=2026-02-09T00:00:00Z&group_by=hour');
const { data } = await response.json();

// Для графика
const chartData = {
  labels: data.grouped_data.map(item => `${item.date} ${item.hour_of_day}:00`),
  datasets: [
    {
      label: 'Успешные операции',
      data: data.grouped_data.map(item => item.success_count),
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
    },
    {
      label: 'Ошибки',
      data: data.grouped_data.map(item => item.error_count),
      borderColor: 'rgb(255, 99, 132)',
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
    }
  ]
};
```

### 2. Отчет по дням за неделю

```bash
GET /api/logs/report?date_from=2026-02-01T00:00:00Z&date_to=2026-02-08T00:00:00Z&group_by=day
```

**Использование на фронте:** Недельный отчет активности

**Пример ответа:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_operations": 8540,
      "successful_operations": 8120,
      "failed_operations": 420,
      "success_rate": "95.08"
    },
    "grouped_data": [
      {
        "date": "2026-02-08",
        "year": 2026,
        "month": 2,
        "day": 8,
        "total_count": 1250,
        "success_count": 1180,
        "error_count": 70,
        "success_rate": "94.40",
        "avg_execution_time": 145
      },
      {
        "date": "2026-02-07",
        "year": 2026,
        "month": 2,
        "day": 7,
        "total_count": 1180,
        "success_count": 1150,
        "error_count": 30,
        "success_rate": "97.46",
        "avg_execution_time": 132
      }
    ],
    "group_by": "day"
  }
}
```

### 3. Отчет по endpoint (топ операций)

```bash
GET /api/logs/report?date_from=2026-02-08T00:00:00Z&date_to=2026-02-09T00:00:00Z&group_by=endpoint
```

**Использование на фронте:** Таблица самых популярных операций

**Пример ответа:**
```json
{
  "success": true,
  "data": {
    "grouped_data": [
      {
        "endpoint": "/api/storage/info",
        "total_count": 450,
        "success_count": 445,
        "error_count": 5,
        "success_rate": "98.89",
        "avg_execution_time": 85,
        "min_execution_time": 25,
        "max_execution_time": 350,
        "unique_executors": 25,
        "unique_ips": 18
      },
      {
        "endpoint": "/api/storage/move/12345",
        "total_count": 320,
        "success_count": 305,
        "error_count": 15,
        "success_rate": "95.31",
        "avg_execution_time": 215,
        "min_execution_time": 120,
        "max_execution_time": 1200,
        "unique_executors": 18,
        "unique_ips": 12
      }
    ],
    "group_by": "endpoint"
  }
}
```

**Как использовать на фронте (таблица):**
```javascript
const response = await fetch('/api/logs/report?group_by=endpoint');
const { data } = await response.json();

// Для таблицы
const tableData = data.grouped_data.map(item => ({
  endpoint: item.endpoint,
  requests: item.total_count,
  successRate: `${item.success_rate}%`,
  avgTime: `${item.avg_execution_time}ms`,
  users: item.unique_executors
}));
```

### 4. Отчет по исполнителям (пользователям)

```bash
GET /api/logs/report?date_from=2026-02-08T00:00:00Z&date_to=2026-02-09T00:00:00Z&group_by=executor
```

**Использование на фронте:** Активность пользователей

**Пример ответа:**
```json
{
  "success": true,
  "data": {
    "grouped_data": [
      {
        "executor": "user_123",
        "total_count": 250,
        "success_count": 240,
        "error_count": 10,
        "success_rate": "96.00",
        "avg_execution_time": 150,
        "unique_ips": 2
      },
      {
        "executor": "user_456",
        "total_count": 180,
        "success_count": 175,
        "error_count": 5,
        "success_rate": "97.22",
        "avg_execution_time": 125,
        "unique_ips": 1
      }
    ],
    "group_by": "executor"
  }
}
```

### 5. Отчет по статус-кодам

```bash
GET /api/logs/report?date_from=2026-02-08T00:00:00Z&date_to=2026-02-09T00:00:00Z&group_by=status_code
```

**Использование на фронте:** Распределение HTTP кодов ответа (Pie Chart)

**Пример ответа:**
```json
{
  "success": true,
  "data": {
    "grouped_data": [
      {
        "status_code": 200,
        "total_count": 1050,
        "success_count": 1050,
        "error_count": 0,
        "success_rate": "100.00",
        "avg_execution_time": 120
      },
      {
        "status_code": 404,
        "total_count": 45,
        "success_count": 0,
        "error_count": 45,
        "success_rate": "0.00",
        "avg_execution_time": 85
      },
      {
        "status_code": 500,
        "total_count": 15,
        "success_count": 0,
        "error_count": 15,
        "success_rate": "0.00",
        "avg_execution_time": 250
      }
    ],
    "group_by": "status_code"
  }
}
```

### 6. Отчет по HTTP методам

```bash
GET /api/logs/report?date_from=2026-02-08T00:00:00Z&date_to=2026-02-09T00:00:00Z&group_by=method
```

**Использование на фронте:** Распределение типов запросов

**Пример ответа:**
```json
{
  "success": true,
  "data": {
    "grouped_data": [
      {
        "http_method": "GET",
        "total_count": 750,
        "success_count": 730,
        "error_count": 20,
        "success_rate": "97.33",
        "avg_execution_time": 95
      },
      {
        "http_method": "POST",
        "total_count": 420,
        "success_count": 390,
        "error_count": 30,
        "success_rate": "92.86",
        "avg_execution_time": 215
      },
      {
        "http_method": "PUT",
        "total_count": 60,
        "success_count": 55,
        "error_count": 5,
        "success_rate": "91.67",
        "avg_execution_time": 185
      }
    ],
    "group_by": "method"
  }
}
```

### 7. Детальный отчет с включенными логами

```bash
GET /api/logs/report?date_from=2026-02-09T10:00:00Z&date_to=2026-02-09T11:00:00Z&group_by=hour&include_details=true
```

**Использование на фронте:** Детальный анализ с возможностью drill-down

**Пример ответа:**
```json
{
  "success": true,
  "data": {
    "summary": { ... },
    "grouped_data": [ ... ],
    "group_by": "hour",
    "details": [
      {
        "id": 12345,
        "endpoint": "/api/storage/move/67890",
        "http_method": "POST",
        "status_code": 200,
        "execution_time_ms": 145,
        "executor": "user_123",
        "operation_result": "success",
        "created_at": "2026-02-09T10:15:30.000Z"
      }
    ]
  }
}
```

### 8. Отчет с фильтрацией по пользователю

```bash
GET /api/logs/report?executor=user_123&date_from=2026-02-08T00:00:00Z&date_to=2026-02-09T00:00:00Z&group_by=endpoint
```

**Использование на фронте:** Персональный отчет пользователя

### 9. Отчет по конкретному endpoint

```bash
GET /api/logs/report?endpoint=/api/storage/move&date_from=2026-02-08T00:00:00Z&date_to=2026-02-09T00:00:00Z&group_by=hour
```

**Использование на фронте:** Мониторинг конкретной операции

## Компоненты для фронтенда

### React компонент для отчета

```jsx
import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';

const OperationReport = () => {
  const [reportData, setReportData] = useState(null);
  const [groupBy, setGroupBy] = useState('hour');
  const [dateFrom, setDateFrom] = useState('2026-02-08T00:00:00Z');
  const [dateTo, setDateTo] = useState('2026-02-09T00:00:00Z');

  useEffect(() => {
    fetchReport();
  }, [groupBy, dateFrom, dateTo]);

  const fetchReport = async () => {
    const response = await fetch(
      `/api/logs/report?date_from=${dateFrom}&date_to=${dateTo}&group_by=${groupBy}`
    );
    const { data } = await response.json();
    setReportData(data);
  };

  if (!reportData) return <div>Загрузка...</div>;

  const chartData = {
    labels: reportData.grouped_data.map(item => 
      groupBy === 'hour' ? `${item.hour_of_day}:00` :
      groupBy === 'day' ? item.date :
      item[groupBy]
    ),
    datasets: [
      {
        label: 'Успешные операции',
        data: reportData.grouped_data.map(item => item.success_count),
        borderColor: 'rgb(75, 192, 192)',
      },
      {
        label: 'Ошибки',
        data: reportData.grouped_data.map(item => item.error_count),
        borderColor: 'rgb(255, 99, 132)',
      }
    ]
  };

  return (
    <div>
      <h2>Отчет по операциям</h2>
      
      {/* Сводка */}
      <div className="summary">
        <div>Всего операций: {reportData.summary.total_operations}</div>
        <div>Успешных: {reportData.summary.successful_operations}</div>
        <div>Ошибок: {reportData.summary.failed_operations}</div>
        <div>Success Rate: {reportData.summary.success_rate}%</div>
        <div>Среднее время: {reportData.summary.avg_execution_time_ms}ms</div>
      </div>

      {/* Фильтры */}
      <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
        <option value="hour">По часам</option>
        <option value="day">По дням</option>
        <option value="endpoint">По операциям</option>
        <option value="executor">По пользователям</option>
        <option value="status_code">По статус-кодам</option>
        <option value="method">По методам</option>
      </select>

      {/* График */}
      <Line data={chartData} />

      {/* Таблица */}
      <table>
        <thead>
          <tr>
            <th>Период/Группа</th>
            <th>Всего</th>
            <th>Успешно</th>
            <th>Ошибок</th>
            <th>Success Rate</th>
            <th>Ср. время</th>
          </tr>
        </thead>
        <tbody>
          {reportData.grouped_data.map((item, index) => (
            <tr key={index}>
              <td>{item[groupBy] || `${item.date} ${item.hour_of_day || ''}`}</td>
              <td>{item.total_count}</td>
              <td>{item.success_count}</td>
              <td>{item.error_count}</td>
              <td>{item.success_rate}%</td>
              <td>{item.avg_execution_time}ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OperationReport;
```

## SQL запросы для дополнительного анализа

Если нужны специфичные данные, можно использовать прямые SQL запросы:

```sql
-- Топ самых медленных операций
SELECT TOP 10 
  endpoint, 
  AVG(execution_time_ms) as avg_time,
  COUNT(*) as count
FROM x_API_Operation_Logs
WHERE created_at >= DATEADD(day, -7, GETDATE())
GROUP BY endpoint
ORDER BY avg_time DESC;

-- Активность по часам суток
SELECT 
  DATEPART(hour, created_at) as hour,
  COUNT(*) as operations,
  AVG(execution_time_ms) as avg_time
FROM x_API_Operation_Logs
WHERE created_at >= DATEADD(day, -30, GETDATE())
GROUP BY DATEPART(hour, created_at)
ORDER BY hour;
```

## Swagger документация

Полная документация доступна по адресу:
```
http://localhost:3006/api-docs
```

Раздел: **Логи операций** → **GET /api/logs/report**
