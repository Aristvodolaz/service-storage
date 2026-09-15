/**
 * Обновление справочника ячеек x_Storage_Scklads по складу 1383.
 *
 * Аддитивные шаги (выполняются сразу):
 *   1. резервная копия строк WR_House='1383' -> x_Storage_Scklads_bak_<ГГГГММДД>;
 *   2. промежуточная таблица dbo.stg_scklads_1383 (Name, SHK) из scklads_1383.json.
 *
 * Разрушающий шаг НЕ выполняется. Генерируются:
 *   swap_scklads.sql  - DELETE строк 1383 + INSERT из staging (запускает человек);
 *   fix_45.sql        - проставить WR_SHK 45 строкам x_Storage_Full_Info,
 *                        помеченным 'НЕТ ШК ЯЧЕЙКИ - дозагрузить' (после swap).
 *
 *   node load_scklads.js
 */
const fs = require('fs');
const path = require('path');
const mssql = require('mssql');

const HERE = __dirname;
const WR_HOUSE = '1383';
const JSON_PATH = path.join(HERE, 'scklads_1383.json');
const STAGING = 'stg_scklads_1383';
const MARK = 'НЕТ ШК ЯЧЕЙКИ - дозагрузить';
const BAK = `x_Storage_Scklads_bak_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

const cfg = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'icY2eGuyfU',
  server: process.env.DB_SERVER || 'PRM-SRV-MSSQL-01.komus.net',
  port: parseInt(process.env.DB_PORT || '59587', 10),
  database: process.env.DB_DATABASE || 'SPOe_rc',
  options: { encrypt: true, trustServerCertificate: true, enableArithAbort: true },
  connectionTimeout: 15000,
  requestTimeout: 180000,
};

(async () => {
  const rows = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  console.log(`scklads_1383.json: ${rows.length} ячеек`);

  const pool = await new mssql.ConnectionPool(cfg).connect();

  const cur = (await pool.request().query(
    `SELECT COUNT(*) n FROM [SPOe_rc].[dbo].[x_Storage_Scklads] WHERE WR_House='${WR_HOUSE}'`
  )).recordset[0].n;
  console.log(`Сейчас в x_Storage_Scklads (WR_House=${WR_HOUSE}): ${cur}`);

  // 1. backup
  const bakExists = (await pool.request().query(
    `SELECT OBJECT_ID('[SPOe_rc].[dbo].[${BAK}]') oid`)).recordset[0].oid;
  if (bakExists) {
    console.log(`Резервная копия dbo.${BAK} уже есть — пропуск`);
  } else {
    await pool.request().query(
      `SELECT * INTO [SPOe_rc].[dbo].[${BAK}]
       FROM [SPOe_rc].[dbo].[x_Storage_Scklads] WHERE WR_House='${WR_HOUSE}'`);
    console.log(`Резервная копия dbo.${BAK}: ${cur} строк`);
  }

  // 2. staging
  await pool.request().query(`
    IF OBJECT_ID('[SPOe_rc].[dbo].[${STAGING}]') IS NOT NULL DROP TABLE [SPOe_rc].[dbo].[${STAGING}];
    CREATE TABLE [SPOe_rc].[dbo].[${STAGING}] (
      seq INT IDENTITY(1,1) PRIMARY KEY,
      Name NVARCHAR(255) NULL,
      SHK NVARCHAR(255) NULL,
      WR_House NVARCHAR(255) NOT NULL
    );`);

  const tbl = new mssql.Table(`[SPOe_rc].[dbo].[${STAGING}]`);
  tbl.create = false;
  tbl.columns.add('Name', mssql.NVarChar(255), { nullable: true });
  tbl.columns.add('SHK', mssql.NVarChar(255), { nullable: true });
  tbl.columns.add('WR_House', mssql.NVarChar(255), { nullable: false });
  for (const r of rows) tbl.rows.add(r.name, r.shk, r.house || WR_HOUSE);
  const bulk = await pool.request().bulk(tbl);
  console.log(`Залито в dbo.${STAGING}: ${bulk.rowsAffected}`);

  const chk = (await pool.request().query(`
    SELECT
      (SELECT COUNT(*) FROM [SPOe_rc].[dbo].[${STAGING}]) staging_rows,
      (SELECT COUNT(*) FROM [SPOe_rc].[dbo].[${STAGING}] WHERE SHK IS NULL) no_shk,
      (SELECT COUNT(*) FROM [SPOe_rc].[dbo].[x_Storage_Full_Info] WHERE reason = N'${MARK}') marked_rows,
      (SELECT COUNT(*) FROM [SPOe_rc].[dbo].[x_Storage_Full_Info] f
        WHERE f.reason = N'${MARK}'
          AND EXISTS (SELECT 1 FROM [SPOe_rc].[dbo].[${STAGING}] s
                      WHERE s.Name = f.name_wr_shk AND s.SHK IS NOT NULL)) marked_resolvable
  `)).recordset[0];
  console.log('\nПроверка:');
  console.log(`  staging строк:            ${chk.staging_rows}`);
  console.log(`  из них без BarCode:       ${chk.no_shk}`);
  console.log(`  помечено в full_info:     ${chk.marked_rows}`);
  console.log(`  из них резолвятся новым справочником: ${chk.marked_resolvable}`);

  // swap_scklads.sql
  fs.writeFileSync(path.join(HERE, 'swap_scklads.sql'),
`/* ================================================================
   Обновление справочника ячеек x_Storage_Scklads по складу ${WR_HOUSE}.
   Сгенерировано ${new Date().toISOString()}
   Резервная копия: dbo.${BAK}
   ================================================================ */
