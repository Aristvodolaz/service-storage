const app = require('./app');
const logger = require('./utils/logger');

// Настройка порта
const port = 3007;

// Запуск сервера
const server = app.listen(port, () => {
  logger.info(`Сервер запущен на порту ${port}`);
  console.log(`Сервер запущен на порту ${port}`);
});

// Обработка необработанных исключений
process.on('uncaughtException', (err) => {
  logger.error(`Необработанное исключение: ${err.message}`, { stack: err.stack });
  console.error('Необработанное исключение:', err);
  process.exit(1);
});

// Обработка необработанных отклонений промисов
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Необработанное отклонение промиса: ${reason}`, { stack: reason.stack });
  console.error('Необработанное отклонение промиса:', reason);
});

// Обработка сигналов завершения
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

/**
 * Функция для корректного завершения работы сервера
 */
function gracefulShutdown() {
  logger.info('Получен сигнал завершения, закрытие сервера...');
  server.close(() => {
    logger.info('Сервер закрыт');
    process.exit(0);
  });

  // Если сервер не закрылся за 10 секунд, принудительно завершаем процесс
  setTimeout(() => {
    logger.error('Не удалось корректно закрыть сервер, принудительное завершение');
    process.exit(1);
  }, 10000);
}
