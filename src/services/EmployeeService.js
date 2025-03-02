const employeeRepository = require('../repositories/EmployeeRepository');
const logger = require('../utils/logger');

/**
 * Сервис для работы с сотрудниками
 */
class EmployeeService {
  /**
   * Поиск сотрудника по ID для авторизации
   * @param {string} id - ID сотрудника
   * @returns {Promise<Array>} - Массив найденных сотрудников
   * @throws {Error} - Если не указан ID сотрудника или произошла ошибка
   */
  async authenticateEmployee(id) {
    logger.info(`Запрос на авторизацию сотрудника с ID: ${id || 'не указан'}`);

    if (!id) {
      throw new Error('Необходимо указать ID сотрудника');
    }

    try {
      const result = await employeeRepository.findById(id);

      if (result.length === 0) {
        logger.warn(`Сотрудник с ID ${id} не найден`);
        throw new Error('Сотрудник не найден');
      }

      logger.info(`Сотрудник успешно авторизован: ${result[0].fullName}`);
      return result;
    } catch (error) {
      logger.error(`Ошибка при авторизации сотрудника: ${error.message}`, { stack: error.stack });
      throw error;
    }
  }
}

module.exports = new EmployeeService(); 