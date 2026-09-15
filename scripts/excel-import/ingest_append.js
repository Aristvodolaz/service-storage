/**
 * Догрузка нового Excel в x_Storage_Full_Info БЕЗ удаления существующих строк.
 *
 *   node ingest_append.js <mapped.json> <staging_table>          — подготовить staging + показать план
 *   node ingest_append.js <mapped.json> <staging_table> --run    — то же + выполнить INSERT
 *
 * Пример:
 *   python parse_excel.py "C:\...\Блок  Б.xlsx" mapped_block_b.json
 *   node ingest_append.js mapped_block_b.json stg_storage_block_b
 *   node ingest_append.js mapped_block_b.json stg_storage_block_b --run
 *
 * Аддитивно: только CREATE промежуточной таблицы + INSERT. Существующие строки
 * x_Storage_Full_Info не трогаются. Новым строкам ID выдаётся продолжением MAX(ID).
 * Резолв WR_SHK — по имени ячейки через x_Storage_Scklads (WR_House=1383).
 */
const fs = require('fs');
const path = require('path');
const mssql = require('mssql');

const [, , JSON_ARG, STAGING_ARG] = process.argv;
const RUN = process.argv.includes('--run');
if (!JSON_ARG || !STAGING_ARG) {
  console.error('Использование: node ingest_append.js <mapped.json> <staging_table> [--run]');
  process.exit(2);
}
const HERE = __dirname;
const JSON_PATH = path.isabs?.(JSON_ARG) ? JSON_ARG : path.resolve(HERE, JSON_ARG);
const STAGING = STAGING_ARG.replace(/[^A-Za-z0-9_]/g, '');
const WR_HOUSE = '1383';
const ID_SCKLAD = 1383;
const FAR_DATE = '2999-01-01';
// пометка для строк, у которых ячейки нет в справочнике x_Storage_Scklads:
// WR_SHK остаётся NULL, ячейку добьём позже по этому маркеру
const NO_CELL_MARK = 'НЕТ ШК ЯЧЕЙКИ - дозагрузить';

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
  const records = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  console.log(`${path.basename(JSON_PATH)}: ${records.length} строк`);

  const pool = await new mssql.ConnectionPool(cfg).connect();

  const dictRs = await pool.request().query(
    `SELECT Name, SHK FROM [SPOe_rc].[dbo].[x_Storage_Scklads] WHERE WR_House = '${WR_HOUSE}'`
  );
  const dict = new Map();
  for (const r of dictRs.recordset) if (!dict.has(r.Name)) dict.set(r.Name, r.SHK);
  console.log(`Справочник ячеек (WR_House=${WR_HOUSE}): ${dict.size}`);

  const prepared = [];
  const unmatched = [];
  let negative = 0;
  for (const rec of records) {
    const shk = rec.cell_name ? dict.get(rec.cell_name) : undefined;
    if (rec.place_qnt < 0) negative++;
    if (!shk) unmatched.push(rec);
    prepared.push({
      Name: rec.name, Article: rec.article, SHK: rec.shk,
      Product_QNT: rec.product_qnt, Prunit_Name: rec.prunit_name, Prunit_Id: rec.prunit_id,
      WR_SHK: shk || null, id_scklad: rec.id_scklad || ID_SCKLAD,
      Expiration_Date: rec.expiration_date || FAR_DATE, Executor: null,
      Place_QNT: rec.place_qnt, Condition_State: rec.condition_state,
      name_wr_shk: rec.cell_name, reason: shk ? '' : NO_CELL_MARK,
    });
  }

  if (unmatched.length) {
    const f = path.join(HERE, `unmatched_${STAGING}.csv`);
    fs.writeFileSync(f, 'row;cell_raw;cell_name;article;name;place_qnt\n' +
      unmatched.map(u => [u.row, u.cell_raw, u.cell_name, u.article, u.name, u.place_qnt].map(csv).join(';')).join('\n') + '\n', 'utf8');
    console.log(`Ячейка не найдена в справочнике: ${unmatched.length} -> вставляются с WR_SHK=NULL и reason='${NO_CELL_MARK}' (${path.basename(f)})`);
  }
  console.log(`Готово к вставке: ${prepared.length} | некондиция: ${prepared.filter(p => p.Condition_State === 'некондиция').length} | отриц. остаток: ${negative} | SHK NULL: ${prepared.filter(p => p.SHK === null).length}`);

  // промежуточная таблица
  await pool.request().query(`
    IF OBJECT_ID('[SPOe_rc].[dbo].[${STAGING}]') IS NOT NULL DROP TABLE [SPOe_rc].[dbo].[${STAGING}];
    CREATE TABLE [SPOe_rc].[dbo].[${STAGING}] (
      seq INT IDENTITY(1,1) PRIMARY KEY,
      Name NVARCHAR(255) NULL, Article NVARCHAR(50) NULL, SHK NVARCHAR(50) NULL,
      Product_QNT NVARCHAR(50) NULL, Prunit_Name NVARCHAR(255) NULL, Prunit_Id INT NULL,
      WR_SHK NVARCHAR(255) NULL, id_scklad INT NULL, Expiration_Date NVARCHAR(50) NULL,
      Executor NVARCHAR(255) NULL, Place_QNT INT NULL, Condition_State NVARCHAR(50) NULL,
      name_wr_shk NVARCHAR(255) NULL, reason NVARCHAR(255) NULL
    );`);

  const tbl = new mssql.Table(`[SPOe_rc].[dbo].[${STAGING}]`);
  tbl.create = false;
  const C = tbl.columns;
  C.add('Name', mssql.NVarChar(255), { nullable: true });
  C.add('Article', mssql.NVarChar(50), { nullable: true });
  C.add('SHK', mssql.NVarChar(50), { nullable: true });
  C.add('Product_QNT', mssql.NVarChar(50), { nullable: true });
  C.add('Prunit_Name', mssql.NVarChar(255), { nullable: true });
  C.add('Prunit_Id', mssql.Int, { nullable: true });
  C.add('WR_SHK', mssql.NVarChar(255), { nullable: true });
  C.add('id_scklad', mssql.Int, { nullable: true });
  C.add('Expiration_Date', mssql.NVarChar(50), { nullable: true });
  C.add('Executor', mssql.NVarChar(255), { nullable: true });
  C.add('Place_QNT', mssql.Int, { nullable: true });
  C.add('Condition_State', mssql.NVarChar(50), { nullable: true });
  C.add('name_wr_shk', mssql.NVarChar(255), { nullable: true });
  C.add('reason', mssql.NVarChar(255), { nullable: true });
  for (const p of prepared) {
    tbl.rows.add(p.Name, p.Article, p.SHK, p.Product_QNT, p.Prunit_Name, p.Prunit_Id,
      p.WR_SHK, p.id_scklad, p.Expiration_Date, p.Executor, p.Place_QNT,
      p.Condition_State, p.name_wr_shk, p.reason);
  }
  const bulk = await pool.request().bulk(tbl);
  console.log(`Залито в dbo.${STAGING}: ${bulk.rowsAffected}`);

  const plan = (await pool.request().query(`
    SELECT
      (SELECT COUNT(*) FROM [SPOe_rc].[dbo].[${STAGING}])                   AS staging_rows,
      (SELECT COUNT(*) FROM [SPOe_rc].[dbo].[x_Storage_Full_Info])          AS current_rows,
      (SELECT ISNULL(MAX(ID),0) FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]) AS max_id,
      (SELECT COUNT(*) FROM [SPOe_rc].[dbo].[${STAGING}] s
        WHERE EXISTS (SELECT 1 FROM [SPOe_rc].[dbo].[x_Storage_Full_Info] f
          WHERE f.Article=s.Article AND f.WR_SHK=s.WR_SHK AND f.Prunit_Id=s.Prunit_Id)) AS overlap_rows
  `)).recordset[0];
  console.log('\nПлан догрузки:');
  console.log(`  staging:            ${plan.staging_rows}`);
  console.log(`  сейчас в таблице:   ${plan.current_rows}`);
  console.log(`  MAX(ID):            ${plan.max_id}  ->  новые ID ${plan.max_id + 1}..${plan.max_id + plan.staging_rows}`);
  console.log(`  пересечений (Article+ячейка+Prunit уже есть): ${plan.overlap_rows}`);
  console.log(`  станет строк:       ${plan.current_rows + plan.staging_rows}`);

  if (!RUN) {
    console.log('\nПредпросмотр. Выполнить: node ingest_append.js ' + JSON_ARG + ' ' + STAGING + ' --run');
    await pool.close();
    return;
  }

  const tx = new mssql.Transaction(pool);
  await tx.begin();
  try {
    const r = await new mssql.Request(tx).query(`
      INSERT INTO [SPOe_rc].[dbo].[x_Storage_Full_Info]
        (ID, Name, Article, SHK, Product_QNT, Prunit_Name, Prunit_Id, WR_SHK, id_scklad,
         Expiration_Date, Start_Expiration_Date, End_Expiration_Date, Executor, Place_QNT,
         Condition_State, Create_Date, Update_Date, name_wr_shk, reason)
      SELECT
        (SELECT MAX(ID) FROM [SPOe_rc].[dbo].[x_Storage_Full_Info])
          + ROW_NUMBER() OVER (ORDER BY s.name_wr_shk, s.Article, s.Prunit_Id),
        s.Name, s.Article, s.SHK, s.Product_QNT, s.Prunit_Name, s.Prunit_Id, s.WR_SHK, s.id_scklad,
        s.Expiration_Date, CAST('${FAR_DATE}' AS DATE), CAST('${FAR_DATE}' AS DATE),
        s.Executor, s.Place_QNT, s.Condition_State, GETDATE(), GETDATE(), s.name_wr_shk, s.reason
      FROM [SPOe_rc].[dbo].[${STAGING}] s;`);
    const after = (await new mssql.Request(tx).query(
      'SELECT COUNT(*) n, MAX(ID) mx FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]')).recordset[0];
    const expected = plan.current_rows + plan.staging_rows;
    console.log(`\nВставлено ${r.rowsAffected}. Стало ${after.n} (ожидалось ${expected}), MAX(ID)=${after.mx}`);
    if (after.n !== expected) { await tx.rollback(); console.log('Расхождение — ОТКАТ.'); }
    else { await tx.commit(); console.log('COMMIT. Готово.'); }
  } catch (e) {
    await tx.rollback();
    console.error('Ошибка, откат:', e.message);
    process.exitCode = 1;
  }
  await pool.close();
})().catch((e) => { console.error(e); process.exit(1); });
