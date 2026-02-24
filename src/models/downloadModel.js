// src/models/downloadModel.js

const dayjs = require('dayjs')
const { poolPromise } = require('../config/db')

const downloadModel = {
    posSaleToERP: async (filterIn) => {
        try {
            const pool = await poolPromise
            const result = await pool.request()
                .input('S_DATE', filterIn.SALE_DATE_S)
                .input('E_DATE', filterIn.SALE_DATE_E)
                .input('SHOP_IDS', filterIn.SHOP_ID || '')
                .input('TYPES', filterIn.TYPE || '')
                .query(`
          DECLARE @SALE_DATE_S DATETIME = CASE WHEN ISDATE(@S_DATE) = 1 THEN CAST(@S_DATE AS DATE) ELSE CAST(GETDATE() AS DATE) END
          DECLARE @SALE_DATE_E DATETIME = CASE WHEN ISDATE(@E_DATE) = 1 THEN CAST(@E_DATE AS DATE) ELSE CAST(GETDATE() AS DATE) END

          DECLARE @ShopXml XML, @TypeXml XML
          IF ISNULL(@SHOP_IDS, '') <> '' SET @ShopXml = CAST('<root><v>' + REPLACE(@SHOP_IDS, ',', '</v><v>') + '</v></root>' AS XML)
          IF ISNULL(@TYPES, '') <> ''    SET @TypeXml = CAST('<root><v>' + REPLACE(@TYPES, ',', '</v><v>') + '</v></root>' AS XML)

          SELECT 
            訂貨日期,
            ROW_NUMBER() OVER (
              PARTITION BY 訂貨日期, [客戶/供應商編碼], 發貨倉庫 
              ORDER BY POS單號 ASC, 原始序號 ASC
            ) AS 序號,
            銷貨日期, [客戶/供應商編碼], [客戶/供應商名稱], 承辦人, 發貨倉庫, 交易類型,
            貨幣, 匯率, 查詢關鍵字, 服務人員, 類型, POS單號, 貴賓電話, 品項編碼,
            品項名稱, 規格, 加值, 單價, 數量, 折讓, 小計, 招待備註, 發票號碼, 載具, 備註, 原銷貨單號
          FROM (
            SELECT 
              CONVERT(VARCHAR(8), S1.order_time, 112) AS 訂貨日期,
              CONVERT(VARCHAR(8), S1.order_time, 112) AS 銷貨日期,
              ISNULL(NULLIF(V.iccardno, ''), S1.SHOP_ID) AS [客戶/供應商編碼],
              '' AS [客戶/供應商名稱], '' AS 承辦人, S1.SHOP_ID AS 發貨倉庫,
              CASE S2.PAY_ID
                WHEN '1'    THEN '15' WHEN '4'    THEN '16' WHEN '5'    THEN '16'
                WHEN 'H'    THEN '17' WHEN 'OP13' THEN '18' WHEN 'Z'    THEN '19'
                WHEN 'Z1'   THEN '1A' ELSE ISNULL(S2.PAY_ID, '')
              END AS 交易類型,
              '' AS 貨幣, '' AS 匯率,
              CASE WHEN S1.FREE_MEMO = '寄賣/借出' THEN '寄賣' ELSE '' END AS 查詢關鍵字,
              E.EMP_NAME AS 服務人員,
              CASE S0.TYPE
                WHEN '0' THEN '銷貨單' WHEN '1' THEN '銷退單' WHEN '2' THEN '被銷退單' ELSE S0.TYPE
              END AS 類型,
              S1.SALE_ID AS POS單號, S1.SALE_SNO AS 原始序號,
              COALESCE(NULLIF(LTRIM(RTRIM(V.TELEPHONE)), ''), NULLIF(LTRIM(RTRIM(V.MOBILE)), ''), '') AS 貴賓電話,
              P.prod_shortname AS 品項編碼, '' AS 品項名稱, '' AS 規格, S1.TASTE_MEMO AS 加值,
              S1.SALE_PRICE AS 單價, S1.QTY AS 數量, S1.ITEM_DISC AS 折讓,
              (S1.SALE_PRICE * S1.QTY) + S1.ITEM_DISC AS 小計,
              S1.FREE_MEMO AS 招待備註, S1.invo_no AS 發票號碼, S0.buyer_number AS 載具,
              S0.MEMO AS 備註, S0.RETURNED_ID AS 原銷貨單號
            FROM SALE01 S1
            INNER JOIN SALE00 S0 ON S1.SHOP_ID = S0.SHOP_ID AND S1.SALE_ID = S0.SALE_ID
            LEFT JOIN VIP00 V ON S0.VIP_ID = V.VIP_ID
            OUTER APPLY (
              SELECT TOP 1 PAY_ID FROM SALE02 WHERE SHOP_ID = S1.SHOP_ID AND SALE_ID = S1.SALE_ID
            ) S2
            LEFT JOIN EMPLOYEE E ON S0.SALE_USER = E.EMP_ID
            LEFT JOIN PRODUCT00 P ON S1.PROD_ID = P.PROD_ID
            WHERE S0.STATUS = '2'
              AND S1.SHOP_ID NOT IN ('A', 'TEST01')
              AND S1.order_time >= @SALE_DATE_S AND S1.order_time < DATEADD(DAY, 1, @SALE_DATE_E)
              AND (ISNULL(@SHOP_IDS, '') = '' OR S1.SHOP_ID IN (SELECT t.v.value('.', 'NVARCHAR(20)') FROM @ShopXml.nodes('/root/v') AS t(v)))
              AND (ISNULL(@TYPES, '') = '' OR S0.TYPE IN (SELECT t.v.value('.', 'NVARCHAR(20)') FROM @TypeXml.nodes('/root/v') AS t(v)))
          ) AS BaseData
          ORDER BY 訂貨日期 DESC, [客戶/供應商編碼] ASC, 發貨倉庫 ASC, 序號 ASC
        `)
            return result.recordset
        } catch (err) {
            console.error('資料取得失敗：', err)
            throw err
        }
    },

    posTransferToERP: async (filterIn) => {
        try {
            const pool = await poolPromise
            const result = await pool.request()
                .input('S_DATE', filterIn.SALE_DATE_S)
                .input('E_DATE', filterIn.SALE_DATE_E)
                .input('SHOP_IDS', filterIn.SHOP_ID || '')
                .input('TABLES', filterIn.TABLE || '')
                .query(`
          DECLARE @SALE_DATE_S DATETIME = CASE WHEN ISDATE(@S_DATE) = 1 THEN CAST(@S_DATE AS DATE) ELSE CAST(GETDATE() AS DATE) END
          DECLARE @SALE_DATE_E DATETIME = CASE WHEN ISDATE(@E_DATE) = 1 THEN CAST(@E_DATE AS DATE) ELSE CAST(GETDATE() AS DATE) END

          DECLARE @ShopXml XML, @TableXml XML
          IF ISNULL(@SHOP_IDS, '') <> '' SET @ShopXml = CAST('<root><v>' + REPLACE(@SHOP_IDS, ',', '</v><v>') + '</v></root>' AS XML)
          IF ISNULL(@TABLES, '')   <> '' SET @TableXml = CAST('<root><v>' + REPLACE(@TABLES, ',', '</v><v>') + '</v></root>' AS XML)

          SELECT 
            日期, 
            ROW_NUMBER() OVER (
              PARTITION BY 日期, 出貨倉庫, 收貨倉庫 
              ORDER BY RAW_DATE DESC, 倉庫調撥單號 ASC
            ) AS 序號,
            承辦人, 出貨倉庫, 收貨倉庫, 專案, 借出客戶, 
            倉庫調撥單號, 品項編碼, 品項名稱, 規格, 數量, 服務人員, 摘要, 產生生產入庫
          FROM (
            -- A. TAKEIN
            SELECT 
              CONVERT(VARCHAR(8), T10.INPUT_DATE, 112) AS 日期, '' AS 承辦人, 'A' AS 出貨倉庫, T10.STK_ID AS 收貨倉庫,
              '' AS 專案, '' AS 借出客戶, T11.TAKEIN_ID AS 倉庫調撥單號, P.prod_shortname AS 品項編碼,
              '' AS 品項名稱, '' AS 規格, T11.QUANTITY AS 數量, E.EMP_NAME AS 服務人員, T10.MEMO AS 摘要,
              '' AS 產生生產入庫, 'TAKEIN' AS TABLE_TYPE, T10.STK_ID AS SHOP_ID, T10.INPUT_DATE AS RAW_DATE
            FROM TAKEIN11 T11
            INNER JOIN TAKEIN10 T10 ON T11.TAKEIN_ID = T10.TAKEIN_ID
            LEFT JOIN PRODUCT00 P ON T11.PROD_ID = P.PROD_ID
            LEFT JOIN EMPLOYEE E ON T10.USER_ID = E.EMP_ID
            WHERE T10.STATUS = '2' AND T10.STK_ID NOT IN ('A', 'TEST01')

            UNION ALL
            -- B. TAKEOUT
            SELECT 
              CONVERT(VARCHAR(8), T00.INPUT_DATE, 112) AS 日期, '' AS 承辦人, T00.STK_ID AS 出貨倉庫, 'A' AS 收貨倉庫,
              '' AS 專案, '' AS 借出客戶, T01.TAKEOUT_ID AS 倉庫調撥單號, P.prod_shortname AS 品項編碼,
              '' AS 品項名稱, '' AS 規格, T01.QUANTITY AS 數量, E.EMP_NAME AS 服務人員, T00.MEMO AS 摘要,
              '' AS 產生生產入庫, 'TAKEOUT' AS TABLE_TYPE, T00.STK_ID AS SHOP_ID, T00.INPUT_DATE AS RAW_DATE
            FROM TAKEOUT01 T01
            INNER JOIN TAKEOUT00 T00 ON T01.TAKEOUT_ID = T00.TAKEOUT_ID
            LEFT JOIN PRODUCT00 P ON T01.PROD_ID = P.PROD_ID
            LEFT JOIN EMPLOYEE E ON T00.USER_ID = E.EMP_ID
            WHERE T00.STATUS = '2' AND T00.STK_ID NOT IN ('A', 'TEST01')

            UNION ALL
            -- C. OUT
            SELECT 
              CONVERT(VARCHAR(8), O00.INPUT_DATE, 112) AS 日期, '' AS 承辦人, O00.OUT_SHOP AS 出貨倉庫, O00.TO_SHOP AS 收貨倉庫,
              '' AS 專案, '' AS 借出客戶, O01.OUT_ID AS 倉庫調撥單號, P.prod_shortname AS 品項編碼,
              '' AS 品項名稱, '' AS 規格, O01.QUANTITY AS 數量, E.EMP_NAME AS 服務人員, O00.MEMO AS 摘要,
              '' AS 產生生產入庫, 'OUT' AS TABLE_TYPE, O00.OUT_SHOP AS SHOP_ID, O00.INPUT_DATE AS RAW_DATE
            FROM OUT01 O01
            INNER JOIN OUT00 O00 ON O01.OUT_ID = O00.OUT_ID
            LEFT JOIN PRODUCT00 P ON O01.PROD_ID = P.PROD_ID
            LEFT JOIN EMPLOYEE E ON O00.USER_ID = E.EMP_ID
            WHERE O00.STATUS = '2' AND O00.OUT_SHOP NOT IN ('A', 'TEST01') 
              AND O00.TO_SHOP NOT IN ('A', 'TEST01') AND ISNULL(O00.EXPORTED, '') <> 'F'
          ) AS CombinedData
          WHERE (RAW_DATE >= @SALE_DATE_S AND RAW_DATE < DATEADD(DAY, 1, @SALE_DATE_E))
            AND (ISNULL(@SHOP_IDS, '') = '' OR SHOP_ID IN (SELECT t.v.value('.', 'NVARCHAR(20)') FROM @ShopXml.nodes('/root/v') AS t(v)))
            AND (ISNULL(@TABLES, '')   = '' OR TABLE_TYPE IN (SELECT t.v.value('.', 'NVARCHAR(20)') FROM @TableXml.nodes('/root/v') AS t(v)))
          ORDER BY 日期 DESC, 出貨倉庫 ASC, 收貨倉庫 ASC, 序號 ASC
        `)
            return result.recordset
        } catch (err) {
            console.error('資料取得失敗：', err)
            throw err
        }
    },
    posNoTransferToERP: async (filterIn) => {
        try {
            const pool = await poolPromise
            const result = await pool.request()
                .input('S_DATE_STR', filterIn.SALE_DATE_S)
                .input('E_DATE_STR', filterIn.SALE_DATE_E)
                .input('SHOP_IDS_STR', filterIn.SHOP_ID || '')
                .query(`
          /* 1. 宣告與接收傳入參數 */
          DECLARE @SALE_DATE_S_STR NVARCHAR(10) = @S_DATE_STR
          DECLARE @SALE_DATE_E_STR NVARCHAR(10) = @E_DATE_STR
          DECLARE @SHOP_ID_STR     NVARCHAR(MAX) = @SHOP_IDS_STR

          DECLARE @SALE_DATE_S DATETIME
          DECLARE @SALE_DATE_E DATETIME

          /* 2. 日期格式轉換與防錯 */
          SET @SALE_DATE_S = CASE WHEN ISDATE(@SALE_DATE_S_STR) = 1 THEN CAST(@SALE_DATE_S_STR AS DATE) ELSE CAST(GETDATE() AS DATE) END
          SET @SALE_DATE_E = CASE WHEN ISDATE(@SALE_DATE_E_STR) = 1 THEN CAST(@SALE_DATE_E_STR AS DATE) ELSE CAST(GETDATE() AS DATE) END

          /* 3. 處理門市多選過濾 (XML 解析) */
          DECLARE @ShopXml XML
          IF ISNULL(@SHOP_ID_STR, '') <> '' SET @ShopXml = CAST('<root><v>' + REPLACE(@SHOP_ID_STR, ',', '</v><v>') + '</v></root>' AS XML)

          /* 4. 主查詢開始 */
          SELECT 
              單據日期,
              建立門市,
              單據類型,
              單號,
              調出門市,
              調入門市,
              問題類型,
              問題描述,
              匯入類型,
              匯入單號
          FROM (
              -- 1. 調出單 (OUT00)
              SELECT 
                  CONVERT(VARCHAR(19), O.INPUT_DATE, 120) AS 單據日期,
                  O.SHOP_ID AS 建立門市,
                  '調出單' AS 單據類型,
                  O.OUT_ID AS 單號,
                  O.OUT_SHOP AS 調出門市,
                  O.TO_SHOP AS 調入門市,
                  CASE 
                      WHEN O.SHOP_ID = 'A' THEN '02001'
                      WHEN O.SHOP_ID = 'TEST01' THEN '02002'
                      WHEN O.STATUS <> '2' THEN '01003'
                      WHEN O.TO_SHOP IN ('A', 'TEST01') THEN '01001'
                      WHEN O.EXPORTED = 'F' THEN '01002'
                      ELSE ''
                  END AS 問題類型,
                  CASE 
                      WHEN O.SHOP_ID = 'A' THEN 'key單門市為總部、不納入表內'
                      WHEN O.SHOP_ID = 'TEST01' THEN 'key單門市為測試店、不納入表內'
                      WHEN O.STATUS <> '2' THEN '單據不是「核准」狀態'
                      WHEN O.TO_SHOP IN ('A', 'TEST01') THEN '調入門市不可為 ''A'' 或 ''TEST01'''
                      WHEN O.EXPORTED = 'F' THEN '匯入門市，未使用[匯入]功能進行調撥入庫'
                      ELSE ''
                  END AS 問題描述,
                  CASE WHEN O.EXPORT_ID IS NOT NULL AND O.EXPORT_ID <> '' THEN '調入單' ELSE '' END AS 匯入類型,
                  ISNULL(O.EXPORT_ID, '') AS 匯入單號,
                  O.INPUT_DATE AS RAW_DATE,
                  O.SHOP_ID -- 用於外層 WHERE 門市多選過濾
              FROM OUT00 O
              WHERE (O.INPUT_DATE >= @SALE_DATE_S AND O.INPUT_DATE < DATEADD(DAY, 1, @SALE_DATE_E))
                AND (
                    O.SHOP_ID IN ('A', 'TEST01') OR O.STATUS <> '2' 
                    OR O.TO_SHOP IN ('A', 'TEST01') OR O.EXPORTED = 'F'
                )

              UNION ALL

              -- 2. 調入單 (IN00)
              SELECT 
                  CONVERT(VARCHAR(19), I.INPUT_DATE, 120) AS 單據日期,
                  I.SHOP_ID AS 建立門市,
                  '調入單' AS 單據類型,
                  I.IN_ID AS 單號,
                  I.OUT_SHOP AS 調出門市,
                  I.IN_SHOP AS 調入門市,
                  CASE 
                      WHEN I.SHOP_ID = 'A' THEN '02001'
                      WHEN I.SHOP_ID = 'TEST01' THEN '02002'
                      WHEN I.STATUS <> '2' THEN '01003'
                      WHEN I.OUT_SHOP IN ('A', 'TEST01') THEN '01001'
                      WHEN O_MAP.OUT_ID IS NULL THEN '01002'
                      ELSE ''
                  END AS 問題類型,
                  CASE 
                      WHEN I.SHOP_ID = 'A' THEN 'key單門市為總部、不納入表內'
                      WHEN I.SHOP_ID = 'TEST01' THEN 'key單門市為測試店、不納入表內'
                      WHEN I.STATUS <> '2' THEN '單據不是「核准」狀態'
                      WHEN I.OUT_SHOP IN ('A', 'TEST01') THEN '調出門市不可為 ''A'' 或 ''TEST01'''
                      WHEN O_MAP.OUT_ID IS NULL THEN '未使用[匯入]功能進行調撥入庫'
                      ELSE ''
                  END AS 問題描述,
                  CASE WHEN O_MAP.OUT_ID IS NOT NULL THEN '調出單' ELSE '' END AS 匯入類型,
                  ISNULL(O_MAP.OUT_ID, '') AS 匯入單號,
                  I.INPUT_DATE AS RAW_DATE,
                  I.SHOP_ID -- 用於外層 WHERE 門市多選過濾
              FROM IN00 I
              LEFT JOIN OUT00 O_MAP ON I.IN_ID = O_MAP.EXPORT_ID
              WHERE (I.INPUT_DATE >= @SALE_DATE_S AND I.INPUT_DATE < DATEADD(DAY, 1, @SALE_DATE_E))
                AND (
                    I.SHOP_ID IN ('A', 'TEST01') OR I.STATUS <> '2' 
                    OR I.OUT_SHOP IN ('A', 'TEST01') OR O_MAP.OUT_ID IS NULL
                )
          ) AS ResultTable
          WHERE 
              (ISNULL(@SHOP_ID_STR, '') = '' OR SHOP_ID IN (SELECT t.v.value('.', 'NVARCHAR(20)') FROM @ShopXml.nodes('/root/v') AS t(v)))
          ORDER BY 
              RAW_DATE DESC,
              單據類型 ASC,
              調出門市 ASC,
              調入門市 ASC,
              單號 ASC
        `)
            return result.recordset
        } catch (err) {
            console.error('資料取得失敗：', err)
            throw err
        }
    }
}

module.exports = downloadModel
