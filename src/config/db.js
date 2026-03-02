// src/config/db.js

const sql = require('mssql')
const crypto = require('crypto')
const dotenv = require('dotenv')
dotenv.config()

// AES 設定
const algorithm = 'aes-256-cbc'
const key = Buffer.from(process.env.MASTER_KEY, 'hex')

// 解密函式
function decrypt(encryptedBase64, ivHex) {
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// 解析 ENCRYPTED_DATA
let encryptedItems = {}
try {
  encryptedItems = JSON.parse(process.env.ENCRYPTED_DATA || '{}')
} catch (err) {
  console.error('ENCRYPTED_DATA JSON 格式錯誤')
}

// 自動解密 -> 設定到 process.env
for (const key of Object.keys(encryptedItems)) {
  const item = encryptedItems[key]
  const value = decrypt(item.encrypted, item.iv)
  process.env[key] = value
}

// 用 process.env 連線
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    textsize: 2147483647
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
