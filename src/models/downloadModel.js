// src/models/downloadModel.js

const dayjs = require('dayjs')
const { poolPromise } = require('../config/db')

const downloadModel = {
    posSaleToERP: async (filterIn) => {
        try {
            const pool = await poolPromise
            const result = await pool.request()
                .query(`
          DECLARE @SALE_DATE_S_STR NVARCHAR(10) = '${filterIn.SALE_DATE_S}' 
          DECLARE @SALE_DATE_E_STR NVARCHAR(10) = '${filterIn.SALE_DATE_E}' 
          DECLARE @SHOP_ID_STR     NVARCHAR(MAX) = '${filterIn.SHOP_ID || ""}' 
          DECLARE @TYPE_STR        NVARCHAR(MAX) = '${filterIn.TYPE || ""}' 

          DECLARE @SALE_DATE_S DATETIME
          DECLARE @SALE_DATE_E DATETIME

          SET @SALE_DATE_S = CASE WHEN ISDATE(@SALE_DATE_S_STR) = 1 THEN CAST(@SALE_DATE_S_STR AS DATE) ELSE CAST(GETDATE() AS DATE) END
          SET @SALE_DATE_E = CASE WHEN ISDATE(@SALE_DATE_E_STR) = 1 THEN CAST(@SALE_DATE_E_STR AS DATE) ELSE CAST(GETDATE() AS DATE) END

          DECLARE @ShopXml XML, @TypeXml XML
          IF ISNULL(@SHOP_ID_STR, '') <> '' SET @ShopXml = CAST('<root><v>' + REPLACE(@SHOP_ID_STR, ',', '</v><v>') + '</v></root>' AS XML)
          IF ISNULL(@TYPE_STR, '') <> ''    SET @TypeXml = CAST('<root><v>' + REPLACE(@TYPE_STR, ',', '</v><v>') + '</v></root>' AS XML)

          SELECT 
              CONVERT(VARCHAR(8), S1.order_time, 112) AS 訂貨日期,
              ROW_NUMBER() OVER (
                  PARTITION BY CONVERT(VARCHAR(8), S1.order_time, 112), 
                              (CASE WHEN V.iccardno IS NOT NULL AND V.iccardno <> '' THEN V.iccardno ELSE S1.SHOP_ID END)
                  ORDER BY S1.order_time DESC, S1.SALE_ID DESC, S1.SALE_SNO ASC
              ) AS 序號,
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
              (S1.SALE_PRICE * S1.QTY) + S1.ITEM_DISC AS 小計,
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
              銷貨日期 DESC,
              [客戶/供應商編碼] ASC,
              序號 ASC
              `)

            const saleData = result.recordset

            return saleData
        } catch (err) {
            console.error('資料取得失敗：', err)
            throw err
        }
    },
    posTransferToERP: async (filterIn) => {
        try {
            const pool = await poolPromise
            const result = await pool.request()
                .query(`
            DECLARE @SALE_DATE_S_STR NVARCHAR(10) = '${filterIn.SALE_DATE_S}' 
            DECLARE @SALE_DATE_E_STR NVARCHAR(10) = '${filterIn.SALE_DATE_E}' 
            DECLARE @SHOP_ID_STR     NVARCHAR(MAX) = '${filterIn.SHOP_ID || ""}' 
            DECLARE @TABLE_STR       NVARCHAR(MAX) = '${filterIn.TABLE || ""}' 

            DECLARE @SALE_DATE_S DATETIME
            DECLARE @SALE_DATE_E DATETIME

            SET @SALE_DATE_S = CASE WHEN ISDATE(@SALE_DATE_S_STR) = 1 THEN CAST(@SALE_DATE_S_STR AS DATE) ELSE CAST(GETDATE() AS DATE) END
            SET @SALE_DATE_E = CASE WHEN ISDATE(@SALE_DATE_E_STR) = 1 THEN CAST(@SALE_DATE_E_STR AS DATE) ELSE CAST(GETDATE() AS DATE) END

            DECLARE @ShopXml XML, @TableXml XML
            IF ISNULL(@SHOP_ID_STR, '') <> '' SET @ShopXml = CAST('<root><v>' + REPLACE(@SHOP_ID_STR, ',', '</v><v>') + '</v></root>' AS XML)
            IF ISNULL(@TABLE_STR, '')   <> '' SET @TableXml = CAST('<root><v>' + REPLACE(@TABLE_STR, ',', '</v><v>') + '</v></root>' AS XML)

            SELECT 
                日期, 
                ROW_NUMBER() OVER (
                    PARTITION BY 日期, 出貨倉庫, 收貨倉庫 
                    ORDER BY RAW_DATE DESC, 倉庫調撥單號 ASC
                ) AS 序號,
                承辦人, 出貨倉庫, 收貨倉庫, 專案, 借出客戶, 
                倉庫調撥單號, 品項編碼, 品項名稱, 規格, 數量, 服務人員, 摘要, 產生生產入庫
            FROM (
                SELECT 
                    CONVERT(VARCHAR(8), T10.INPUT_DATE, 112) AS 日期,
                    '' AS 承辦人,
                    'A' AS 出貨倉庫,
                    T10.STK_ID AS 收貨倉庫,
                    '' AS 專案,
                    '' AS 借出客戶,
                    T11.TAKEIN_ID AS 倉庫調撥單號,
                    P.prod_shortname AS 品項編碼,
                    '' AS 品項名稱,
                    '' AS 規格,
                    T11.QUANTITY AS 數量,
                    E.EMP_NAME AS 服務人員,
                    T10.MEMO AS 摘要,
                    '' AS 產生生產入庫,
                    'TAKEIN' AS TABLE_TYPE,
                    T10.STK_ID AS SHOP_ID,
                    T10.INPUT_DATE AS RAW_DATE
                FROM TAKEIN11 T11
                INNER JOIN TAKEIN10 T10 ON T11.TAKEIN_ID = T10.TAKEIN_ID
                LEFT JOIN PRODUCT00 P ON T11.PROD_ID = P.PROD_ID
                LEFT JOIN EMPLOYEE E ON T10.USER_ID = E.EMP_ID
                WHERE T10.STATUS = '2'

                UNION ALL

                SELECT 
                    CONVERT(VARCHAR(8), T00.INPUT_DATE, 112) AS 日期,
                    '' AS 承辦人,
                    T00.STK_ID AS 出貨倉庫,
                    'A' AS 收貨倉庫,
                    '' AS 專案,
                    '' AS 借出客戶,
                    T01.TAKEOUT_ID AS 倉庫調撥單號,
                    P.prod_shortname AS 品項編碼,
                    '' AS 品項名稱,
                    '' AS 規格,
                    T01.QUANTITY AS 數量,
                    E.EMP_NAME AS 服務人員,
                    T00.MEMO AS 摘要,
                    '' AS 產生生產入庫,
                    'TAKEOUT' AS TABLE_TYPE,
                    T00.STK_ID AS SHOP_ID,
                    T00.INPUT_DATE AS RAW_DATE
                FROM TAKEOUT01 T01
                INNER JOIN TAKEOUT00 T00 ON T01.TAKEOUT_ID = T00.TAKEOUT_ID
                LEFT JOIN PRODUCT00 P ON T01.PROD_ID = P.PROD_ID
                LEFT JOIN EMPLOYEE E ON T00.USER_ID = E.EMP_ID
                WHERE T00.STATUS = '2'

                UNION ALL

                SELECT 
                    CONVERT(VARCHAR(8), O00.INPUT_DATE, 112) AS 日期,
                    '' AS 承辦人,
                    O00.OUT_SHOP AS 出貨倉庫,
                    O00.TO_SHOP AS 收貨倉庫,
                    '' AS 專案,
                    '' AS 借出客戶,
                    O01.OUT_ID AS 倉庫調撥單號,
                    P.prod_shortname AS 品項編碼,
                    '' AS 品項名稱,
                    '' AS 規格,
                    O01.QUANTITY AS 數量,
                    E.EMP_NAME AS 服務人員,
                    O00.MEMO AS 摘要,
                    '' AS 產生生產入庫,
                    'OUT' AS TABLE_TYPE,
                    O00.OUT_SHOP AS SHOP_ID,
                    O00.INPUT_DATE AS RAW_DATE
                FROM OUT01 O01
                INNER JOIN OUT00 O00 ON O01.OUT_ID = O00.OUT_ID
                LEFT JOIN PRODUCT00 P ON O01.PROD_ID = P.PROD_ID
                LEFT JOIN EMPLOYEE E ON O00.USER_ID = E.EMP_ID
                WHERE O00.STATUS = '2'
                AND O00.TO_SHOP NOT IN ('A', 'TEST01')
                AND O00.OUT_SHOP NOT IN ('A', 'TEST01')
                AND ISNULL(O00.EXPORTED, '') <> 'F'
            ) AS CombinedData
            WHERE 
                (RAW_DATE >= @SALE_DATE_S AND RAW_DATE < DATEADD(DAY, 1, @SALE_DATE_E))
                AND (ISNULL(@SHOP_ID_STR, '') = '' OR SHOP_ID IN (SELECT t.v.value('.', 'NVARCHAR(20)') FROM @ShopXml.nodes('/root/v') AS t(v)))
                AND (ISNULL(@TABLE_STR, '')   = '' OR TABLE_TYPE IN (SELECT t.v.value('.', 'NVARCHAR(20)') FROM @TableXml.nodes('/root/v') AS t(v)))
            ORDER BY 
                日期 DESC, 
                出貨倉庫 ASC, 
                收貨倉庫 ASC, 
                序號 ASC
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
