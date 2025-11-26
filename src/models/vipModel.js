const { poolPromise } = require('../config/db')

const vipData = {
  getVipList: async () => {
    try {
      const pool = await poolPromise
      const result = await pool.request()
        .query(`
          SELECT VIP_ID, NAME, TELEPHONE, MOBILE, vip_code
          FROM VIP00
          WHERE 
            (
              (( VIP_ID LIKE 'CR%' OR VIP_ID LIKE 'B2B%' OR VIP_ID LIKE 'SALE%') AND VIP_ID <> NAME )
              OR
              ( VIP_ID LIKE 'CUST%' AND (TELEPHONE IS NOT NULL OR MOBILE IS NOT NULL))
            )
            AND VIP_ID NOT LIKE 'TEST%';
        `)
      return result.recordset
    } catch (err) {
      console.error('資料取得失敗：', err)
      throw err
    }
  },

  getVipGrpList: async () => {
    try {
      const pool = await poolPromise
      const result = await pool.request()
        .query(`
          SELECT vipgrp_id, vipgrp_name FROM vip_group00
        `)
      return result.recordset
    } catch (err) {
      console.error('資料取得失敗：', err)
      throw err
    }
  }
}

module.exports = vipData
