// src/models/stOrderModel.js

const { poolPromise } = require('../config/db')

const orderData = {
  getAllOrdersData: async (filterIn) => {
    try {
      const pool = await poolPromise

      const sDate = (filterIn.SALE_DATE_S || '').toString()
      const eDate = (filterIn.SALE_DATE_E || '').toString()
      const shopIds = (filterIn.SHOP_ID || '').toString()
      const exportStates = Array.isArray(filterIn.EXPORT_STATE)
        ? filterIn.EXPORT_STATE.join(',')
        : (filterIn.EXPORT_STATE || '').toString()

      const result = await pool.request()
        .input('S_DATE_STR', sDate)
        .input('E_DATE_STR', eDate)
        .input('SHOP_IDS_STR', shopIds)
        .input('EXPORT_STATE_STR', exportStates)
        .query(`
          DECLARE @SALE_DATE_S_STR NVARCHAR(10) = @S_DATE_STR
          DECLARE @SALE_DATE_E_STR NVARCHAR(10) = @E_DATE_STR
          DECLARE @SHOP_ID_STR     NVARCHAR(MAX) = @SHOP_IDS_STR
          DECLARE @STATE_STR       NVARCHAR(MAX) = @EXPORT_STATE_STR

          DECLARE @SALE_DATE_S DATETIME
          DECLARE @SALE_DATE_E DATETIME

          SET @SALE_DATE_S = CASE WHEN ISDATE(@SALE_DATE_S_STR) = 1 THEN CAST(@SALE_DATE_S_STR AS DATE) ELSE CAST(DATEADD(DAY, -7, GETDATE()) AS DATE) END
          SET @SALE_DATE_E = CASE WHEN ISDATE(@SALE_DATE_E_STR) = 1 THEN CAST(@SALE_DATE_E_STR AS DATE) ELSE CAST(GETDATE() AS DATE) END

          DECLARE @ShopXml XML, @StateXml XML
          IF ISNULL(@SHOP_ID_STR, '') <> '' SET @ShopXml = CAST('<root><v>' + REPLACE(@SHOP_ID_STR, ',', '</v><v>') + '</v></root>' AS XML)
          IF ISNULL(@STATE_STR, '')   <> '' SET @StateXml = CAST('<root><v>' + REPLACE(@STATE_STR, ',', '</v><v>') + '</v></root>' AS XML)

          SELECT 
              O.SHOP_ID,
              O.ORDER_ID,
              CONVERT(VARCHAR(16), O.EXPECT_DATE, 120) AS EXPECT_DATE,
              CONVERT(VARCHAR(16), O.APP_DATE, 120) AS APP_DATE,
              E.EMP_NAME AS [USER],
              O.OUT_SHOP,
              O.EXPORT_ID,
              O.EXPORTED,
              O.MEMO,
              O.STK_ID,
              (SELECT COUNT(*) FROM ORDER01 D WHERE D.ORDER_ID = O.ORDER_ID) AS detail_count
          FROM ORDER00 O
          LEFT JOIN EMPLOYEE E ON O.USER_ID = E.EMP_ID
          WHERE O.STATUS = '2'
            AND O.EXPORTED IN ('F', 'O')
            AND O.SHOP_ID NOT IN ('A', 'TEST01')
            AND (O.APP_DATE >= @SALE_DATE_S AND O.APP_DATE < DATEADD(DAY, 1, @SALE_DATE_E))
            AND (
                ISNULL(@SHOP_ID_STR, '') = '' 
                OR O.SHOP_ID IN (SELECT t.v.value('.', 'NVARCHAR(20)') FROM @ShopXml.nodes('/root/v') AS t(v))
            )
            AND (
                ISNULL(@STATE_STR, '') = '' 
                OR O.EXPORTED IN (SELECT t.v.value('.', 'NVARCHAR(20)') FROM @StateXml.nodes('/root/v') AS t(v))
            )
          ORDER BY 
              O.APP_DATE DESC,
              O.SHOP_ID ASC
        `)
      return result.recordset
    } catch (err) {
      console.error('補撥單查詢失敗：', err)
      throw err
    }
  },
  getOrderDetail: async (id) => {
    try {
      const pool = await poolPromise

      const orderId = (id || '').toString()
      if (!orderId) {
        throw new Error('ORDER_ID 為必填欄位')
      }

      const result = await pool.request()
        .input('ORDER_ID_VAL', orderId)
        .query(`
          DECLARE @TARGET_ID NVARCHAR(50) = @ORDER_ID_VAL

          SELECT 
              -- ORDER00 主檔欄位
              O.SHOP_ID,
              O.ORDER_ID,
              CONVERT(VARCHAR(16), O.INPUT_DATE, 120) AS INPUT_DATE,
              CONVERT(VARCHAR(16), O.APP_DATE, 120) AS APP_DATE,
              E.EMP_NAME AS [USER],
              O.OUT_SHOP,
              O.EXPORT_ID,
              O.EXPORTED,
              O.MEMO,
              O.STK_ID,
              (SELECT COUNT(*) FROM ORDER01 WHERE LTRIM(RTRIM(ORDER_ID)) = LTRIM(RTRIM(O.ORDER_ID))) AS detail_count,

              -- ORDER01 明細欄位
              D.ORDER_SNO,
              P.PROD_NAME2 AS PROD_NAME,
              DEP.DEP_NAME AS DEP,
              D.QUANTITY,
              U.UNIT_NAME AS UNIT,
              D.MEMO AS MEMO1
          FROM ORDER00 O
          LEFT JOIN ORDER01 D ON LTRIM(RTRIM(O.ORDER_ID)) = LTRIM(RTRIM(D.ORDER_ID))
          LEFT JOIN EMPLOYEE E ON LTRIM(RTRIM(O.USER_ID)) = LTRIM(RTRIM(E.EMP_ID))
          LEFT JOIN PRODUCT00 P ON LTRIM(RTRIM(D.PROD_ID)) = LTRIM(RTRIM(P.PROD_ID))
          LEFT JOIN DEPARTMENT DEP ON LTRIM(RTRIM(P.DEP_ID)) = LTRIM(RTRIM(DEP.DEP_ID))
          LEFT JOIN [UNIT] U ON LTRIM(RTRIM(D.STD_UNIT)) = LTRIM(RTRIM(U.UNIT_ID))
          WHERE LTRIM(RTRIM(O.ORDER_ID)) = LTRIM(RTRIM(@TARGET_ID))
          ORDER BY D.ORDER_SNO ASC
        `)

      const rows = result.recordset
      if (rows.length === 0) return null

      // 轉換資料結構：將明細嵌套進 PROD_DATA
      const orderDetail = {
        SHOP_ID: rows[0].SHOP_ID,
        ORDER_ID: rows[0].ORDER_ID,
        INPUT_DATE: rows[0].INPUT_DATE,
        APP_DATE: rows[0].APP_DATE,
        USER: rows[0].USER,
        OUT_SHOP: rows[0].OUT_SHOP,
        EXPORT_ID: rows[0].EXPORT_ID,
        EXPORTED: rows[0].EXPORTED,
        MEMO: rows[0].MEMO,
        STK_ID: rows[0].STK_ID,
        detail_count: rows[0].detail_count,
        PROD_DATA: rows
          .filter(row => row.ORDER_SNO !== null)
          .map(row => ({
            ORDER_SNO: row.ORDER_SNO,
            DEP: row.DEP,
            PROD_NAME: row.PROD_NAME,
            QUANTITY: row.QUANTITY,
            UNIT: row.UNIT,
            MEMO1: row.MEMO1
          }))
      }

      return orderDetail
    } catch (err) {
      console.error('訂單明細取得失敗：', err)
      throw err
    }
  },
  getOrderOutDetail: async (id) => {
    try {
      const pool = await poolPromise

      const outId = (id || '').toString()
      if (!outId) {
        throw new Error('OUT_ID 為必填欄位')
      }

      const result = await pool.request()
        .input('OUT_ID_VAL', outId)
        .query(`
          DECLARE @TARGET_ID NVARCHAR(50) = @OUT_ID_VAL

          SELECT 
              -- OUT00 主檔欄位
              O.SHOP_ID,
              O.OUT_ID,
              CONVERT(VARCHAR(16), O.INPUT_DATE, 120) AS INPUT_DATE,
              CONVERT(VARCHAR(16), O.APP_DATE, 120) AS APP_DATE,
              E1.EMP_NAME AS [USER],
              E2.EMP_NAME AS [APP_USER],
              O.TO_SHOP,
              O.EXPORT_ID, -- 確保 SQL 有抓
              O.EXPORTED,
              O.MEMO,
              (SELECT COUNT(*) FROM OUT01 WHERE LTRIM(RTRIM(OUT_ID)) = LTRIM(RTRIM(O.OUT_ID))) AS detail_count,

              -- OUT01 明細欄位
              D.OUT_SNO,
              P.PROD_NAME2 AS PROD_NAME,
              DEP.DEP_NAME AS DEP,
              D.QUANTITY,
              U.UNIT_NAME AS UNIT,
              D.MEMO AS MEMO1
          FROM OUT00 O
          LEFT JOIN OUT01 D ON LTRIM(RTRIM(O.OUT_ID)) = LTRIM(RTRIM(D.OUT_ID))
          LEFT JOIN EMPLOYEE E1 ON LTRIM(RTRIM(O.USER_ID)) = LTRIM(RTRIM(E1.EMP_ID))
          LEFT JOIN EMPLOYEE E2 ON LTRIM(RTRIM(O.APP_USER)) = LTRIM(RTRIM(E2.EMP_ID))
          LEFT JOIN PRODUCT00 P ON LTRIM(RTRIM(D.PROD_ID)) = LTRIM(RTRIM(P.PROD_ID))
          LEFT JOIN DEPARTMENT DEP ON LTRIM(RTRIM(P.DEP_ID)) = LTRIM(RTRIM(DEP.DEP_ID))
          LEFT JOIN [UNIT] U ON LTRIM(RTRIM(D.STD_UNIT)) = LTRIM(RTRIM(U.UNIT_ID))
          WHERE LTRIM(RTRIM(O.OUT_ID)) = LTRIM(RTRIM(@TARGET_ID))
          ORDER BY D.OUT_SNO ASC
        `)

      const rows = result.recordset
      if (rows.length === 0) return null

      // ✅ 修正後的物件轉換
      const outDetail = {
        SHOP_ID: rows[0].SHOP_ID,
        OUT_ID: rows[0].OUT_ID,
        INPUT_DATE: rows[0].INPUT_DATE,
        APP_DATE: rows[0].APP_DATE,
        USER: rows[0].USER,
        APP_USER: rows[0].APP_USER,
        TO_SHOP: rows[0].TO_SHOP,
        EXPORT_ID: rows[0].EXPORT_ID, // 👈 之前遺漏了這行，現在補上了
        EXPORTED: rows[0].EXPORTED,
        MEMO: rows[0].MEMO,
        detail_count: rows[0].detail_count,
        PROD_DATA: rows
          .filter(row => row.OUT_SNO !== null)
          .map(row => ({
            OUT_SNO: row.OUT_SNO,
            DEP: row.DEP,
            PROD_NAME: row.PROD_NAME,
            QUANTITY: row.QUANTITY,
            UNIT: row.UNIT,
            MEMO1: row.MEMO1
          }))
      }

      return outDetail
    } catch (err) {
      console.error('調撥單明細取得失敗：', err)
      throw err
    }
  }
}

module.exports = orderData
