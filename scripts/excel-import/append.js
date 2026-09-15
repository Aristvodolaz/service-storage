/**
 * Догрузка остатков из промежуточной таблицы dbo.stg_storage_full_info_load
 * в x_Storage_Full_Info БЕЗ удаления существующих строк.
 *
 * ID новым строкам выдаётся продолжением от текущего MAX(ID).
 * Операция аддитивная (только INSERT).
 *
 *   node append.js          — показать план (сколько строк, пересечения), НИЧЕГО не писать
 *   node append.js --run    — выполнить INSERT в транзакции
 */
const mssql = require('mssql');

const STAGING = 'stg_storage_full_info_load';
const FAR_DATE = '2999-01-01';
const RUN = process.argv.includes('--run');

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

(async () => {
  const pool = await new mssql.ConnectionPool(cfg).connect();

  const plan = (await pool.request().query(`
    SELECT
      (SELECT COUNT(*) FROM [SPOe_rc].[dbo].[${STAGING}])                       AS staging_rows,
      (SELECT COUNT(*) FROM [SPOe_rc].[dbo].[x_Storage_Full_Info])              AS current_rows,
      (SELECT ISNULL(MAX(ID),0) FROM [SPOe_rc].[dbo].[x_Storage_Full_Info])     AS max_id,
      (SELECT COUNT(*) FROM [SPOe_rc].[dbo].[${STAGING}] s
        WHERE EXISTS (SELECT 1 FROM [SPOe_rc].[dbo].[x_Storage_Full_Info] f
                      WHERE f.Article = s.Article AND f.WR_SHK = s.WR_SHK
                        AND f.Prunit_Id = s.Prunit_Id))                        AS overlap_rows
  `)).recordset[0];

  console.log('План догрузки:');
  console.log(`  строк в staging:                         ${plan.staging_rows}`);
  console.log(`  строк сейчас в x_Storage_Full_Info:      ${plan.current_rows}`);
  console.log(`  текущий MAX(ID):                         ${plan.max_id}`);
  console.log(`  новые ID:                                ${plan.max_id + 1} .. ${plan.max_id + plan.staging_rows}`);
  console.log(`  из них уже есть пара Article+ячейка+Prunit: ${plan.overlap_rows} (будут добавлены как дубли)`);
  console.log(`  итого станет:                            ${plan.current_rows + plan.staging_rows}`);

  if (!RUN) {
    console.log('\nЭто предпросмотр. Для выполнения: node append.js --run');
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
          + ROW_NUMBER() OVER (ORDER BY s.name_wr_shk, s.Article, s.Prunit_Id) AS ID,
        s.Name, s.Article, s.SHK, s.Product_QNT, s.Prunit_Name, s.Prunit_Id, s.WR_SHK, s.id_scklad,
        s.Expiration_Date,
        CAST('${FAR_DATE}' AS DATE), CAST('${FAR_DATE}' AS DATE),
        s.Executor, s.Place_QNT,
        s.Condition_State, GETDATE(), GETDATE(), s.name_wr_shk, s.reason
      FROM [SPOe_rc].[dbo].[${STAGING}] s;
    `);
    const after = (await new mssql.Request(tx).query(
      'SELECT COUNT(*) n, MAX(ID) mx FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]'
    )).recordset[0];
    const expected = plan.current_rows + plan.staging_rows;
    console.log(`\nВставлено: ${r.rowsAffected}. Строк стало: ${after.n} (ожидалось ${expected}). MAX(ID)=${after.mx}`);
    if (after.n !== expected) {
      await tx.rollback();
      console.log('Расхождение — откат.');
    } else {
      await tx.commit();
      console.log('COMMIT. Готово.');
    }
  } catch (e) {
    await tx.rollback();
    console.error('Ошибка, откат:', e.message);
    process.exitCode = 1;
  }
  await pool.close();
})().catch((e) => { console.error(e); process.exit(1); });
