const mongoose = require('mongoose')
const crypto = require('crypto')
require('dotenv').config()

const connectMongoDB = async () => {
  try {
    // 1. 執行解密
    const algorithm = 'aes-256-cbc'
    const masterKey = process.env.MASTER_KEY
    const encryptedData = process.env.ENCRYPTED_DATA

    if (!masterKey || !encryptedData) {
      console.error('❌ 錯誤：.env 中缺少 MASTER_KEY 或 ENCRYPTED_DATA')
      return
    }

    const key = Buffer.from(masterKey, 'hex')
    const encryptedItems = JSON.parse(encryptedData)

    // 假設你的 Key 叫 MONGODB_URI
    const mongoData = encryptedItems.MONGODB_URI
    if (!mongoData) {
      console.error('❌ 錯誤：ENCRYPTED_DATA 內找不到 MONGODB_URI 這個 Key')
      return
    }

    // 2. 解密過程
    const iv = Buffer.from(mongoData.iv, 'hex')
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    let decryptedUri = decipher.update(mongoData.encrypted, 'base64', 'utf8')
    decryptedUri += decipher.final('utf8')

    // 3. 偵錯印出 (只印開頭確保安全)
    console.log('--- MongoDB 連線測試 ---')
    console.log('解密後的 URI 開頭為:', decryptedUri.substring(0, 15))

    // 4. 正式連線
    await mongoose.connect(decryptedUri)
    console.log('✅ Connected to MongoDB')

  } catch (err) {
    console.error('❌ MongoDB 啟動失敗:', err.message)
  }
}

module.exports = connectMongoDB
