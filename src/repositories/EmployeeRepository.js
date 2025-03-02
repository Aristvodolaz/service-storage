const BaseRepository = require('./BaseRepository');
const Employee = require('../models/Employee');
const logger = require('../utils/logger');

/**
 * Репозиторий для работы с сотрудниками
 */
class EmployeeRepository extends BaseRepository {
  /**
   * Поиск сотрудника по ID
   * @param {string} id - ID сотрудника
   * @returns {Promise<Array<Employee>>} - Массив найденных сотрудников
   */
  async findById(id) {
    logger.info(`Поиск сотрудника по ID: ${id}`);
    const query = `
      SELECT ID, FULL_NAME 
      FROM OPENQUERY(OW, 'SELECT ID, FULL_NAME FROM staff.employee WHERE id = ''@id''')
    `;
    const result = await this.executeQuery(query, { id });
    return Employee.fromDatabaseArray(result);
  }
}

module.exports = new EmployeeRepository(); 