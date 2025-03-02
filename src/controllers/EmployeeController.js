const employeeService = require('../services/EmployeeService');
const logger = require('../utils/logger');

/**
 * Контроллер для работы с сотрудниками
 */
class EmployeeController {
  /**
   * Поиск сотрудника по ID для авторизации
   * @param {Object} req - HTTP запрос
   * @param {Object} res - HTTP ответ
   */
  async searchBySHKForAuth(req, res) {
    const { id } = req.query;

    try {
      const result = await employeeService.authenticateEmployee(id);
      
      res.status(200).json({ 
        success: true, 
        value: result, 
        errorCode: 200 
      });
    } catch (error) {
      if (error.message === 'Сотрудник не найден') {
        return res.status(404).json({ 
          success: false, 
          msg: error.message, 
          errorCode: 404 
        });
      }
      
      if (error.message === 'Необходимо указать ID сотрудника') {
        return res.status(400).json({ 
          success: false, 
          msg: error.message, 
          errorCode: 400 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        msg: `Ошибка при авторизации сотрудника: ${error.message}`, 
        errorCode: 500 
      });
    }
  }
}

module.exports = new EmployeeController(); 