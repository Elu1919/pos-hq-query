// src/middlewares/auth.js
require('dotenv').config() // 確保能讀取到 .env 檔案
const { USERS } = require('../config/roles')

const checkAuth = (requiredLevel) => {
  return (req, res, next) => {
    const identity = process.env.MY_SHOP_ID
    const user = USERS[identity]

    if (!user) {
      return res.status(401).json({ msg: '系統無法辨識此電腦身分' })
    }

    if (user.level < requiredLevel) {
      // 這裡 user.level 必須要有值 (30) 才能跟 requiredLevel 比較
      return res.status(403).json({ msg: '權限不足，請利用「上一頁」可回到系統' })
    }

    next()
  }
}

module.exports = checkAuth