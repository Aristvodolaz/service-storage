const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config({ path: './src/config/data.env' });
const logger = require('./utils/logger');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const swagger = require('./config/swagger');

// Инициализация приложения
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(logger.logHttpRequest); // Добавляем логирование HTTP запросов

// Swagger документация
app.use('/api-docs', swagger.serve, swagger.setup);

// Маршруты
const articleRoutes = require('./routes/article');
const prunitRoutes = require('./routes/prunit');
const authRoutes = require('./routes/auth');
const queryRoutes = require('./routes/query');
const storageRoutes = require('./routes/storage');

// Регистрация маршрутов
app.use('/search', articleRoutes);
app.use('/searchPrunit', prunitRoutes);
app.use('/auth', authRoutes);
app.use('/query', queryRoutes);
app.use('/storage', storageRoutes);

// Обработка ошибок 404
app.use(notFoundHandler);

// Глобальный обработчик ошибок
app.use(errorHandler);

module.exports = app;
