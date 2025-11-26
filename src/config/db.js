const sql = require('mssql')
const dotenv = require('dotenv')
dotenv.config()

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,      // 例如 "localhost" 或 "192.168.1.100"
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: false,                   // Azure SQL 可改 true
    trustServerCertificate: true      // 避免自簽名證書錯誤
  }
}

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('✅ Connected to SQL Server')
    return pool
  })
  .catch(err => {
    console.error('❌ Database Connection Failed!', err)
    process.exit(1)
  })

module.exports = { sql, poolPromise }
