/* ================================================================
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
      ON s.Name = f.name_wr_shk AND s.WR_House = '1383'
    WHERE f.reason = N'НЕТ ШК ЯЧЕЙКИ - дозагрузить';

    SELECT COUNT(*) AS still_marked
    FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
    WHERE reason = N'НЕТ ШК ЯЧЕЙКИ - дозагрузить';

-- still_marked должно стать 0 -> COMMIT; иначе разбираемся, ROLLBACK;
COMMIT;
