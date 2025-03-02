const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config({ path: './config/data.env' });
const logger = require('./utils/logger');
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(logger.logHttpRequest); // Добавляем логирование HTTP запросов

const articleRoutes = require('./routes/article');  // Подключаем новый маршрут для артикула
const prunitRoutes = require('./routes/prunit');
const authRoutes = require('./routes/auth');

// Маршруты
app.use('/search', articleRoutes);  
app.use('/searchPrunit', prunitRoutes);
app.use('/auth', authRoutes);

// Обработка ошибок 404
app.use((req, res, next) => {
  logger.warn(`Маршрут не найден: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ success: false, msg: 'Маршрут не найден', errorCode: 404 });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  logger.error(`Ошибка сервера: ${err.message}`, { stack: err.stack });
  res.status(500).json({ success: false, msg: 'Внутренняя ошибка сервера', errorCode: 500 });
});

// Настройка порта
const port = process.env.PORT || 3005;

// Запуск сервера
app.listen(port, () => {
  logger.info(`Сервер запущен на порту ${port}`);
  console.log(`Сервер запущен на порту ${port}`);
});

module.exports = app; // Экспорт для тестирования