const BaseRepository = require('./BaseRepository');

const TABLE_SQL = `
IF OBJECT_ID(N'dbo.api_idempotency_keys', N'U') IS NULL
CREATE TABLE dbo.api_idempotency_keys (
  idempotency_key NVARCHAR(100) NOT NULL CONSTRAINT PK_api_idempotency_keys PRIMARY KEY,
  request_hash    CHAR(64) NOT NULL,
  status_code     INT NULL,
  response_body   NVARCHAR(MAX) NULL,
  created_at      DATETIME2 NOT NULL CONSTRAINT DF_api_idempotency_created DEFAULT SYSUTCDATETIME()
)`;

/** Хранилище ключей идемпотентности в MSSQL (контракт см. middlewares/idempotency.js). */
class IdempotencyRepository extends BaseRepository {
  constructor() {
    super();
    this.tableReady = null;
  }

  ensureTable() {
    if (!this.tableReady) {
      this.tableReady = this.executeQuery(TABLE_SQL).catch((err) => {
        this.tableReady = null;
        throw err;
      });
    }
    return this.tableReady;
  }

  async insert(key, requestHash) {
    await this.ensureTable();
    try {
      await this.executeQuery(
        `INSERT INTO dbo.api_idempotency_keys (idempotency_key, request_hash, status_code, response_body, created_at)
         VALUES (@idemKey, @reqHash, NULL, NULL, SYSUTCDATETIME())`,
        { idemKey: key, reqHash: requestHash }
      );
      return true;
    } catch (err) {
      // Нарушение первичного ключа: такой ключ уже есть
      if (/PRIMARY KEY|duplicate key/i.test(err.message)) {
        return false;
      }
      throw err;
    }
  }

  async find(key) {
    await this.ensureTable();
    const rows = await this.executeQuery(
      `SELECT request_hash, status_code, response_body,
              DATEDIFF(MILLISECOND, created_at, SYSUTCDATETIME()) AS age_ms
       FROM dbo.api_idempotency_keys WHERE idempotency_key = @idemKey`,
      { idemKey: key }
    );
    if (!rows.length) return null;
    const row = rows[0];
    return {
      requestHash: row.request_hash.trim(),
      statusCode: row.status_code,
      responseBody: row.response_body ? JSON.parse(row.response_body) : null,
      ageMs: row.age_ms
    };
  }

  async claimStale(key, requestHash, staleMs) {
    await this.ensureTable();
    const rows = await this.executeQuery(
      `UPDATE dbo.api_idempotency_keys SET created_at = SYSUTCDATETIME()
       WHERE idempotency_key = @idemKey AND request_hash = @reqHash AND status_code IS NULL
         AND DATEDIFF(MILLISECOND, created_at, SYSUTCDATETIME()) > @staleMs;
       SELECT @@ROWCOUNT AS affected;`,
      { idemKey: key, reqHash: requestHash, staleMs }
    );
    return rows.length > 0 && rows[0].affected > 0;
  }

  async complete(key, statusCode, responseBody) {
    await this.ensureTable();
    const body = responseBody === undefined ? null : JSON.stringify(responseBody);
    await this.executeQuery(
      `UPDATE dbo.api_idempotency_keys SET status_code = @statusCode, response_body = @body
       WHERE idempotency_key = @idemKey`,
      { idemKey: key, statusCode, body }
    );
  }

  async release(key) {
    await this.ensureTable();
    await this.executeQuery(
      `DELETE FROM dbo.api_idempotency_keys WHERE idempotency_key = @idemKey AND status_code IS NULL`,
      { idemKey: key }
    );
  }
}

module.exports = IdempotencyRepository;
