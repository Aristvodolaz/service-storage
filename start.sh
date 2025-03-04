#!/bin/bash

# Остановка и удаление существующих контейнеров
docker-compose down

# Сборка и запуск контейнеров
docker-compose up --build -d

# Вывод логов
docker-compose logs -f
