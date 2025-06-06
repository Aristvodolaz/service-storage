/**
 * Модель артикула
 */
class Article {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.qnt_in_pallet = data.qnt_in_pallet || 0
  }

  /**
   * Преобразует данные из БД в модель
   * @param {Object} dbData - Данные из БД
   * @returns {Article} - Экземпляр модели
   */
  static fromDatabase(dbData) {
    return new Article({
      id: dbData.id,
      name: dbData.name,
      qnt_in_pallet: dbData.qnt_in_pallet || 0

    });
  }

  /**
   * Преобразует массив данных из БД в массив моделей
   * @param {Array} dbDataArray - Массив данных из БД
   * @returns {Array<Article>} - Массив экземпляров модели
   */
  static fromDatabaseArray(dbDataArray) {
    return dbDataArray.map(data => Article.fromDatabase(data));
  }
}

module.exports = Article; 