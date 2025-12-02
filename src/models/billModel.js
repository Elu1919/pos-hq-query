// src/models/billModel.js

const dayjs = require('dayjs')
const { poolPromise } = require('../config/db')

const billData = {
  getAllBillData: async (filter) => {
    try {
      const pool = await poolPromise
      const result = await pool.request()
        .query(`
          DECLARE @BillMonthStart NVARCHAR(6) = '${filter.BillMonthStart}'
          DECLARE @BillMonthEnd   NVARCHAR(6) = '${filter.BillMonthEnd ? filter.BillMonthEnd : filter.BillMonthStart}'
          DECLARE @VipName   NVARCHAR(50) = '${filter.VIP_NAME}'
          DECLARE @VipId     NVARCHAR(20) = '${filter.VIP_ID}'
          DECLARE @ShopId    NVARCHAR(10) = '${filter.SHOP_ID}'

          SELECT
              SB0.STR_BAL_ID,
              SB0.STATUS,
              SB0.SHOP_ID,
              SHOP2.SHOP_NAME,
              SHOP2.TEL,
              SB0.TOTAL,
              SB0.PAID,
              ISNULL(SB0.TOTAL,0) - ISNULL(SB0.PAID,0) AS N_PAID,
              SB0.AMOUNT,
              SB0.DISCOUNT,
              SB0.DISCHARGE,
              SB0.MISCELL_COST,
              SB0.BILL_MONTH,
              SB0.BILL_ORDER,
              SB0.INPUT_DATE,

              (
                  SELECT
                      VIP.VIP_ID,
                      VIP.NAME,
                      VIP.TELEPHONE,
                      VIP.MOBILE,
                      VIP.VIP_CODE,
                      VIP.LINKMAN,
                      VIP.COMPANY,
                      VIP.COMPANY_ADDR
                  FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
              ) AS VIP,

              (
                  SELECT
                      S1.SHOP_ID,
                      S0.TYPE,
                      S1.SALE_ID,
                      S1.PROD_ID,
                      S1.SALE_PRICE,
                      S1.QTY,
                      S1.SALE_PRICE * S1.QTY AS SUBTOTAL,
                      S1.ITEM_DISC,
                      S1.FREE_MEMO,
                      S1.ORDER_TIME,
                      SHOP.SHOP_NAME,
                      PROD.PROD_NAME1,
                      UNIT.UNIT_NAME
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
          INNER JOIN VIP00 VIP   ON VIP.VIP_ID   = SB0.VIP_ID
          INNER JOIN SHOP00 SHOP2 ON SHOP2.SHOP_ID = SB0.SHOP_ID

          WHERE 
              SB0.STATUS = 2
              AND (
                  (@BillMonthStart = '' AND @BillMonthEnd = '')
                  OR (
                      SB0.BILL_MONTH >= ISNULL(@BillMonthStart, SB0.BILL_MONTH)
                      AND SB0.BILL_MONTH <= ISNULL(@BillMonthEnd,   SB0.BILL_MONTH)
                  )
              )
              AND (@VipName  = '' OR VIP.NAME LIKE '%' + @VipName + '%')
              AND (@VipId    = '' OR VIP.VIP_ID LIKE '%' + @VipId + '%')
              AND (@ShopId   = '' OR SB0.SHOP_ID = @ShopId)

          ORDER BY SB0.SHOP_ID
        `)

      const bills = result.recordset

      for (const bill of bills) {
        const d = bill.INPUT_DATE.toISOString().replace('Z', '');
        bill.INPUT_DATE = dayjs(d).format('YY-MM-DD');

        try { bill.VIP = JSON.parse(bill.VIP) } catch { }
        try { bill.SALE_LIST = JSON.parse(bill.SALE_LIST) } catch { }
      }

      return bills
    } catch (err) {
      console.error('資料取得失敗：', err)
      throw err
    }
  }
}

module.exports = billData
