/* ================================================================
   Удаление 8 строк с отрицательным остатком из x_Storage_Full_Info
   (7 переданы пользователем 2026-09-08 + ID 9955, подтверждена отдельно).
   Перед удалением строки копируются в x_Storage_Full_Info_bak_neg_20260908.
   После — в таблице не должно остаться строк с Place_QNT < 0 по складу 1383.
   ================================================================ */
SET XACT_ABORT ON;
BEGIN TRAN;

    SELECT * INTO [SPOe_rc].[dbo].[x_Storage_Full_Info_bak_neg_20260908]
    FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
    WHERE ID IN (1212, 1261, 1316, 1756, 7786, 8409, 10295, 9955);

    DELETE FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
    WHERE ID IN (1212, 1261, 1316, 1756, 7786, 8409, 10295, 9955);

    SELECT
        @@ROWCOUNT AS deleted,                                                    -- должно быть 8
        (SELECT COUNT(*) FROM [SPOe_rc].[dbo].[x_Storage_Full_Info]
         WHERE Place_QNT < 0) AS negative_left;                                    -- должно быть 0

COMMIT;
-- при deleted <> 8 или negative_left <> 0 -> ROLLBACK;
