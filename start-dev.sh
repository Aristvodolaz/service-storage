#!/bin/bash

# Остановка и удаление существующих контейнеров
docker-compose -f docker-compose.dev.yml down

# Сборка и запуск контейнеров в режиме разработки
docker-compose -f docker-compose.dev.yml up --build 