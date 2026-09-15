/**
 * Шаг 2. Готовит перенос остатков из Excel (mapped.json) в
 * [SPOe_rc].[dbo].[x_Storage_Full_Info].
 *
 * Делает ТОЛЬКО безопасные (аддитивные) операции:
 *   1. резолвит WR_SHK по имени ячейки через справочник x_Storage_Scklads
 *      (WR_House = 1383) — та же логика, что в addToBuffer / moveItemBetweenLocationsV2,
 *      только в обратную сторону (Name -> SHK);
 *   2. пишет отчёт: report.txt, unmatched.csv, negative.csv;
 *   3. делает резервную копию таблицы -> x_Storage_Full_Info_bak_<ГГГГММДД>
 *      (если её ещё нет);
 *   4. пересоздаёт промежуточную таблицу dbo.stg_storage_full_info_load и
 *      заливает в неё подготовленные строки;
 *   5. генерирует swap.sql — транзакцию DELETE + INSERT для финального переноса.
 *
 * Финальный DELETE/INSERT скрипт НЕ выполняет. Его запускает человек:
 *   sqlcmd -S ... -d SPOe_rc -i swap.sql
 * либо через SSMS.
 *
 * Запуск:
 *   node load.js
 */
const fs = require('fs');
const path = require('path');
const mssql = require('mssql');

const HERE = __dirname;
const WR_HOUSE = '1383';
const ID_SCKLAD = 1383;
const FAR_DATE = '2999-01-01';
const BAK_SUFFIX = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // ГГГГММДД
const BAK_TABLE = `x_Storage_Full_Info_bak_${BAK_SUFFIX}`;
const STAGING = 'stg_storage_full_info_load';

const cfg = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'icY2eGuyfU',
  server: process.env.DB_SERVER || 'PRM-SRV-MSSQL-01.komus.net',
  port: parseInt(process.env.DB_PORT || '59587', 10),
  database: process.env.DB_DATABASE || 'SPOe_rc',
  options: { encrypt: true, trustServerCertificate: true, enableArithAbort: true },
  connectionTimeout: 15000,
  requestTimeout: 120000,
};

const csv = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

