# Примеры API запросов

В этом документе приведены примеры запросов к API сервиса хранилища данных. Вы можете использовать эти примеры для тестирования API с помощью инструментов, таких как cURL, Postman или непосредственно из Swagger UI.

## Базовый URL

```
http://localhost:3006
```

## Поиск товара по артикулу или штрих-коду

### Запрос по артикулу

```bash
curl -X GET "http://localhost:3006/search?article=13500" -H "accept: application/json"
```

### Запрос по штрих-коду

```bash
curl -X GET "http://localhost:3006/search?shk=4601546041876" -H "accept: application/json"
```

### Пример ответа (успешный)

```json
{
  "id": "12345",
  "article": "13500",
  "shk": "4601546041876",
  "name": "Бумага офисная А4",
  "price": 299.99,
  "quantity": 150
}
```

### Пример ответа (товар не найден)

```json
{
  "code": 404,
  "message": "Товар не найден: ШК = не указан, Артикул = 13500"
}
```

### Пример ответа (некорректный запрос)

```json
{
  "code": 400,
  "message": "Необходимо указать ШК или артикул"
}
```

## Поиск информации о продукте

### Запрос

```bash
curl -X GET "http://localhost:3006/searchPrunit?productId=12345" -H "accept: application/json"
```

### Пример ответа (успешный)

```json
{
  "productId": "12345",
  "description": "Бумага офисная А4, 80 г/м², 500 листов, белизна 146% CIE",
  "specifications": {
    "format": "A4",
    "density": "80 г/м²",
    "sheets": 500,
    "whiteness": "146% CIE",
    "manufacturer": "Комус"
  },
  "images": [
    "https://api.komus.net/storage/images/12345_1.jpg",
    "https://api.komus.net/storage/images/12345_2.jpg"
  ]
}
```

### Пример ответа (продукт не найден)

```json
{
  "code": 404,
  "message": "Информация о продукте не найдена: ID = 12345"
}
```

## Авторизация сотрудника

### Запрос

```bash
curl -X GET "http://localhost:3006/auth?id=E12345" -H "accept: application/json"
```

### Пример ответа (успешный)

```json
{
  "id": "E12345",
  "name": "Иванов Иван Иванович",
  "position": "Менеджер по продажам",
  "department": "Отдел продаж",
  "permissions": [
    "view_products",
    "edit_products",
    "view_orders"
  ]
}
```

### Пример ответа (сотрудник не найден)

```json
{
  "code": 404,
  "message": "Сотрудник не найден: ID = E12345"
}
```

## Использование Swagger UI

Для удобного тестирования API вы можете использовать Swagger UI, доступный по адресу:

```
http://localhost:3006/api-docs
```

Swagger UI предоставляет интерактивный интерфейс для выполнения запросов и просмотра ответов, а также подробную документацию по всем доступным эндпоинтам.
