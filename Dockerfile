FROM node:18-alpine

# Создаем директорию приложения
WORKDIR /usr/src/app

# Копируем файлы package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код приложения
COPY . .

# Создаем директорию для логов
RUN mkdir -p logs

# Открываем порт, который будет использоваться приложением
EXPOSE 3006

# Запускаем приложение
CMD ["node", "src/server.js"]
