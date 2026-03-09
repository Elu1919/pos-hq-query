// src/middlewares/auth.js
require('dotenv').config()
const { USERS, ROLES } = require('../config/roles')

const checkAuth = (requiredLevel) => {
  return (req, res, next) => {
    const identity = process.env.MY_SHOP_ID
    const user = USERS[identity]

    // 1. 檢查身分是否存在
    if (!user) {
      return res.status(401).json({ msg: '系統無法辨識此電腦身分' })
    }

    // 2. 處理 ST (40) 不可看「撥補 (30)」的例外邏輯
    // 如果要求的等級是 WH (30)，但當前身分是 ST (40)，則拒絕存取
    if (requiredLevel === ROLES.WH && user.level === ROLES.ST) {
      return res.status(403).json({ msg: '門市人員權限不可存取撥補系統' })
    }

    // 3. 基礎等級檢查
    if (user.level < requiredLevel) {
      return res.status(403).json({ msg: '權限不足，請利用「上一頁」可回到系統' })
    }

    // 將使用者資訊掛載到 req，方便後續 Controller 使用（例如記錄是哪個門市下載的）
    req.user = user
    next()
  }
}

module.exports = checkAuth