/* ================================================================
   ОТКАТ переноса: вернуть x_Storage_Full_Info из резервной копии
   dbo.x_Storage_Full_Info_bak_20260829 (снята 2026-08-29, 11806 строк).
   ================================================================ */
SET XACT_ABORT ON;
BEGIN TRAN;

    DELETE FROM [SPOe_rc].[dbo].[x_Storage_Full_Info];

    INSERT INTO [SPOe_rc].[dbo].[x_Storage_Full_Info]
    SELECT * FROM [SPOe_rc].[dbo].[x_Storage_Full_Info_bak_20260829];

    SELECT
        (SELECT COUNT(*) FROM [SPOe_rc].[dbo].[x_Storage_Full_Info_bak_20260829]) AS backup_rows,
        (SELECT COUNT(*) FROM [SPOe_rc].[dbo].[x_Storage_Full_Info])              AS restored_rows;

COMMIT;
-- при расхождении чисел: ROLLBACK;
