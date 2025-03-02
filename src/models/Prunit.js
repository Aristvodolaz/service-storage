/**
 * Модель Prunit
 */
class Prunit {
  constructor(data = {}) {
    this.id = data.id || null;
    this.product_id = data.product_id || null;
    this.product_qnt = data.product_qnt || 0;
    this.prunit_type_id = data.prunit_type_id || null;
  }

  /**
   * Преобразует данные из БД в модель
   * @param {Object} dbData - Данные из БД
   * @returns {Prunit} - Экземпляр модели
   */
  static fromDatabase(dbData) {
    return new Prunit({
      id: dbData.ID,
      product_id: dbData.PRODUCT_ID,
      product_qnt: dbData.PRODUCT_QNT,
      prunit_type_id: dbData.PRUNIT_TYPE_ID
    });
  }

  /**
   * Преобразует массив данных из БД в массив моделей
   * @param {Array} dbDataArray - Массив данных из БД
   * @returns {Array<Prunit>} - Массив экземпляров модели
   */
  static fromDatabaseArray(dbDataArray) {
    return dbDataArray.map(data => Prunit.fromDatabase(data));
  }
}

module.exports = Prunit; 