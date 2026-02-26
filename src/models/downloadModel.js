// src/models/downloadModel.js

const dayjs = require('dayjs')
const { poolPromise } = require('../config/db')

const downloadModel = {
    posSaleToERP: async (filterIn) => {
        try {
            const pool = await poolPromise

            const sDate = (filterIn.SALE_DATE_S || '').toString()
            const eDate = (filterIn.SALE_DATE_E || '').toString()
            const shopIds = (filterIn.SHOP_ID || '').toString()
            const types = Array.isArray(filterIn.TYPE)
                ? filterIn.TYPE.join(',')
                : (filterIn.TYPE || '').toString()

            const result = await pool.request()
                // 修改 input 的名稱，避免與 SQL 內部的 DECLARE @TYPE_STR 衝突
                .input('S_DATE_VAL', sDate)
                .input('E_DATE_VAL', eDate)
                .input('SHOP_IDS_VAL', shopIds)
                .input('TYPE_VAL', types)
                .query(`
                        DECLARE @START_DATE NVARCHAR(10) = @S_DATE_VAL
                        DECLARE @END_DATE NVARCHAR(10) = @E_DATE_VAL
                        DECLARE @SHOP_IDS     NVARCHAR(MAX) = @SHOP_IDS_VAL
                        DECLARE @DOC_TYPES        NVARCHAR(MAX) = @TYPE_VAL

                        /* 1. 日期預設值處理 (當天) */
                        DECLARE @S_DATE DATETIME = CASE WHEN ISDATE(@START_DATE) = 1 THEN CAST(@START_DATE AS DATE) ELSE CAST(GETDATE() AS DATE) END
                        DECLARE @E_DATE DATETIME = CASE WHEN ISDATE(@END_DATE) = 1 THEN CAST(@END_DATE AS DATE) ELSE CAST(GETDATE() AS DATE) END

                        /* 2. 多選字串拆解處理 (XML 方式) */
                        DECLARE @ShopXml XML = CAST('<r><v>' + REPLACE(@SHOP_IDS, ',', '</v><v>') + '</v></r>' AS XML)
                        DECLARE @TypeXml XML = CAST('<r><v>' + REPLACE(@DOC_TYPES, ',', '</v><v>') + '</v></r>' AS XML)

                        /* 3. 主查詢邏輯 */
                        SELECT 
                            訂貨日期,
                            -- 序號編排：依照 訂貨日期、客戶編碼、發貨倉庫、交易類型 為單位分組
                            ROW_NUMBER() OVER (
                                PARTITION BY 訂貨日期, [客戶/供應商編碼], 發貨倉庫, 交易類型 
                                ORDER BY RAW_TIME ASC, POS單號 ASC, 原始序號 ASC
                            ) AS 序號,
                            銷貨日期,
                            [客戶/供應商編碼],
                            '' AS [客戶/供應商名稱],
                            '' AS 承辦人,
                            發貨倉庫,
                            交易類型,
                            '' AS 貨幣,
                            '' AS 匯率,
                            查詢關鍵字,
                            服務人員,
                            類型,
                            POS單號,
                            貴賓電話,
                            品項編碼,
                            '' AS [品項名稱],
                            '' AS 規格,
                            加值,
                            單價,
                            數量,
                            折讓,
                            小計,
                            招待備註,
                            發票號碼,
                            [載具/統編],
                            備註,
                            原銷貨單號
                        FROM (
                            SELECT 
                                CONVERT(VARCHAR(8), S1.order_time, 112) AS 訂貨日期,
                                CONVERT(VARCHAR(8), S1.order_time, 112) AS 銷貨日期,
                                
                                -- 客戶/供應商編碼：優先 iccardno，否則帶入 SHOP_ID
                                ISNULL(NULLIF(LTRIM(RTRIM(V.iccardno)), ''), S1.SHOP_ID) AS [客戶/供應商編碼],
                                
                                S1.SHOP_ID AS 發貨倉庫,
                                
                                -- 交易類型 ERP_PAY_ID 轉換
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
                                
                                -- 查詢關鍵字
                                CASE WHEN S1.FREE_MEMO = '寄賣/借出' THEN '寄賣' ELSE '' END AS 查詢關鍵字,
                                
                                E.EMP_NAME AS 服務人員,
                                
                                -- 類型中文轉換
                                CASE S0.TYPE
                                    WHEN '0' THEN '銷貨單'
                                    WHEN '1' THEN '銷退單'
                                    WHEN '2' THEN '被銷退單'
                                    ELSE S0.TYPE
                                END AS 類型,
                                
                                S1.SALE_ID AS POS單號,
                                S1.SALE_SNO AS 原始序號,
                                
                                -- 貴賓電話優先權：TELEPHONE > MOBILE
                                COALESCE(
                                    NULLIF(LTRIM(RTRIM(V.TELEPHONE)), ''), 
                                    NULLIF(LTRIM(RTRIM(V.MOBILE)), ''), 
                                    ''
                                ) AS 貴賓電話,
                                
                                P.prod_shortname AS 品項編碼,
                                S1.TASTE_MEMO AS 加值,
                                S1.SALE_PRICE AS 單價,
                                S1.QTY AS 數量,
                                S1.ITEM_DISC AS 折讓,
                                
                                -- 小計: 單價 * 數量 + 折讓
                                (S1.SALE_PRICE * S1.QTY) + S1.ITEM_DISC AS 小計,
                                
                                S1.FREE_MEMO AS 招待備註,
                                S1.invo_no AS 發票號碼,
                                
                                -- 載具/統編：載具優先，統編次之 (皆從 SALE00 取得)
                                ISNULL(NULLIF(LTRIM(RTRIM(S0.buyer_number)), ''), ISNULL(LTRIM(RTRIM(S0.CUST_CODE)), '')) AS [載具/統編],
                                
                                -- 備註合併處理 (換行或單行)
                                CASE 
                                    WHEN ISNULL(S0.MEMO,'') <> '' AND ISNULL(S0.spec_memo,'') <> '' 
                                        THEN LTRIM(RTRIM(S0.MEMO)) + CHAR(13) + CHAR(10) + LTRIM(RTRIM(S0.spec_memo))
                                    ELSE ISNULL(NULLIF(LTRIM(RTRIM(S0.MEMO)), ''), ISNULL(LTRIM(RTRIM(S0.spec_memo)), ''))
                                END AS 備註,
                                
                                S0.RETURNED_ID AS 原銷貨單號,
                                
                                -- 內部過濾與排序用
                                S1.order_time AS RAW_TIME,
                                S1.SHOP_ID AS RAW_SHOP,
                                S0.TYPE AS RAW_TYPE
                            FROM SALE01 S1
                            INNER JOIN SALE00 S0 ON S1.SHOP_ID = S0.SHOP_ID AND S1.SALE_ID = S0.SALE_ID
                            LEFT JOIN VIP00 V ON S0.VIP_ID = V.VIP_ID
                            OUTER APPLY (
                                SELECT TOP 1 PAY_ID FROM SALE02 
                                WHERE SHOP_ID = S1.SHOP_ID AND SALE_ID = S1.SALE_ID
                            ) S2
                            LEFT JOIN EMPLOYEE E ON S0.SALE_USER = E.EMP_ID
                            LEFT JOIN PRODUCT00 P ON S1.PROD_ID = P.PROD_ID
                            WHERE S0.STATUS = '2'
                            AND S1.SHOP_ID NOT IN ('A', 'TEST01')
                        ) AS BaseData
                        WHERE (RAW_TIME >= @S_DATE AND RAW_TIME < DATEADD(DAY, 1, @E_DATE))
                        AND (ISNULL(@SHOP_IDS, '') = '' OR RAW_SHOP IN (SELECT t.v.value('.', 'NVARCHAR(20)') FROM @ShopXml.nodes('/r/v') AS t(v)))
                        AND (ISNULL(@DOC_TYPES, '') = '' OR RAW_TYPE IN (SELECT t.v.value('.', 'NVARCHAR(20)') FROM @TypeXml.nodes('/r/v') AS t(v)))
                        ORDER BY 訂貨日期 DESC, [客戶/供應商編碼] ASC, 發貨倉庫 ASC, 交易類型 ASC, 序號 ASC
        `)
            return result.recordset
        } catch (err) {
            console.error('銷貨資料取得失敗：', err)
            throw err
        }
    },
    posTransferToERP: async (filterIn) => {
        try {
            const pool = await poolPromise

            const sDate = (filterIn.SALE_DATE_S || '').toString()
            const eDate = (filterIn.SALE_DATE_E || '').toString()
            const shopIds = (filterIn.SHOP_ID || '').toString()

            const tableIds = Array.isArray(filterIn.TABLE)
                ? filterIn.TABLE.join(',')
                : (filterIn.TABLE || '').toString()

            const result = await pool.request()
                .input('S_DATE_STR', sDate)
                .input('E_DATE_STR', eDate)
                .input('SHOP_IDS_STR', shopIds)
                .input('TABLE_STR', tableIds)
                .query(`
          DECLARE @SALE_DATE_S_STR NVARCHAR(10) = @S_DATE_STR
          DECLARE @SALE_DATE_E_STR NVARCHAR(10) = @E_DATE_STR
          DECLARE @SHOP_ID_STR     NVARCHAR(MAX) = @SHOP_IDS_STR
          DECLARE @TABLE_IDS_STR   NVARCHAR(MAX) = @TABLE_STR

          DECLARE @SALE_DATE_S DATETIME
          DECLARE @SALE_DATE_E DATETIME

          SET @SALE_DATE_S = CASE WHEN ISDATE(@SALE_DATE_S_STR) = 1 THEN CAST(@SALE_DATE_S_STR AS DATE) ELSE CAST(GETDATE() AS DATE) END
          SET @SALE_DATE_E = CASE WHEN ISDATE(@SALE_DATE_E_STR) = 1 THEN CAST(@SALE_DATE_E_STR AS DATE) ELSE CAST(GETDATE() AS DATE) END

          DECLARE @ShopXml XML, @TableXml XML
          IF ISNULL(@SHOP_ID_STR, '')   <> '' SET @ShopXml = CAST('<root><v>' + REPLACE(@SHOP_ID_STR, ',', '</v><v>') + '</v></root>' AS XML)
          IF ISNULL(@TABLE_IDS_STR, '') <> '' SET @TableXml = CAST('<root><v>' + REPLACE(@TABLE_IDS_STR, ',', '</v><v>') + '</v></root>' AS XML)

          SELECT 
              日期, 
              ROW_NUMBER() OVER (
                  PARTITION BY 日期, 出貨倉庫, 收貨倉庫, POS單據類型
                  ORDER BY RAW_DATE DESC, POS單號 ASC, 原始序號 ASC
              ) AS 序號,
              承辦人, 出貨倉庫, 收貨倉庫, 專案, 借出客戶, 倉庫調撥單號, 
              POS單據類型, POS單號, 品項編碼, 品項名稱, 規格, 數量, 服務人員, 備註, 產生生產入庫
          FROM (
              -- 1. 供應商進貨 (TAKEIN)
              SELECT 
                  CONVERT(VARCHAR(8), T10.INPUT_DATE, 112) AS 日期, '' AS 承辦人, 'A' AS 出貨倉庫, T10.STK_ID AS 收貨倉庫,
                  '' AS 專案, '' AS 借出客戶, '' AS 倉庫調撥單號, '供應商進貨' AS POS單據類型, T11.TAKEIN_ID AS POS單號,
                  P.prod_shortname AS 品項編碼, '' AS 品項名稱, '' AS 規格, T11.QUANTITY AS 數量, E.EMP_NAME AS 服務人員,
                  T10.MEMO AS 備註, '' AS 產生生產入庫, 'TAKEIN' AS TABLE_TYPE, T10.STK_ID AS SHOP_ID, 
                  T10.INPUT_DATE AS RAW_DATE, T11.TAKEIN_SN AS 原始序號
              FROM TAKEIN11 T11
              INNER JOIN TAKEIN10 T10 ON T11.TAKEIN_ID = T10.TAKEIN_ID
              LEFT JOIN PRODUCT00 P ON T11.PROD_ID = P.PROD_ID
              LEFT JOIN EMPLOYEE E ON T10.USER_ID = E.EMP_ID
              WHERE T10.STATUS = '2' AND T10.SHOP_ID NOT IN ('A', 'TEST01')

              UNION ALL

              -- 2. 供應商退貨 (TAKEOUT)
              SELECT 
                  CONVERT(VARCHAR(8), T00.INPUT_DATE, 112) AS 日期, '' AS 承辦人, T00.STK_ID AS 出貨倉庫, 'A' AS 收貨倉庫,
                  '' AS 專案, '' AS 借出客戶, '' AS 倉庫調撥單號, '供應商退貨' AS POS單據類型, T01.TAKEOUT_ID AS POS單號,
                  P.prod_shortname AS 品項編碼, '' AS 品項名稱, '' AS 規格, T01.QUANTITY AS 數量, E.EMP_NAME AS 服務人員,
                  T00.MEMO AS 備註, '' AS 產生生產入庫, 'TAKEOUT' AS TABLE_TYPE, T00.SHOP_ID AS SHOP_ID, 
                  T00.INPUT_DATE AS RAW_DATE, T01.TAKEOUT_SNO AS 原始序號
              FROM TAKEOUT01 T01
              INNER JOIN TAKEOUT00 T00 ON T01.TAKEOUT_ID = T00.TAKEOUT_ID
              LEFT JOIN PRODUCT00 P ON T01.PROD_ID = P.PROD_ID
              LEFT JOIN EMPLOYEE E ON T00.USER_ID = E.EMP_ID
              WHERE T00.STATUS = '2' AND T00.SHOP_ID NOT IN ('A', 'TEST01')

              UNION ALL

              -- 3. 調撥出庫 (OUT)
              SELECT 
                  CONVERT(VARCHAR(8), O00.INPUT_DATE, 112) AS 日期, '' AS 承辦人, O00.OUT_SHOP AS 出貨倉庫, O00.TO_SHOP AS 收貨倉庫,
                  '' AS 專案, '' AS 借出客戶, '' AS 倉庫調撥單號, '調撥' AS POS單據類型, O01.OUT_ID AS POS單號,
                  P.prod_shortname AS 品項編碼, '' AS 品項名稱, '' AS 規格, O01.QUANTITY AS 數量, E.EMP_NAME AS 服務人員,
                  O00.MEMO AS 備註, '' AS 產生生產入庫, 'OUT' AS TABLE_TYPE, O00.SHOP_ID AS SHOP_ID, 
                  O00.INPUT_DATE AS RAW_DATE, O01.OUT_SNO AS 原始序號
              FROM OUT01 O01
              INNER JOIN OUT00 O00 ON O01.OUT_ID = O00.OUT_ID
              LEFT JOIN PRODUCT00 P ON O01.PROD_ID = P.PROD_ID
              LEFT JOIN EMPLOYEE E ON O00.USER_ID = E.EMP_ID
              WHERE O00.STATUS = '2' 
                AND O00.SHOP_ID NOT IN ('A', 'TEST01')
                AND O00.OUT_TYPE = '0' 
                AND O00.EXPORTED = 'T'
                AND O00.TO_SHOP NOT IN ('A', 'TEST01')
                AND O00.OUT_SHOP NOT IN ('A', 'TEST01')

              UNION ALL

              -- 4. 調撥入庫 (IN)
              SELECT 
                  CONVERT(VARCHAR(8), I00.INPUT_DATE, 112) AS 日期, '' AS 承辦人, 'A' AS 出貨倉庫, I00.IN_SHOP AS 收貨倉庫,
                  '' AS 專案, '' AS 借出客戶, '' AS 倉庫調撥單號, '總部進貨' AS POS單據類型, I00.IN_ID AS POS單號,
                  P.prod_shortname AS 品項編碼, '' AS 品項名稱, '' AS 規格, I01.QUANTITY AS 數量, E.EMP_NAME AS 服務人員,
                  I00.MEMO AS 備註, '' AS 產生生產入庫, 'IN' AS TABLE_TYPE, I00.SHOP_ID AS SHOP_ID, 
                  I00.INPUT_DATE AS RAW_DATE, I01.IN_SNO AS 原始序號
              FROM IN01 I01
              INNER JOIN IN00 I00 ON I01.IN_ID = I00.IN_ID
              LEFT JOIN PRODUCT00 P ON I01.PROD_ID = P.PROD_ID
              LEFT JOIN EMPLOYEE E ON I00.USER_ID = E.EMP_ID
              WHERE I00.STATUS = '2' 
                AND I00.SHOP_ID NOT IN ('A', 'TEST01')
                AND I00.IN_TYPE = '1'

              UNION ALL

              -- 5. 退回倉庫 (SEND_BACK)
              SELECT 
                  CONVERT(VARCHAR(8), SB0.INPUT_DATE, 112) AS 日期, '' AS 承辦人, SB0.STK_ID AS 出貨倉庫, SB0.STK_ID AS 收貨倉庫,
                  '' AS 專案, '' AS 借出客戶, '' AS 倉庫調撥單號, '總部退貨' AS POS單據類型, SB0.SEND_BACK_ID AS POS單號,
                  P.prod_shortname AS 品項編碼, '' AS 品項名稱, '' AS 規格, SB1.QUANTITY AS 數量, E.EMP_NAME AS 服務人員,
                  SB0.MEMO AS 備註, '' AS 產生生產入庫, 'SEND_BACK' AS TABLE_TYPE, SB0.SHOP_ID AS SHOP_ID, 
                  SB0.INPUT_DATE AS RAW_DATE, SB1.SEND_BACK_SNO AS 原始序號
              FROM SEND_BACK01 SB1
              INNER JOIN SEND_BACK00 SB0 ON SB1.SEND_BACK_ID = SB0.SEND_BACK_ID
              LEFT JOIN PRODUCT00 P ON SB1.PROD_ID = P.PROD_ID
              LEFT JOIN EMPLOYEE E ON SB0.USER_ID = E.EMP_ID
              WHERE SB0.STATUS = '2' AND SB0.SHOP_ID NOT IN ('A', 'TEST01')
          ) AS CombinedData
          WHERE (RAW_DATE >= @SALE_DATE_S AND RAW_DATE < DATEADD(DAY, 1, @SALE_DATE_E))
            AND (ISNULL(@SHOP_ID_STR, '') = '' OR SHOP_ID IN (SELECT t.v.value('.', 'NVARCHAR(20)') FROM @ShopXml.nodes('/root/v') AS t(v)))
            AND (ISNULL(@TABLE_IDS_STR, '') = '' OR TABLE_TYPE IN (SELECT t.v.value('.', 'NVARCHAR(20)') FROM @TableXml.nodes('/root/v') AS t(v)))
          ORDER BY 日期 DESC, 出貨倉庫 ASC, 收貨倉庫 ASC, 序號 ASC
        `)
            return result.recordset
        } catch (err) {
            console.error('調撥資料取得失敗：', err)
            throw err
        }
    },
    posNoTransferToERP: async (filterIn) => {
        try {
            const pool = await poolPromise

            const sDate = (filterIn.SALE_DATE_S || '').toString()
            const eDate = (filterIn.SALE_DATE_E || '').toString()
            const shopIds = (filterIn.SHOP_ID || '').toString()

            const result = await pool.request()
                .input('S_DATE_STR', sDate)
                .input('E_DATE_STR', eDate)
                .input('SHOP_IDS_STR', shopIds)
                .query(`
          DECLARE @SALE_DATE_S_STR NVARCHAR(10) = @S_DATE_STR
          DECLARE @SALE_DATE_E_STR NVARCHAR(10) = @E_DATE_STR
          DECLARE @SHOP_ID_STR     NVARCHAR(MAX) = @SHOP_IDS_STR

          DECLARE @SALE_DATE_S DATETIME
          DECLARE @SALE_DATE_E DATETIME

          SET @SALE_DATE_S = CASE WHEN ISDATE(@SALE_DATE_S_STR) = 1 THEN CAST(@SALE_DATE_S_STR AS DATE) ELSE CAST(GETDATE() AS DATE) END
          SET @SALE_DATE_E = CASE WHEN ISDATE(@SALE_DATE_E_STR) = 1 THEN CAST(@SALE_DATE_E_STR AS DATE) ELSE CAST(GETDATE() AS DATE) END

          DECLARE @ShopXml XML
          IF ISNULL(@SHOP_ID_STR, '') <> '' SET @ShopXml = CAST('<root><v>' + REPLACE(@SHOP_ID_STR, ',', '</v><v>') + '</v></root>' AS XML)

          SELECT 
              單據日期, 建立門市, 單據類型, 單號, 調出門市, 
              調入門市, 問題類型, 問題描述, 匯入類型, 匯入單號
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
                      WHEN O.SHOP_ID = 'A' THEN '9901'
                      WHEN O.SHOP_ID = 'TEST01' THEN '9902'
                      WHEN O.STATUS <> '2' THEN '9801'
                      WHEN O.TO_SHOP IN ('A', 'TEST01') THEN '0101'
                      WHEN O.EXPORTED = 'F' THEN '0102'
                      ELSE ''
                  END AS 問題類型,
                  CASE 
                      WHEN O.SHOP_ID = 'A' THEN '總部key單、不納入表內'
                      WHEN O.SHOP_ID = 'TEST01' THEN '測試店key單、不納入表內'
                      WHEN O.STATUS <> '2' THEN '單據不是「核准」狀態'
                      WHEN O.TO_SHOP IN ('A', 'TEST01') THEN '調入門市不可為 A 或 TEST01'
                      WHEN O.EXPORTED = 'F' THEN '匯入門市，未使用[匯入]功能進行調撥入庫'
                      ELSE ''
                  END AS 問題描述,
                  CASE WHEN ISNULL(O.EXPORT_ID, '') <> '' THEN '調入單' ELSE '' END AS 匯入類型,
                  ISNULL(O.EXPORT_ID, '') AS 匯入單號,
                  O.INPUT_DATE AS RAW_DATE,
                  O.SHOP_ID AS RAW_SHOP
              FROM OUT00 O
              WHERE (O.INPUT_DATE >= @SALE_DATE_S AND O.INPUT_DATE < DATEADD(DAY, 1, @SALE_DATE_E))
                AND O.OUT_TYPE = '0'
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
                      WHEN I.SHOP_ID = 'A' THEN '9901'
                      WHEN I.SHOP_ID = 'TEST01' THEN '9902'
                      WHEN I.STATUS <> '2' THEN '9801'
                      WHEN I.OUT_SHOP IN ('A', 'TEST01') THEN '0201'
                      WHEN O_MAP.OUT_ID IS NULL THEN '0202'
                      ELSE ''
                  END AS 問題類型,
                  CASE 
                      WHEN I.SHOP_ID = 'A' THEN '總部key單、不納入表內'
                      WHEN I.SHOP_ID = 'TEST01' THEN '測試店key單、不納入表內'
                      WHEN I.STATUS <> '2' THEN '單據不是「核准」狀態'
                      WHEN I.OUT_SHOP IN ('A', 'TEST01') THEN '調出門市不可為 A 或 TEST01'
                      WHEN O_MAP.OUT_ID IS NULL THEN '未使用[匯入]功能進行調撥入庫'
                      ELSE ''
                  END AS 問題描述,
                  CASE WHEN O_MAP.OUT_ID IS NOT NULL THEN '調出單' ELSE '' END AS 匯入類型,
                  ISNULL(O_MAP.OUT_ID, '') AS 匯入單號,
                  I.INPUT_DATE AS RAW_DATE,
                  I.SHOP_ID AS RAW_SHOP
              FROM IN00 I
              LEFT JOIN OUT00 O_MAP ON I.IN_ID = O_MAP.EXPORT_ID
              WHERE (I.INPUT_DATE >= @SALE_DATE_S AND I.INPUT_DATE < DATEADD(DAY, 1, @SALE_DATE_E))
                AND I.IN_TYPE = '0'
                AND (
                    I.SHOP_ID IN ('A', 'TEST01') OR I.STATUS <> '2' 
                    OR I.OUT_SHOP IN ('A', 'TEST01') OR O_MAP.OUT_ID IS NULL
                )
          ) AS ResultTable
          WHERE (ISNULL(@SHOP_ID_STR, '') = '' OR RAW_SHOP IN (SELECT t.v.value('.', 'NVARCHAR(20)') FROM @ShopXml.nodes('/root/v') AS t(v)))
          ORDER BY 
              單據日期 DESC,
              單據類型 ASC,
              調出門市 ASC,
              調入門市 ASC,
              單號 ASC
        `)
            return result.recordset
        } catch (err) {
            console.error('異常單據取得失敗：', err)
            throw err
        }
    },
    posMaterialToERP: async (filterIn) => {
        try {
            const pool = await poolPromise
            const result = await pool.request()
                .input('S_DATE_STR', filterIn.SALE_DATE_S)
                .input('E_DATE_STR', filterIn.SALE_DATE_E)
                .input('SHOP_IDS_STR', filterIn.SHOP_ID || '')
                .query(`
                    DECLARE @SALE_DATE_S_STR NVARCHAR(10) = @S_DATE_STR
                    DECLARE @SALE_DATE_E_STR NVARCHAR(10) = @E_DATE_STR
                    DECLARE @SHOP_ID_STR     NVARCHAR(MAX) = @SHOP_IDS_STR 

                    DECLARE @SALE_DATE_S DATETIME
                    DECLARE @SALE_DATE_E DATETIME

                    SET @SALE_DATE_S = CASE WHEN ISDATE(@SALE_DATE_S_STR) = 1 THEN CAST(@SALE_DATE_S_STR AS DATE) ELSE CAST(GETDATE() AS DATE) END
                    SET @SALE_DATE_E = CASE WHEN ISDATE(@SALE_DATE_E_STR) = 1 THEN CAST(@SALE_DATE_E_STR AS DATE) ELSE CAST(GETDATE() AS DATE) END

                    DECLARE @ShopXml XML
                    IF ISNULL(@SHOP_ID_STR, '') <> '' SET @ShopXml = CAST('<root><v>' + REPLACE(@SHOP_ID_STR, ',', '</v><v>') + '</v></root>' AS XML)

                    SELECT 
                        日期,
                        ROW_NUMBER() OVER (
                            PARTITION BY 日期, [客戶/供應商編碼], 發貨倉庫 
                            ORDER BY POS單號 ASC, 原始序號 ASC
                        ) AS 序號,
                        [客戶/供應商編碼],
                        [客戶/供應商名稱],
                        發貨倉庫,
                        POS單號,
                        品項編碼,
                        品項名稱,
                        規格,
                        數量,
                        服務人員,
                        領用原因,
                        備註
                    FROM (
                        SELECT 
                            CONVERT(VARCHAR(8), M0.INPUT_DATE, 112) AS 日期,
                            M1.SHOP_ID AS [客戶/供應商編碼],
                            '' AS [客戶/供應商名稱],
                            M0.STK_ID AS 發貨倉庫,
                            M1.MAT_ID AS POS單號,
                            M1.MAT_SNO AS 原始序號,
                            P.prod_shortname AS 品項編碼,
                            '' AS 品項名稱,
                            '' AS 規格,
                            M1.QUANTITY AS 數量,
                            E.EMP_NAME AS 服務人員,
                            R.detail AS 領用原因,
                            M0.MEMO AS 備註,
                            M0.INPUT_DATE AS RAW_DATE,
                            M1.SHOP_ID -- 用於外層過濾
                        FROM MATERIAL01 M1
                        INNER JOIN MATERIAL00 M0 ON M1.MAT_ID = M0.MAT_ID
                        LEFT JOIN PRODUCT00 P ON M1.PROD_ID = P.PROD_ID
                        LEFT JOIN EMPLOYEE E ON M0.USER_ID = E.EMP_ID
                        LEFT JOIN matreason R ON M1.d_reason_id = R.d_reason_id
                        WHERE 
                            M0.STATUS = '2'
                            AND M1.SHOP_ID NOT IN ('A', 'TEST01')
                            AND M0.INPUT_DATE >= @SALE_DATE_S AND M0.INPUT_DATE < DATEADD(DAY, 1, @SALE_DATE_E)
                            AND (
                                ISNULL(@SHOP_ID_STR, '') = '' 
                                OR M1.SHOP_ID IN (SELECT t.v.value('.', 'NVARCHAR(20)') FROM @ShopXml.nodes('/root/v') AS t(v))
                            )
                    ) AS BaseData
                    ORDER BY 
                        日期 DESC, 
                        [客戶/供應商編碼] ASC, 
                        發貨倉庫 ASC, 
                        序號 ASC
        `)
            return result.recordset
        } catch (err) {
            console.error('資料取得失敗：', err)
            throw err
        }
    },
    posStOrderOutToERP: async (id) => {
        try {
            const pool = await poolPromise
            const result = await pool.request()
                .input('id', id)
                .query(`
                    DECLARE @TARGET_ID NVARCHAR(50) = @id

                    SELECT 
                        [日期],
                        [序號],
                        [承辦人],
                        [出貨倉庫],
                        [收貨倉庫],
                        [專案],
                        [借出客戶],
                        [倉庫調撥單號],
                        [POS單據類型],
                        [POS單號],
                        [品項編碼],
                        [品項名稱],
                        [規格],
                        [數量],
                        [服務人員],
                        [備註],
                        [產生生產入庫]
                    FROM (
                        SELECT 
                            -- 1. 日期 (YYYYMMDD)
                            CONVERT(VARCHAR(8), O.INPUT_DATE, 112) AS [日期],
                            
                            -- 2. 序號 (依據 日期、出貨倉庫、POS單據類型 分組，且收貨倉庫不同就重新編號)
                            ROW_NUMBER() OVER (
                                PARTITION BY CONVERT(VARCHAR(8), O.INPUT_DATE, 112), O.OUT_SHOP, O.TO_SHOP 
                                ORDER BY D.OUT_SNO ASC
                            ) AS [序號],
                            
                            -- 3. 承辦人 (空白)
                            '' AS [承辦人],
                            
                            -- 4. 出貨倉庫
                            O.OUT_SHOP AS [出貨倉庫],
                            
                            -- 5. 收貨倉庫
                            O.TO_SHOP AS [收貨倉庫],
                            
                            -- 6. 專案 (空白)
                            '' AS [專案],
                            
                            -- 7. 借出客戶 (空白)
                            '' AS [借出客戶],
                            
                            -- 8. 倉庫調撥單號 (空白)
                            '' AS [倉庫調撥單號],
                            
                            -- 9. POS單據類型
                            '總部出貨' AS [POS單據類型],
                            
                            -- 10. POS單號
                            D.OUT_ID AS [POS單號],
                            
                            -- 11. 品項編碼
                            P.prod_shortname AS [品項編碼],
                            
                            -- 12. 品項名稱 (空白)
                            '' AS [品項名稱],
                            
                            -- 13. 規格 (空白)
                            '' AS [規格],
                            
                            -- 14. 數量
                            D.QUANTITY AS [數量],
                            
                            -- 15. 服務人員
                            E.EMP_NAME AS [服務人員],
                            
                            -- 16. 備註
                            O.MEMO AS [備註],
                            
                            -- 17. 產生生產入庫 (空白)
                            '' AS [產生生產入庫],
                            
                            -- 隱藏欄位用於最終排序
                            O.INPUT_DATE AS [ORIGIN_DATE]
                        FROM OUT00 O
                        INNER JOIN OUT01 D ON LTRIM(RTRIM(O.OUT_ID)) = LTRIM(RTRIM(D.OUT_ID))
                        LEFT JOIN PRODUCT00 P ON LTRIM(RTRIM(D.PROD_ID)) = LTRIM(RTRIM(P.PROD_ID))
                        LEFT JOIN EMPLOYEE E ON LTRIM(RTRIM(O.USER_ID)) = LTRIM(RTRIM(E.EMP_ID))
                        WHERE LTRIM(RTRIM(O.OUT_ID)) = LTRIM(RTRIM(@TARGET_ID))
                    ) AS TempTable
                    ORDER BY 
                        [ORIGIN_DATE] DESC, 
                        [出貨倉庫] ASC, 
                        [收貨倉庫] ASC, 
                        [序號] ASC
        `)
            return result.recordset
        } catch (err) {
            console.error('資料取得失敗：', err)
            throw err
        }
    },
}

module.exports = downloadModel
