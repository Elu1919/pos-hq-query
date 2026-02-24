const mongoose = require('mongoose')
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

// 設定連線
const connectMongoDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI

    await mongoose.connect(mongoUri)

    console.log('✅ Connected to MongoDB')
  } catch (err) {
    console.error('❌ MongoDB connection error:', err)
    process.exit(1) // 連線失敗則停止程序
  }
}

module.exports = connectMongoDB