(async () => {
  const records = JSON.parse(fs.readFileSync(path.join(HERE, 'mapped.json'), 'utf8'));
  console.log(`mapped.json: ${records.length} строк`);

  const pool = await new mssql.ConnectionPool(cfg).connect();
  console.log('БД: подключено');

  // 1. справочник ячеек: Name -> SHK
  const dictRs = await pool.request().query(
    `SELECT Name, SHK FROM [SPOe_rc].[dbo].[x_Storage_Scklads] WHERE WR_House = '${WR_HOUSE}'`
  );
  const dict = new Map();
  for (const r of dictRs.recordset) if (!dict.has(r.Name)) dict.set(r.Name, r.SHK);
  console.log(`Справочник x_Storage_Scklads (WR_House=${WR_HOUSE}): ${dict.size} ячеек`);

  // 2. резолв + классификация
  const prepared = [];
  const unmatched = [];
  const negative = [];
  for (const rec of records) {
    const shk = rec.cell_name ? dict.get(rec.cell_name) : undefined;
    if (!shk) {
      unmatched.push(rec);
      continue; // строки без штрихкода ячейки в перенос не берём
    }
    if (rec.place_qnt < 0) negative.push(rec);
    prepared.push({
      Name: rec.name,
      Article: rec.article,
      SHK: rec.shk,                       // может быть null
      Product_QNT: rec.product_qnt,       // '1'
      Prunit_Name: rec.prunit_name,
      Prunit_Id: rec.prunit_id,
      WR_SHK: shk,
      id_scklad: rec.id_scklad || ID_SCKLAD,
      Expiration_Date: rec.expiration_date || FAR_DATE,
      Executor: null,
      Place_QNT: rec.place_qnt,
      Condition_State: rec.condition_state,
      name_wr_shk: rec.cell_name,
      reason: '',
    });
  }

  // 3. отчёт
  const report = [
    `Дата:                 ${new Date().toISOString()}`,
    `Строк в Excel:         ${records.length}`,
    `Готово к переносу:     ${prepared.length}`,
    `Ячейка не найдена в справочнике (пропущены): ${unmatched.length}`,
    `  уникальных ячеек:    ${new Set(unmatched.map(u => u.cell_name || u.cell_raw)).size}`,
    `Отрицательный остаток (перенесены как есть): ${negative.length}`,
    `Некондиция:            ${prepared.filter(p => p.Condition_State === 'некондиция').length}`,
    `SHK (GTIN) = NULL:     ${prepared.filter(p => p.SHK === null).length}`,
    `Резервная копия:       dbo.${BAK_TABLE}`,
    `Промежуточная таблица: dbo.${STAGING}`,
  ].join('\n');
  fs.writeFileSync(path.join(HERE, 'report.txt'), report + '\n', 'utf8');

  const unHeader = 'row;cell_raw;cell_name;article;name;place_qnt\n';
  fs.writeFileSync(path.join(HERE, 'unmatched.csv'),
    unHeader + unmatched.map(u => [u.row, u.cell_raw, u.cell_name, u.article, u.name, u.place_qnt].map(csv).join(';')).join('\n') + '\n',
    'utf8');
  fs.writeFileSync(path.join(HERE, 'negative.csv'),
    unHeader + negative.map(u => [u.row, u.cell_raw, u.cell_name, u.article, u.name, u.place_qnt].map(csv).join(';')).join('\n') + '\n',
    'utf8');
  console.log('\n' + report + '\n');

  // 4. резервная копия
  const bakExists = await pool.request().query(
    `SELECT OBJECT_ID('[SPOe_rc].[dbo].[${BAK_TABLE}]') AS oid`
  );
  if (bakExists.recordset[0].oid) {
    console.log(`Резервная копия dbo.${BAK_TABLE} уже существует — пропуск`);
  } else {
    const cnt = await pool.request().query('SELECT COUNT(*) n FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]');
    await pool.request().query(
      `SELECT * INTO [SPOe_rc].[dbo].[${BAK_TABLE}] FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]`
    );
    console.log(`Резервная копия dbo.${BAK_TABLE}: ${cnt.recordset[0].n} строк`);
  }

  // 5. промежуточная таблица
  await pool.request().query(`
    IF OBJECT_ID('[SPOe_rc].[dbo].[${STAGING}]') IS NOT NULL DROP TABLE [SPOe_rc].[dbo].[${STAGING}];
    CREATE TABLE [SPOe_rc].[dbo].[${STAGING}] (
      seq              INT IDENTITY(1,1) PRIMARY KEY,
      Name             NVARCHAR(255) NULL,
      Article          NVARCHAR(50)  NULL,
      SHK              NVARCHAR(50)  NULL,
      Product_QNT      NVARCHAR(50)  NULL,
      Prunit_Name      NVARCHAR(255) NULL,
      Prunit_Id        INT           NULL,
      WR_SHK           NVARCHAR(255) NULL,
      id_scklad        INT           NULL,
      Expiration_Date  NVARCHAR(50)  NULL,
      Executor         NVARCHAR(255) NULL,
      Place_QNT        INT           NULL,
      Condition_State  NVARCHAR(50)  NULL,
      name_wr_shk      NVARCHAR(255) NULL,
      reason           NVARCHAR(255) NULL
    );
  `);

  const tbl = new mssql.Table(`[SPOe_rc].[dbo].[${STAGING}]`);
  tbl.create = false;
  tbl.columns.add('Name', mssql.NVarChar(255), { nullable: true });
  tbl.columns.add('Article', mssql.NVarChar(50), { nullable: true });
  tbl.columns.add('SHK', mssql.NVarChar(50), { nullable: true });
  tbl.columns.add('Product_QNT', mssql.NVarChar(50), { nullable: true });
  tbl.columns.add('Prunit_Name', mssql.NVarChar(255), { nullable: true });
  tbl.columns.add('Prunit_Id', mssql.Int, { nullable: true });
  tbl.columns.add('WR_SHK', mssql.NVarChar(255), { nullable: true });
  tbl.columns.add('id_scklad', mssql.Int, { nullable: true });
  tbl.columns.add('Expiration_Date', mssql.NVarChar(50), { nullable: true });
  tbl.columns.add('Executor', mssql.NVarChar(255), { nullable: true });
  tbl.columns.add('Place_QNT', mssql.Int, { nullable: true });
  tbl.columns.add('Condition_State', mssql.NVarChar(50), { nullable: true });
  tbl.columns.add('name_wr_shk', mssql.NVarChar(255), { nullable: true });
  tbl.columns.add('reason', mssql.NVarChar(255), { nullable: true });
  for (const p of prepared) {
    tbl.rows.add(p.Name, p.Article, p.SHK, p.Product_QNT, p.Prunit_Name, p.Prunit_Id,
      p.WR_SHK, p.id_scklad, p.Expiration_Date, p.Executor, p.Place_QNT,
      p.Condition_State, p.name_wr_shk, p.reason);
  }
  const res = await pool.request().bulk(tbl);
  console.log(`Залито в dbo.${STAGING}: ${res.rowsAffected} строк`);

  // 6. swap.sql
  const swap = `/* ================================================================
   ПЕРЕНОС остатков хранения из Excel в x_Storage_Full_Info.
   Сгенерировано ${new Date().toISOString()}
   ПЕРЕД запуском убедитесь, что есть резервная копия dbo.${BAK_TABLE}.
   ID нумеруется заново с 1 (таблица очищается полностью).
   ================================================================ */
SET XACT_ABORT ON;
BEGIN TRAN;

    DELETE FROM [SPOe_rc].[dbo].[x_Storage_Full_Info];

    INSERT INTO [SPOe_rc].[dbo].[x_Storage_Full_Info]
        (ID, Name, Article, SHK, Product_QNT, Prunit_Name, Prunit_Id, WR_SHK, id_scklad,
         Expiration_Date, Start_Expiration_Date, End_Expiration_Date, Executor, Place_QNT,
         Condition_State, Create_Date, Update_Date, name_wr_shk, reason)
    SELECT
        ROW_NUMBER() OVER (ORDER BY s.name_wr_shk, s.Article, s.Prunit_Id) AS ID,
        s.Name, s.Article, s.SHK, s.Product_QNT, s.Prunit_Name, s.Prunit_Id, s.WR_SHK, s.id_scklad,
        s.Expiration_Date,
        CAST('${FAR_DATE}' AS DATE), CAST('${FAR_DATE}' AS DATE),
        s.Executor, s.Place_QNT,
        s.Condition_State, GETDATE(), GETDATE(), s.name_wr_shk, s.reason
    FROM [SPOe_rc].[dbo].[${STAGING}] s;

    /* контроль */
    SELECT
        (SELECT COUNT(*) FROM [SPOe_rc].[dbo].[${STAGING}])            AS staging_rows,
        (SELECT COUNT(*) FROM [SPOe_rc].[dbo].[x_Storage_Full_Info])   AS inserted_rows;

-- Проверьте числа выше. Если всё верно:
COMMIT;
-- Иначе:
-- ROLLBACK;
`;
  fs.writeFileSync(path.join(HERE, 'swap.sql'), swap, 'utf8');
  console.log(`\n-> swap.sql сгенерирован. Финальный перенос запустите вручную.`);

  await pool.close();
})().catch((e) => { console.error('ОШИБКА:', e); process.exit(1); });
