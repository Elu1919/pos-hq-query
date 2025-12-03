// src/models/shopModel.js

const { poolPromise } = require('../config/db')

const shopData = {
  getShopList: async () => {
    try {
      const pool = await poolPromise
      const result = await pool.request()
        .query(`
          SELECT SHOP_ID, SHOP_NAME 
          FROM SHOP00
          WHERE (SHOP_ID NOT IN ('A','TEST01') OR SHOP_MEMO IS NULL);
        `)
      return result.recordset
    } catch (err) {
      console.error('資料取得失敗：', err)
      throw err
    }
  }
}

module.exports = shopData