SET XACT_ABORT ON;
BEGIN TRAN;

    DELETE FROM [SPOe_rc].[dbo].[x_Storage_Scklads] WHERE WR_House = '${WR_HOUSE}';

    -- ячейки без BarCode пропускаем: колонка SHK NOT NULL.
    INSERT INTO [SPOe_rc].[dbo].[x_Storage_Scklads] (Name, SHK, WR_House)
    SELECT Name, SHK, WR_House
    FROM [SPOe_rc].[dbo].[${STAGING}]
    WHERE SHK IS NOT NULL;

    SELECT
        (SELECT COUNT(*) FROM [SPOe_rc].[dbo].[${STAGING}] WHERE SHK IS NOT NULL)         AS staging_rows,
        (SELECT COUNT(*) FROM [SPOe_rc].[dbo].[x_Storage_Scklads] WHERE WR_House='${WR_HOUSE}') AS house_rows;

-- числа должны совпасть -> COMMIT; иначе ROLLBACK;
COMMIT;
`, 'utf8');

  // fix_45.sql
  fs.writeFileSync(path.join(HERE, 'fix_45.sql'),
`/* ================================================================
   Догрузка ячеек, не найденных вчера в справочнике.
   Запускать ПОСЛЕ swap_scklads.sql.
   ================================================================ */
SET XACT_ABORT ON;
BEGIN TRAN;

    UPDATE f
       SET f.WR_SHK = s.SHK,
           f.reason = '',
           f.Update_Date = GETDATE()
    FROM [SPOe_rc].[dbo].[x_Storage_Full_Info] f
    JOIN [SPOe_rc].[dbo].[x_Storage_Scklads] s
      ON s.Name = f.name_wr_shk AND s.WR_House = '${WR_HOUSE}'
    WHERE f.reason = N'${MARK}';

    SELECT COUNT(*) AS still_marked
    FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
    WHERE reason = N'${MARK}';

-- still_marked должно стать 0 -> COMMIT; иначе разбираемся, ROLLBACK;
COMMIT;
`, 'utf8');

  console.log('\n-> swap_scklads.sql (разрушающий, запуск вручную)');
  console.log('-> fix_45.sql (после swap; UPDATE 45 строк)');

  await pool.close();
})().catch((e) => { console.error(e); process.exit(1); });
