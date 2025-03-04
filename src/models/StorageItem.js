/**
 * Модель для работы с таблицей x_Storage_Full_Info
 */
class StorageItem {
  constructor(data) {
    this.id = data.ID;
    this.name = data.Name;
    this.article = data.Article;
    this.shk = data.SHK;
    this.productQnt = data.Product_QNT;
    this.prunitName = data.Prunit_Name;
    this.prunitId = data.Prunit_Id;
    this.wrShk = data.WR_SHK;
    this.idScklad = data.id_scklad;
    this.expirationDate = data.Expiration_Date;
    this.startExpirationDate = data.Start_Expiration_Date;
    this.endExpirationDate = data.End_Expiration_Date;
    this.executor = data.Executor;
    this.placeQnt = data.Place_QNT;
  }

  /**
   * Преобразует объект в формат для ответа API
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      article: this.article,
      shk: this.shk,
      quantity: {
        product: this.productQnt,
        place: this.placeQnt
      },
      unit: {
        id: this.prunitId,
        name: this.prunitName
      },
      warehouse: {
        id: this.idScklad,
        wrShk: this.wrShk
      },
      expiration: {
        date: this.expirationDate,
        start: this.startExpirationDate,
        end: this.endExpirationDate
      },
      executor: this.executor
    };
  }

  /**
   * Преобразует массив записей в массив объектов StorageItem
   */
  static fromArray(data) {
    return data.map(item => new StorageItem(item));
  }
}

module.exports = StorageItem;
