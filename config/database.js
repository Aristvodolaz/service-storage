const mssql = require('mssql');
require('dotenv').config({ path: './config/data.env' });

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_DATABASE,
    pool: {
        max: parseInt(process.env.DB_POOL_MAX, 10),
        min: parseInt(process.env.DB_POOL_MIN, 10),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT, 10)
    },
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        enableArithAbort: process.env.DB_ENABLE_ARITH_ABORT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    }
};

let pool;

async function connectToDatabase() {
    try {
        if (!pool) {
            pool = await new mssql.ConnectionPool(config).connect();
            console.log('Соединение установлено');
        }
        return pool;
    } catch (err) {
        console.error("Ошибка подключения", err);
        throw err;
    }
}

module.exports = {
    mssql,
    connectToDatabase
};
