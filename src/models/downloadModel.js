// src/models/downloadModel.js

const dayjs = require('dayjs')
const { poolPromise } = require('../config/db')

const downloadModel = {
  posSaleToERP: async (filterIn) => {
    try {
      const pool = await poolPromise
      const result = await pool.request()
        .query(`
          DECLARE @SALE_DATE_S_STR NVARCHAR(10) = '${filterIn.SALE_DATE_S}'; 
          DECLARE @SALE_DATE_E_STR NVARCHAR(10) = '${filterIn.SALE_DATE_E}'; 
          DECLARE @SHOP_ID_STR     NVARCHAR(MAX) = '${filterIn.SHOP_ID || ''}'; 
          DECLARE @TYPE_STR        NVARCHAR(MAX) = '${filterIn.TYPE || ''}'; 

          DECLARE @SALE_DATE_S DATETIME
          DECLARE @SALE_DATE_E DATETIME

          -- 處理日期預設與轉換
          SET @SALE_DATE_S = CASE WHEN ISDATE(@SALE_DATE_S_STR) = 1 THEN CAST(@SALE_DATE_S_STR AS DATE) ELSE CAST(GETDATE() AS DATE) END
          SET @SALE_DATE_E = CASE WHEN ISDATE(@SALE_DATE_E_STR) = 1 THEN CAST(@SALE_DATE_E_STR AS DATE) ELSE CAST(GETDATE() AS DATE) END

          -- 處理多選 XML
          DECLARE @ShopXml XML, @TypeXml XML
          IF ISNULL(@SHOP_ID_STR, '') <> '' SET @ShopXml = CAST('<root><v>' + REPLACE(@SHOP_ID_STR, ',', '</v><v>') + '</v></root>' AS XML)
          IF ISNULL(@TYPE_STR, '') <> ''    SET @TypeXml = CAST('<root><v>' + REPLACE(@TYPE_STR, ',', '</v><v>') + '</v></root>' AS XML)

          SELECT 
              CONVERT(VARCHAR(8), S1.order_time, 112) AS 訂貨日期,
              S1.SALE_SNO AS 序號,
              CONVERT(VARCHAR(8), S1.order_time, 112) AS 銷貨日期,
              CASE 
                  WHEN V.iccardno IS NOT NULL AND V.iccardno <> '' THEN V.iccardno 
                  ELSE S1.SHOP_ID
              END AS [客戶/供應商編碼],

              '' AS [客戶/供應商名稱],
              '' AS 承辦人,
              S1.SHOP_ID AS 發貨倉庫,
              CASE S2.PAY_ID
                  WHEN '1'    THEN '15'
                  WHEN '4'    THEN '16'
                  WHEN '5'    THEN '16'
                  WHEN 'H'    THEN '17'
                  WHEN 'OP13' THEN '18'
                  WHEN 'Z'    THEN '19'
                  WHEN 'Z1'   THEN '1A'
                  ELSE ISNULL(S2.PAY_ID, '')
              END AS 交易類型,

              '' AS 貨幣,
              '' AS 匯率,
              CASE WHEN S1.FREE_MEMO = '寄賣/借出' THEN '寄賣' ELSE '' END AS 查詢關鍵字,

              E.EMP_NAME AS 服務人員,
              CASE S0.TYPE
                  WHEN '0' THEN '銷貨單'
                  WHEN '1' THEN '銷退單'
                  WHEN '2' THEN '被銷退單'
                  ELSE S0.TYPE
              END AS 類型,

              S1.SALE_ID AS POS單號,
              COALESCE(
                  NULLIF(LTRIM(RTRIM(V.TELEPHONE)), ''), 
                  NULLIF(LTRIM(RTRIM(V.MOBILE)), ''), 
                  ''
              ) AS 貴賓電話,

              P.prod_shortname AS 品項編碼,
              '' AS 品項名稱,
              '' AS 規格,
              S1.TASTE_MEMO AS 加值,
              S1.SALE_PRICE AS 單價,
              S1.QTY AS 數量,
              S1.ITEM_DISC AS 折讓,
              '' AS 小計,
              S1.FREE_MEMO AS 招待備註,
              S1.invo_no AS 發票號碼,
              S0.buyer_number AS 載具,
              S0.MEMO AS 備註,
              S0.RETURNED_ID AS 原銷貨單號

          FROM SALE01 S1
          INNER JOIN SALE00 S0 ON S1.SHOP_ID = S0.SHOP_ID AND S1.SALE_ID = S0.SALE_ID
          LEFT JOIN VIP00 V ON S0.VIP_ID = V.VIP_ID
          OUTER APPLY (
              SELECT TOP 1 PAY_ID FROM SALE02 
              WHERE SHOP_ID = S1.SHOP_ID AND SALE_ID = S1.SALE_ID
          ) S2
          LEFT JOIN EMPLOYEE E ON S0.SALE_USER = E.EMP_ID
          LEFT JOIN PRODUCT00 P ON S1.PROD_ID = P.PROD_ID

          WHERE 
              S0.STATUS = '2'
              AND S1.order_time >= @SALE_DATE_S AND S1.order_time < DATEADD(DAY, 1, @SALE_DATE_E)
              AND (
                  ISNULL(@SHOP_ID_STR, '') = '' 
                  OR S1.SHOP_ID IN (SELECT t.v.value('.', 'NVARCHAR(20)') FROM @ShopXml.nodes('/root/v') AS t(v))
              )
              AND (
                  ISNULL(@TYPE_STR, '') = '' 
                  OR S0.TYPE IN (SELECT t.v.value('.', 'NVARCHAR(20)') FROM @TypeXml.nodes('/root/v') AS t(v))
              )

          ORDER BY 
              S1.order_time DESC, 
              S1.SALE_ID, 
              S1.SALE_SNO
              `)

      const saleData = result.recordset

      return saleData
    } catch (err) {
      console.error('資料取得失敗：', err)
      throw err
    }
  },

}

module.exports = downloadModel
