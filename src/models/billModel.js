// src/models/billModel.js

const dayjs = require('dayjs')
const { poolPromise } = require('../config/db')

const billData = {
  getAllBillData: async (filterIn) => {
    try {
      const pool = await poolPromise

      // 1. 參數標準化與預設值
      const bMonthS = (filterIn.BillMonthStart || '').toString()
      const bMonthE = (filterIn.BillMonthEnd || bMonthS || '').toString()
      const shopId = (filterIn.SHOP_ID || '').toString() // 單選門市

      const result = await pool.request()
        .input('B_MONTH_S_VAL', bMonthS)
        .input('B_MONTH_E_VAL', bMonthE)
        .input('SHOP_ID_VAL', shopId)
        .input('VIP_ID', filterIn.VIP_ID || '')
        .input('VIP_NAME', filterIn.VIP_NAME || '')
        .query(`
        /* 1. 變數初始化與月份處理 */
        DECLARE @B_MS_VAL NVARCHAR(6) = @B_MONTH_S_VAL
        DECLARE @B_ME_VAL NVARCHAR(6) = @B_MONTH_E_VAL
        DECLARE @S_ID_VAL NVARCHAR(10) = @SHOP_ID_VAL

        -- 如果沒有輸入日期，預設為當前月份
        DECLARE @B_MONTH_S NVARCHAR(6) = CASE WHEN @B_MS_VAL = '' THEN FORMAT(GETDATE(), 'yyyyMM') ELSE @B_MS_VAL END
        DECLARE @B_MONTH_E NVARCHAR(6) = CASE WHEN @B_ME_VAL = '' THEN @B_MONTH_S ELSE @B_ME_VAL END

        /* 2. 主查詢邏輯 */
        SELECT
          SB0.STR_BAL_ID,
          SB0.STATUS,
          SB0.SHOP_ID,
          SHOP2.SHOP_NAME,
          SHOP2.TEL,
          SB0.TOTAL,
          SB0.PAID,
          ISNULL(SB0.TOTAL, 0) - ISNULL(SB0.PAID, 0) AS N_PAID,
          SB0.AMOUNT,
          SB0.DISCOUNT,
          SB0.DISCHARGE,
          SB0.MISCELL_COST,
          SB0.BILL_MONTH,
          SB0.BILL_ORDER,
          SB0.INPUT_DATE,
          (
            SELECT
              VIP.VIP_ID, VIP.NAME, VIP.TELEPHONE, VIP.MOBILE,
              VIP.VIP_CODE, VIP.LINKMAN, VIP.COMPANY, VIP.COMPANY_ADDR
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
          ) AS VIP,
          (
            SELECT
              S1.SHOP_ID, S0.TYPE, S1.SALE_ID, S1.PROD_ID,
              S1.SALE_PRICE, S1.QTY, S1.SALE_PRICE * S1.QTY AS SUBTOTAL,
              S1.ITEM_DISC, S1.FREE_MEMO, S1.ORDER_TIME,
              SHOP.SHOP_NAME, PROD.PROD_NAME1, UNIT.UNIT_NAME
            FROM BILL00 B0
            INNER JOIN BILL01 B1 ON B1.BILL_ID = B0.BILL_ID
            INNER JOIN SALE01 S1 ON S1.SALE_ID = B1.IMPORT_ID
            INNER JOIN SALE00 S0 ON S1.SALE_ID = S0.SALE_ID
            INNER JOIN SHOP00 SHOP ON SHOP.SHOP_ID = S1.SHOP_ID
            INNER JOIN PRODUCT00 PROD ON PROD.PROD_ID = S1.PROD_ID
            INNER JOIN UNIT ON UNIT.UNIT_ID = PROD.UNIT
            WHERE B0.EXPORT_ID = SB0.STR_BAL_ID
            FOR JSON PATH
          ) AS SALE_LIST
        FROM STR_BAL00 SB0
        INNER JOIN VIP00 VIP     ON VIP.VIP_ID   = SB0.VIP_ID
        INNER JOIN SHOP00 SHOP2  ON SHOP2.SHOP_ID = SB0.SHOP_ID
        WHERE SB0.STATUS = 2
        
        /* 條件過濾 */
        -- 月份範圍
        AND (SB0.BILL_MONTH >= @B_MONTH_S AND SB0.BILL_MONTH <= @B_MONTH_E)

        -- 門市單選處理
        AND (@S_ID_VAL = '' OR SB0.SHOP_ID = @S_ID_VAL)
        
        -- 文字過濾
        AND (@VIP_ID = '' OR VIP.VIP_ID LIKE '%' + @VIP_ID + '%')
        AND (@VIP_NAME = '' OR VIP.NAME LIKE '%' + @VIP_NAME + '%')

        ORDER BY SB0.BILL_MONTH DESC, SB0.SHOP_ID ASC
      `)

      // 2. 資料後處理
      const bills = result.recordset

      for (const bill of bills) {
        const d = bill.INPUT_DATE ? bill.INPUT_DATE.toISOString().replace('Z', '') : null
        bill.INPUT_DATE = d ? dayjs(d).format('YY-MM-DD') : ''

        try { bill.VIP = JSON.parse(bill.VIP) } catch (e) { bill.VIP = {} }
        try { bill.SALE_LIST = JSON.parse(bill.SALE_LIST) } catch (e) { bill.SALE_LIST = [] }
        bill.SALE_COUNT = bill.SALE_LIST?.length || 0
      }

      return bills
    } catch (err) {
      console.error('對帳單資料取得失敗：', err)
      throw err
    }
  }
}

module.exports = billData
