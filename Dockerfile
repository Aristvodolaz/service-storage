# Используем официальный образ Node.js
FROM node:18-alpine

# Устанавливаем зависимости для работы с MS SQL Server
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    unixodbc \
    unixodbc-dev \
    curl

# Устанавливаем драйверы Microsoft ODBC для SQL Server
RUN curl -O https://download.microsoft.com/download/e/4/e/e4e67866-dffd-428c-aac7-8d28ddafb39b/msodbcsql17_17.10.2.1-1_amd64.apk \
    && apk add --allow-untrusted msodbcsql17_17.10.2.1-1_amd64.apk \
    && rm msodbcsql17_17.10.2.1-1_amd64.apk

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

# Устанавливаем переменные окружения по умолчанию
ENV NODE_ENV=production \
    PORT=3006

# Открываем порт
EXPOSE 3006

# Запускаем приложение
CMD ["node", "src/server.js"]
