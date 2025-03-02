# Storage Service

Сервис для работы с хранилищем данных. Предоставляет API для поиска товаров по артикулу или штрих-коду, информации о продуктах и авторизации сотрудников.

## Структура проекта

Проект организован по архитектуре MVC с использованием слоев сервисов и репозиториев:

```
src/
  ├── config/         # Конфигурация приложения
  ├── controllers/    # Контроллеры для обработки запросов
  ├── middlewares/    # Промежуточные обработчики
  ├── models/         # Модели данных
  ├── repositories/   # Репозитории для работы с базой данных
  ├── routes/         # Маршруты API
  ├── services/       # Бизнес-логика
  ├── utils/          # Утилиты
  ├── app.js          # Настройка Express приложения
  └── server.js       # Точка входа в приложение
```

## Установка и запуск

### Требования

- Node.js 14.x или выше
- npm 6.x или выше
- Docker и Docker Compose (для запуска в контейнерах)

### Установка зависимостей

```bash
npm install
```

### Настройка окружения

Создайте файл `.env` в корне проекта на основе `.env.example` с необходимыми переменными окружения:

```
DB_USER=username
DB_PASSWORD=password
DB_SERVER=server
DB_PORT=port
DB_DATABASE=database
...
```

### Запуск приложения

#### Локальный запуск

Для запуска в режиме разработки:

```bash
npm run dev
```

Для запуска в продакшн-режиме:

```bash
npm start
```

#### Запуск с использованием Docker

Для запуска в режиме разработки:

**Linux/Mac:**
```bash
./start-dev.sh
```

**Windows:**
```powershell
.\start-dev.ps1
```

Для запуска в продакшн-режиме:

**Linux/Mac:**
```bash
./start-prod.sh
```

**Windows:**
```powershell
.\start-prod.ps1
```

Для остановки контейнеров:

**Linux/Mac:**
```bash
./stop.sh
```

**Windows:**
```powershell
.\stop.ps1
```

## API

### Документация API (Swagger)

После запуска приложения документация API доступна по адресу:

```
http://localhost:3006/api-docs
```

Swagger предоставляет интерактивную документацию, которая позволяет:
- Просматривать все доступные эндпоинты
- Тестировать API запросы прямо из браузера
- Изучать модели данных и форматы ответов

### Основные эндпоинты

#### Поиск товара

```
GET /search?shk=<штрих-код>&article=<артикул>
```

#### Поиск информации о продукте

```
GET /searchPrunit?productId=<ID продукта>
```

#### Авторизация сотрудника

```
GET /auth?id=<ID сотрудника>
```

#### Выполнение OPENQUERY запроса

```
GET /query/openquery?warehouseId=<ID склада>&articleId=<ID артикула>
```

#### Выполнение произвольного SQL-запроса

```
POST /query/custom
Content-Type: application/json

{
  "query": "SQL-запрос с параметрами",
  "params": {
    "param1": "значение1",
    "param2": "значение2"
  }
}
```

## Разработка

### Запуск линтера

```bash
npm run lint
```

### Запуск тестов

```bash
npm test
```

## Docker

Проект настроен для запуска в Docker-контейнерах с использованием Docker Compose.

### Файлы Docker

- `Dockerfile` - для продакшн-окружения
- `Dockerfile.dev` - для окружения разработки
- `docker-compose.yml` - конфигурация для продакшн-окружения
- `docker-compose.dev.yml` - конфигурация для окружения разработки
- `.dockerignore` - список файлов, исключаемых из контекста сборки

### Особенности Docker-конфигурации

- Продакшн-контейнер запускается в режиме production с оптимизированными настройками
- Контейнер разработки настроен с горячей перезагрузкой кода и отладкой
- Для управления базой данных доступен Adminer на порту 8080
- Логи сохраняются в томе для постоянного хранения
