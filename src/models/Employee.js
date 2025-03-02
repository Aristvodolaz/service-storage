/**
 * Модель сотрудника
 */
class Employee {
  constructor(data = {}) {
    this.id = data.id || null;
    this.fullName = data.fullName || '';
  }

  /**
   * Преобразует данные из БД в модель
   * @param {Object} dbData - Данные из БД
   * @returns {Employee} - Экземпляр модели
   */
  static fromDatabase(dbData) {
    return new Employee({
      id: dbData.ID,
      fullName: dbData.FULL_NAME
    });
  }

  /**
   * Преобразует массив данных из БД в массив моделей
   * @param {Array} dbDataArray - Массив данных из БД
   * @returns {Array<Employee>} - Массив экземпляров модели
   */
  static fromDatabaseArray(dbDataArray) {
    return dbDataArray.map(data => Employee.fromDatabase(data));
  }
}

module.exports = Employee; 