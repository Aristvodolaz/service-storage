const mssql = require('mssql');
require('dotenv').config({ path: './config/data.env' });

const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'icY2eGuyfU',
    server: process.env.DB_SERVER || 'PRM-SRV-MSSQL-01.komus.net',
    port: parseInt(process.env.DB_PORT || '59587'),
    database: process.env.DB_DATABASE || 'SPOe_rc',
    pool:{
        max: parseInt(process.env.DB_POOL_MAX || '500'),
        min: parseInt(process.env.DB_POOL_MIN || '0'),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000')
    },
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      enableArithAbort: process.env.DB_ENABLE_ARITH_ABORT === 'true',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    }
  };

  let pool;

  async function connectToDatabase(){
    try{
        if(!pool){
            pool = await new mssql.ConnectionPool(config).connect();
            console.log('Успешное подключение к базе данных');
        }
        return pool;
    }catch(err){
        console.error("Ошибка подключения к базе данных:", err);
        throw err;
    }
  }

  module.exports = {
    mssql, connectToDatabase
  }