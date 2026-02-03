const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config({ path: './src/config/data.env' });
const logger = require('./utils/logger');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const swagger = require('./config/swagger');
const operationLogger = require('./middlewares/operationLogger');

// Инициализация приложения
const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(logger.logHttpRequest); // Добавляем логирование HTTP запросов в файл
app.use(operationLogger); // Добавляем логирование операций в БД

// Swagger документация
app.use('/api-docs', swagger.serve, swagger.setup);

// Маршруты
const articleRoutes = require('./routes/article');
const prunitRoutes = require('./routes/prunit');
const authRoutes = require('./routes/auth');
const queryRoutes = require('./routes/query');
const storageRoutes = require('./routes/storage');
const operationLogRoutes = require('./routes/operationLog');

// Регистрация маршрутов
app.use('/api/search', articleRoutes);
app.use('/api/searchPrunit', prunitRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/logs', operationLogRoutes);

// Обработка ошибок 404
app.use(notFoundHandler);

// Глобальный обработчик ошибок
app.use(errorHandler);

module.exports = app;
