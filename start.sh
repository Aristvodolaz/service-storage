#!/bin/bash

# Остановка и удаление существующих контейнеров
echo "Останавливаем существующие контейнеры..."
docker-compose down

# Удаление старых образов
echo "Удаляем старые образы..."
docker rmi storage-service:latest || true

# Сборка нового образа
echo "Собираем новый образ..."
docker-compose build

# Запуск контейнеров
echo "Запускаем контейнеры..."
docker-compose up -d

# Проверка статуса
echo "Проверяем статус контейнеров..."
docker ps

# Вывод логов
echo "Выводим логи приложения..."
docker logs -f storage-service
