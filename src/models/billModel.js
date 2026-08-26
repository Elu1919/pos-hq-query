// src/models/billModel.js

const dayjs = require('dayjs')
const { poolPromise } = require('../config/db')

const billData = {
  getAllBillData: async (filterIn) => {
    try {
      const pool = await poolPromise

      const bMonthS = (filterIn.BillMonthStart || '').toString()
      const bMonthE = (filterIn.BillMonthEnd || bMonthS || '').toString()
      const shopId = (filterIn.SHOP_ID || '').toString()

      const result = await pool.request()
        .input('B_MONTH_S_VAL', bMonthS)
        .input('B_MONTH_E_VAL', bMonthE)
        .input('SHOP_ID_VAL', shopId)
        .input('VIP_ID_VAL', filterIn.VIP_ID || '')
        .input('VIP_NAME_VAL', filterIn.VIP_NAME || '')
        .query(`
        DECLARE @B_MS_VAL NVARCHAR(6) = @B_MONTH_S_VAL
        DECLARE @B_ME_VAL NVARCHAR(6) = @B_MONTH_E_VAL
        DECLARE @S_ID_VAL NVARCHAR(10) = @SHOP_ID_VAL
        DECLARE @VIP_ID NVARCHAR(50) = @VIP_ID_VAL
        DECLARE @VIP_NAME NVARCHAR(50) = @VIP_NAME_VAL

        DECLARE @B_MONTH_S NVARCHAR(6) = CASE WHEN @B_MS_VAL = '' THEN FORMAT(GETDATE(), 'yyyyMM') ELSE @B_MS_VAL END
        DECLARE @B_MONTH_E NVARCHAR(6) = CASE WHEN @B_ME_VAL = '' THEN @B_MONTH_S ELSE @B_ME_VAL END

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
          VIP.VIP_ID AS [VIP.VIP_ID],
          VIP.NAME AS [VIP.NAME],
          VIP.TELEPHONE AS [VIP.TELEPHONE],
          VIP.MOBILE AS [VIP.MOBILE],
          VIP.VIP_CODE AS [VIP.VIP_CODE],
          VIP.LINKMAN AS [VIP.LINKMAN],
          VIP.COMPANY AS [VIP.COMPANY],
          VIP.COMPANY_ADDR AS [VIP.COMPANY_ADDR]
        FROM STR_BAL00 SB0 WITH(NOLOCK)
        INNER JOIN VIP00 VIP WITH(NOLOCK) ON VIP.VIP_ID = SB0.VIP_ID
        INNER JOIN SHOP00 SHOP2 WITH(NOLOCK) ON SHOP2.SHOP_ID = SB0.SHOP_ID
        WHERE SB0.STATUS = 2
        AND (SB0.BILL_MONTH >= @B_MONTH_S AND SB0.BILL_MONTH <= @B_MONTH_E)
        AND (@S_ID_VAL = '' OR SB0.SHOP_ID = @S_ID_VAL)
        AND (@VIP_ID = '' OR VIP.VIP_ID LIKE @VIP_ID + '%')
        AND (@VIP_NAME = '' OR VIP.NAME LIKE '%' + @VIP_NAME + '%')
        ORDER BY SB0.BILL_MONTH DESC, SB0.SHOP_ID ASC
      `)

      return result.recordset.map(row => {
        const d = row.INPUT_DATE ? row.INPUT_DATE.toISOString().replace('Z', '') : null
        return {
          STR_BAL_ID: row.STR_BAL_ID,
          STATUS: row.STATUS,
          SHOP_ID: row.SHOP_ID,
          SHOP_NAME: row.SHOP_NAME,
          TEL: row.TEL,
          TOTAL: row.TOTAL,
          PAID: row.PAID,
          N_PAID: row.N_PAID,
          AMOUNT: row.AMOUNT,
          DISCOUNT: row.DISCOUNT,
          DISCHARGE: row.DISCHARGE,
          MISCELL_COST: row.MISCELL_COST,
          BILL_MONTH: row.BILL_MONTH,
          BILL_ORDER: row.BILL_ORDER,
          INPUT_DATE: d ? dayjs(d).format('YY-MM-DD') : '',
          VIP: {
            VIP_ID: row['VIP.VIP_ID'],
            NAME: row['VIP.NAME'],
            TELEPHONE: row['VIP.TELEPHONE'],
            MOBILE: row['VIP.MOBILE'],
            VIP_CODE: row['VIP.VIP_CODE'],
            LINKMAN: row['VIP.LINKMAN'],
            COMPANY: row['VIP.COMPANY'],
            COMPANY_ADDR: row['VIP.COMPANY_ADDR']
          }
        }
      })
    } catch (err) {
      console.error('對帳單資料取得失敗：', err)
      throw err
    }
  },
  getBillById: async (strBalId) => {
    try {
      const pool = await poolPromise

      const result = await pool.request()
        .input('STR_BAL_ID', strBalId)
        .query(`
        -- 1. 主檔資料
        SELECT
          SB0.STR_BAL_ID, SB0.STATUS, SB0.SHOP_ID, SHOP2.SHOP_NAME, SHOP2.TEL,
          SB0.TOTAL, SB0.PAID, ISNULL(SB0.TOTAL, 0) - ISNULL(SB0.PAID, 0) AS N_PAID,
          SB0.AMOUNT, SB0.DISCOUNT, SB0.DISCHARGE, SB0.MISCELL_COST,
          SB0.BILL_MONTH, SB0.BILL_ORDER, SB0.INPUT_DATE,
          VIP.VIP_ID, VIP.NAME, VIP.TELEPHONE, VIP.MOBILE,
          VIP.VIP_CODE, VIP.LINKMAN, VIP.COMPANY, VIP.COMPANY_ADDR
        FROM STR_BAL00 SB0 WITH(NOLOCK)
        INNER JOIN VIP00 VIP WITH(NOLOCK) ON VIP.VIP_ID = SB0.VIP_ID
        INNER JOIN SHOP00 SHOP2 WITH(NOLOCK) ON SHOP2.SHOP_ID = SB0.SHOP_ID
        WHERE SB0.STR_BAL_ID = @STR_BAL_ID;

        -- 2. 銷售明細資料
        SELECT
          S1.SHOP_ID, S0.TYPE, S1.SALE_ID, S1.PROD_ID,
          S1.SALE_PRICE, S1.QTY, S1.SALE_PRICE * S1.QTY AS SUBTOTAL,
          S1.ITEM_DISC, S1.FREE_MEMO, S0.SALE_DATE,
          SHOP.SHOP_NAME, PROD.PROD_NAME1, UNIT.UNIT_NAME
        FROM BILL00 B0 WITH(NOLOCK)
        INNER JOIN BILL01 B1 WITH(NOLOCK) ON B1.BILL_ID = B0.BILL_ID
        INNER JOIN SALE01 S1 WITH(NOLOCK) ON S1.SALE_ID = B1.IMPORT_ID
        INNER JOIN SALE00 S0 WITH(NOLOCK) ON S1.SALE_ID = S0.SALE_ID
        INNER JOIN SHOP00 SHOP WITH(NOLOCK) ON SHOP.SHOP_ID = S1.SHOP_ID
        INNER JOIN PRODUCT00 PROD WITH(NOLOCK) ON PROD.PROD_ID = S1.PROD_ID
        INNER JOIN UNIT WITH(NOLOCK) ON UNIT.UNIT_ID = PROD.UNIT
        WHERE B0.EXPORT_ID = @STR_BAL_ID;
      `)

      const mainRow = result.recordsets[0][0]
      if (!mainRow) return null

      const saleList = result.recordsets[1] || []
      const d = mainRow.INPUT_DATE ? mainRow.INPUT_DATE.toISOString().replace('Z', '') : null

      return {
        STR_BAL_ID: mainRow.STR_BAL_ID,
        STATUS: mainRow.STATUS,
        SHOP_ID: mainRow.SHOP_ID,
        SHOP_NAME: mainRow.SHOP_NAME,
        TEL: mainRow.TEL,
        TOTAL: mainRow.TOTAL,
        PAID: mainRow.PAID,
        N_PAID: mainRow.N_PAID,
        AMOUNT: mainRow.AMOUNT,
        DISCOUNT: mainRow.DISCOUNT,
        DISCHARGE: mainRow.DISCHARGE,
        MISCELL_COST: mainRow.MISCELL_COST,
        BILL_MONTH: mainRow.BILL_MONTH,
        BILL_ORDER: mainRow.BILL_ORDER,
        INPUT_DATE: d ? dayjs(d).format('YY-MM-DD') : '',
        VIP: {
          VIP_ID: mainRow.VIP_ID,
          NAME: mainRow.NAME,
          TELEPHONE: mainRow.TELEPHONE,
          MOBILE: mainRow.MOBILE,
          VIP_CODE: mainRow.VIP_CODE,
          LINKMAN: mainRow.LINKMAN,
          COMPANY: mainRow.COMPANY,
          COMPANY_ADDR: mainRow.COMPANY_ADDR
        },
        SALE_LIST: saleList
      }
    } catch (err) {
      console.error('取得單筆對帳單明細失敗：', err)
      throw err
    }
  }
}

module.exports = billData
