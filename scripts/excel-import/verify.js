const mssql = require('mssql');
const cfg = {
  user: 'sa', password: 'icY2eGuyfU', server: 'PRM-SRV-MSSQL-01.komus.net',
  port: 59587, database: 'SPOe_rc',
  options: { encrypt: true, trustServerCertificate: true, enableArithAbort: true },
  connectionTimeout: 15000, requestTimeout: 60000,
};
(async () => {
  const p = await new mssql.ConnectionPool(cfg).connect();
  const q = async (l, s) => { console.log('\n== ' + l); console.log(JSON.stringify((await p.request().query(s)).recordset, null, 1)); };
  await q('counts', `SELECT
     (SELECT COUNT(*) FROM dbo.stg_storage_full_info_load) staging,
     (SELECT COUNT(*) FROM dbo.stg_storage_full_info_load WHERE WR_SHK IS NULL) no_wrshk,
     (SELECT COUNT(*) FROM dbo.stg_storage_full_info_load WHERE Prunit_Id IS NULL) no_prunit,
     (SELECT COUNT(DISTINCT WR_SHK) FROM dbo.stg_storage_full_info_load) cells,
     (SELECT COUNT(*) FROM dbo.x_Storage_Full_Info_bak_20260829) [backup]`);
  await q('wrshk resolves to real cells', `SELECT COUNT(*) matched FROM dbo.stg_storage_full_info_load s
     JOIN dbo.x_Storage_Scklads d ON d.SHK = s.WR_SHK AND d.WR_House='1383'`);
  await q('sample', `SELECT TOP 8 Name,Article,SHK,Product_QNT,Place_QNT,Prunit_Id,Prunit_Name,WR_SHK,name_wr_shk,Condition_State,Expiration_Date FROM dbo.stg_storage_full_info_load ORDER BY seq`);
  await q('cond/exp', `SELECT Condition_State, COUNT(*) n FROM dbo.stg_storage_full_info_load GROUP BY Condition_State`);
  await q('real exp dates', `SELECT TOP 5 name_wr_shk, Expiration_Date FROM dbo.stg_storage_full_info_load WHERE Expiration_Date <> '2999-01-01'`);
  await p.close();
})().catch(e => { console.error(e); process.exit(1); });
