// src/models/downloadModel.js

const { poolPromise } = require('../config/db')

const downloadModel = {
    posSaleToERP: async (filterIn) => {
        try {
            const pool = await poolPromise

            const sDate = (filterIn.SALE_DATE_S || '').toString()
            const eDate = (filterIn.SALE_DATE_E || '').toString()

            const shopIds = Array.isArray(filterIn.SHOP_ID)
                ? filterIn.SHOP_ID.join(',')
                : (filterIn.SHOP_ID || '').toString()

            const types = Array.isArray(filterIn.TYPE)
                ? filterIn.TYPE.join(',')
                : (filterIn.TYPE || '').toString()

            const result = await pool.request()
                .input('S_DATE_VAL', sDate)
                .input('E_DATE_VAL', eDate)
                .input('SHOP_IDS_VAL', shopIds)
                .input('TYPE_VAL', types)
                .query(`
        DECLARE @S_DT NVARCHAR(10) = @S_DATE_VAL
        DECLARE @E_DT NVARCHAR(10) = @E_DATE_VAL
        DECLARE @S_IDS NVARCHAR(MAX) = @SHOP_IDS_VAL
        DECLARE @T_IDS NVARCHAR(MAX) = @TYPE_VAL

        DECLARE @S_DATE DATE = CASE WHEN ISDATE(@S_DT) = 1 THEN CAST(@S_DT AS DATE) ELSE CAST(GETDATE() AS DATE) END
        DECLARE @E_DATE DATE = CASE WHEN ISDATE(@E_DT) = 1 THEN CAST(@E_DT AS DATE) ELSE CAST(GETDATE() AS DATE) END

        DECLARE @ShopXml XML = CAST('<r><v>' + REPLACE(CAST(@S_IDS AS NVARCHAR(MAX)), ',', '</v><v>') + '</v></r>' AS XML)
        DECLARE @TypeXml XML = CAST('<r><v>' + REPLACE(CAST(@T_IDS AS NVARCHAR(MAX)), ',', '</v><v>') + '</v></r>' AS XML)

        SELECT
            日期,
            DENSE_RANK() OVER (
                ORDER BY 
                    日期 DESC, 
                    [客戶/供應商編碼] ASC, 
                    發貨倉庫 ASC, 
                    [收貨倉庫] ASC, 
                    交易類型_排序 ASC,
                    交易類型 ASC
            ) AS 序號,
            [客戶/供應商編碼],
            '' AS [客戶/供應商名稱],
            發貨倉庫,
            '' AS 承辦人,
            交易類型,
            '' AS 貨幣,
            '' AS 匯率,
            '' AS [銷貨單單號],
            關鍵字,
            服務人員,
            類型,
            POS單號,
            貴賓電話,
            CAST(品項編碼 AS NVARCHAR(MAX)) AS 品項編碼,
            '' AS [品項名稱],
            '' AS 規格,
            數量,
            加值,
            單價,
            總折讓,
            '' AS 外幣金額,
            [小計(稅前價)],
            0 AS 營業稅,
            招待備註,
            發票號碼,
            [載具/統編],
            備註,
            原銷貨單號,
            '' AS 產生生產入庫
        FROM (
            SELECT 
                CONVERT(VARCHAR(8), S1.order_time, 112) AS 日期,
                S1.SHOP_ID AS 發貨倉庫,
                '' AS [收貨倉庫],
                CAST(ISNULL(NULLIF(LTRIM(RTRIM(V.iccardno)), ''), S1.SHOP_ID) AS NVARCHAR(100)) AS [客戶/供應商編碼],

                CAST(CASE 
                    WHEN ISNULL(LTRIM(RTRIM(S2.PAY_ID)), '') = '' THEN '13'
                    WHEN S2.PAY_ID = '1'    THEN '15'
                    WHEN S2.PAY_ID = '4'    THEN '16'
                    WHEN S2.PAY_ID = '5'    THEN '16'
                    WHEN S2.PAY_ID = '6'    THEN '月結發票專用'
                    WHEN S2.PAY_ID = 'H'    THEN '17'
                    WHEN S2.PAY_ID = 'OP13' THEN '18'
                    WHEN S2.PAY_ID = 'Z'    THEN '19'
                    WHEN S2.PAY_ID = 'Z1'   THEN '1A'
                    ELSE N'未設定的「' + CAST(ISNULL(S2.PAY_ID, '') AS NVARCHAR(MAX)) + N'」，請通知系統管理員'
                END AS NVARCHAR(MAX)) AS 交易類型,

                CASE 
                    WHEN ISNULL(LTRIM(RTRIM(S2.PAY_ID)), '') = '' THEN '13'
                    WHEN S2.PAY_ID = '1'    THEN '15'
                    WHEN S2.PAY_ID = '4'    THEN '16'
                    WHEN S2.PAY_ID = '5'    THEN '16'
                    WHEN S2.PAY_ID = '6'    THEN '16.5'
                    WHEN S2.PAY_ID = 'H'    THEN '17'
                    WHEN S2.PAY_ID = 'OP13' THEN '18'
                    WHEN S2.PAY_ID = 'Z'    THEN '19'
                    WHEN S2.PAY_ID = 'Z1'   THEN '1A'
                    ELSE 'ZZZ'
                END AS 交易類型_排序,

                CASE WHEN S1.FREE_MEMO = '寄賣/借出' THEN '寄賣' ELSE '' END AS 關鍵字,
                ISNULL(E.EMP_NAME, '') AS 服務人員,

                CAST(CASE S0.TYPE
                    WHEN '0' THEN '銷貨單'
                    WHEN '1' THEN '銷退單'
                    WHEN '2' THEN '被銷退單'
                    ELSE N'未設定的「' + CAST(ISNULL(S0.TYPE, '') AS NVARCHAR(MAX)) + N'」，請通知系統管理員'
                END AS NVARCHAR(MAX)) AS 類型,

                S1.SALE_ID AS POS單號,
                S1.SALE_SNO,
                COALESCE(NULLIF(LTRIM(RTRIM(V.TELEPHONE)), ''), NULLIF(LTRIM(RTRIM(V.MOBILE)), ''), '') AS 貴賓電話,
                
                CAST(
                  ISNULL(
                    CAST(NULLIF(LTRIM(RTRIM(P.prod_shortname)), '') AS NVARCHAR(MAX)), 
                    N'「' + CAST(ISNULL(P.PROD_NAME1, N'未知商品') AS NVARCHAR(MAX)) + N'」未設定ERP編號'
                  ) AS NVARCHAR(MAX)
                ) AS 品項編碼,
                
                S1.QTY AS 數量,
                S1.TASTE_MEMO AS 加值,
                S1.SALE_PRICE AS 單價,
               ISNULL(S1.ITEM_DISC, 0) + ISNULL(S1.itemdisc_total, 0) AS 總折讓,
               (S1.SALE_PRICE * S1.QTY) + ISNULL(S1.ITEM_DISC, 0) + ISNULL(S1.itemdisc_total, 0) AS [小計(稅前價)],
                
                S1.FREE_MEMO AS 招待備註,
                S1.invo_no AS 發票號碼,
                ISNULL(NULLIF(LTRIM(RTRIM(S0.buyer_number)), ''), ISNULL(LTRIM(RTRIM(S0.CUST_CODE)), '')) AS [載具/統編],
                
                CASE 
                    WHEN ISNULL(S0.MEMO,'') <> '' AND ISNULL(S0.spec_memo,'') <> '' 
                        THEN LTRIM(RTRIM(S0.MEMO)) + CHAR(13) + CHAR(10) + LTRIM(RTRIM(S0.spec_memo))
                    ELSE ISNULL(NULLIF(LTRIM(RTRIM(S0.MEMO)), ''), ISNULL(LTRIM(RTRIM(S0.spec_memo)), ''))
                END AS 備註,
                
                S0.RETURNED_ID AS 原銷貨單號,

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
        AND (@S_IDS = '' OR RAW_SHOP IN (SELECT t.v.value('.', 'NVARCHAR(50)') FROM @ShopXml.nodes('/r/v') AS t(v)))
        AND (@T_IDS = '' OR RAW_TYPE IN (SELECT t.v.value('.', 'NVARCHAR(50)') FROM @TypeXml.nodes('/r/v') AS t(v)))
        
        ORDER BY 
            日期 DESC, 
            [客戶/供應商編碼] ASC, 
            發貨倉庫 ASC, 
            交易類型 ASC, 
            POS單號 ASC, 
            SALE_SNO ASC
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
            const shopIds = Array.isArray(filterIn.SHOP_ID)
                ? filterIn.SHOP_ID.join(',')
                : (filterIn.SHOP_ID || '').toString()

            const tableIds = Array.isArray(filterIn.TABLE)
                ? filterIn.TABLE.join(',')
                : (filterIn.TABLE || '').toString()

            const result = await pool.request()
                .input('S_DATE_VAL', sDate)
                .input('E_DATE_VAL', eDate)
                .input('SHOP_IDS_VAL', shopIds)
                .input('TYPE_VAL', tableIds)
                .query(`
                /* 篩選變數定義 */
                DECLARE @S_DT NVARCHAR(10) = @S_DATE_VAL
                DECLARE @E_DT NVARCHAR(10) = @E_DATE_VAL
                DECLARE @S_IDS NVARCHAR(MAX) = @SHOP_IDS_VAL
                DECLARE @T_IDS NVARCHAR(MAX) = @TYPE_VAL

                /* 1. 日期預設處理 */
                DECLARE @S_DATE DATETIME = CASE WHEN ISDATE(@S_DT) = 1 THEN CAST(@S_DT AS DATE) ELSE CAST(GETDATE() AS DATE) END
                DECLARE @E_DATE DATETIME = CASE WHEN ISDATE(@E_DT) = 1 THEN CAST(@E_DT AS DATE) ELSE CAST(GETDATE() AS DATE) END

                /* 2. 多選字串拆解 */
                DECLARE @ShopXml XML = CAST('<r><v>' + REPLACE(ISNULL(@S_IDS, ''), ',', '</v><v>') + '</v></r>' AS XML)
                DECLARE @TypeXml XML = CAST('<r><v>' + REPLACE(ISNULL(@T_IDS, ''), ',', '</v><v>') + '</v></r>' AS XML)

                /* 3. 主查詢邏輯 */
                SELECT 
                    日期, 
                    DENSE_RANK() OVER (
                        ORDER BY 日期 DESC, POS單據類型 ASC, 出貨倉庫 ASC, 收貨倉庫 ASC
                    ) AS 序號,
                    '' AS 承辦人,
                    出貨倉庫,
                    收貨倉庫,
                    '' AS 專案,
                    '' AS 借出客戶,
                    '' AS 倉庫調撥單號,
                    POS單據類型,
                    POS單號,
                    /* 關鍵修正：確保報錯訊息不被截斷 */
                    CAST(品項編碼 AS NVARCHAR(MAX)) AS 品項編碼,
                    '' AS 品項名稱,
                    '' AS 規格,
                    數量,
                    服務人員,
                    備註,
                    '' AS 產生生產入庫
                FROM (
                    SELECT 
                        CONVERT(VARCHAR(8), T10.INPUT_DATE, 112) AS 日期, 'A' AS 出貨倉庫, T10.STK_ID AS 收貨倉庫,
                        '供應商進貨' AS POS單據類型, T11.TAKEIN_ID AS POS單號,
                        /* 品項編碼判斷邏輯 */
                        ISNULL(CAST(NULLIF(LTRIM(RTRIM(P.prod_shortname)), '') AS NVARCHAR(MAX)), 
                               N'「' + CAST(ISNULL(P.PROD_NAME1, N'未知商品') AS NVARCHAR(MAX)) + N'」未設定ERP編號') AS 品項編碼,
                        T11.QUANTITY AS 數量, E.EMP_NAME AS 服務人員,
                        T10.MEMO AS 備註, 'TAKEIN' AS TABLE_TYPE, T10.SHOP_ID AS SHOP_ID, 
                        T10.INPUT_DATE AS RAW_DATE
                    FROM TAKEIN11 T11
                    INNER JOIN TAKEIN10 T10 ON T11.TAKEIN_ID = T10.TAKEIN_ID
                    LEFT JOIN PRODUCT00 P ON T11.PROD_ID = P.PROD_ID
                    LEFT JOIN EMPLOYEE E ON T10.USER_ID = E.EMP_ID
                    WHERE T10.STATUS = '2' AND T10.SHOP_ID NOT IN ('A', 'TEST01')

                    UNION ALL

                    SELECT 
                        CONVERT(VARCHAR(8), T00.INPUT_DATE, 112) AS 日期, T00.STK_ID AS 出貨倉庫, 'A' AS 收貨倉庫,
                        '供應商退貨' AS POS單據類型, T01.TAKEOUT_ID AS POS單號,
                        ISNULL(CAST(NULLIF(LTRIM(RTRIM(P.prod_shortname)), '') AS NVARCHAR(MAX)), 
                               N'「' + CAST(ISNULL(P.PROD_NAME1, N'未知商品') AS NVARCHAR(MAX)) + N'」未設定ERP編號') AS 品項編碼,
                        T01.QUANTITY AS 數量, E.EMP_NAME AS 服務人員,
                        T00.MEMO AS 備註, 'TAKEOUT' AS TABLE_TYPE, T00.SHOP_ID AS SHOP_ID, 
                        T00.INPUT_DATE AS RAW_DATE
                    FROM TAKEOUT01 T01
                    INNER JOIN TAKEOUT00 T00 ON T01.TAKEOUT_ID = T00.TAKEOUT_ID
                    LEFT JOIN PRODUCT00 P ON T01.PROD_ID = P.PROD_ID
                    LEFT JOIN EMPLOYEE E ON T00.USER_ID = E.EMP_ID
                    WHERE T00.STATUS = '2' AND T00.SHOP_ID NOT IN ('A', 'TEST01')

                    UNION ALL

                    SELECT 
                        CONVERT(VARCHAR(8), O00.INPUT_DATE, 112) AS 日期, O00.OUT_SHOP AS 出貨倉庫, O00.TO_SHOP AS 收貨倉庫,
                        '調撥' AS POS單據類型, O01.OUT_ID AS POS單號,
                        ISNULL(CAST(NULLIF(LTRIM(RTRIM(P.prod_shortname)), '') AS NVARCHAR(MAX)), 
                               N'「' + CAST(ISNULL(P.PROD_NAME1, N'未知商品') AS NVARCHAR(MAX)) + N'」未設定ERP編號') AS 品項編碼,
                        O01.QUANTITY AS 數量, E.EMP_NAME AS 服務人員,
                        O00.MEMO AS 備註, 'OUT' AS TABLE_TYPE, O00.SHOP_ID AS SHOP_ID, 
                        O00.INPUT_DATE AS RAW_DATE
                    FROM OUT01 O01
                    INNER JOIN OUT00 O00 ON O01.OUT_ID = O00.OUT_ID
                    LEFT JOIN PRODUCT00 P ON O01.PROD_ID = P.PROD_ID
                    LEFT JOIN EMPLOYEE E ON O00.USER_ID = E.EMP_ID
                    WHERE O00.STATUS = '2' 
                    AND O00.OUT_TYPE = '0' 
                    AND O00.EXPORTED = 'T'
                    AND O00.SHOP_ID NOT IN ('A', 'TEST01')
                    AND O00.TO_SHOP NOT IN ('A', 'TEST01')
                    AND O00.OUT_SHOP NOT IN ('A', 'TEST01')

                    UNION ALL

                    SELECT 
                        CONVERT(VARCHAR(8), I00.INPUT_DATE, 112) AS 日期, 'A' AS 出貨倉庫, I00.IN_SHOP AS 收貨倉庫,
                        '總部進貨' AS POS單據類型, I00.IN_ID AS POS單號,
                        ISNULL(CAST(NULLIF(LTRIM(RTRIM(P.prod_shortname)), '') AS NVARCHAR(MAX)), 
                               N'「' + CAST(ISNULL(P.PROD_NAME1, N'未知商品') AS NVARCHAR(MAX)) + N'」未設定ERP編號') AS 品項編碼,
                        I01.QUANTITY AS 數量, E.EMP_NAME AS 服務人員,
                        I00.MEMO AS 備註, 'IN' AS TABLE_TYPE, I00.SHOP_ID AS SHOP_ID, 
                        I00.INPUT_DATE AS RAW_DATE
                    FROM IN01 I01
                    INNER JOIN IN00 I00 ON I01.IN_ID = I00.IN_ID
                    LEFT JOIN PRODUCT00 P ON I01.PROD_ID = P.PROD_ID
                    LEFT JOIN EMPLOYEE E ON I00.USER_ID = E.EMP_ID
                    WHERE I00.STATUS = '2' 
                    AND I00.IN_TYPE = '1'
                    AND I00.SHOP_ID NOT IN ('A', 'TEST01')

                    UNION ALL

                    SELECT 
                        CONVERT(VARCHAR(8), SB0.INPUT_DATE, 112) AS 日期, SB0.STK_ID AS 出貨倉庫, SB0.IN_SHOP AS 收貨倉庫,
                        '總部退貨' AS POS單據類型, SB0.SEND_BACK_ID AS POS單號,
                        ISNULL(CAST(NULLIF(LTRIM(RTRIM(P.prod_shortname)), '') AS NVARCHAR(MAX)), 
                               N'「' + CAST(ISNULL(P.PROD_NAME1, N'未知商品') AS NVARCHAR(MAX)) + N'」未設定ERP編號') AS 品項編碼,
                        SB1.QUANTITY AS 數量, E.EMP_NAME AS 服務人員,
                        SB0.MEMO AS 備註, 'SEND_BACK' AS TABLE_TYPE, SB0.SHOP_ID AS SHOP_ID, 
                        SB0.INPUT_DATE AS RAW_DATE
                    FROM SEND_BACK01 SB1
                    INNER JOIN SEND_BACK00 SB0 ON SB1.SEND_BACK_ID = SB0.SEND_BACK_ID
                    LEFT JOIN PRODUCT00 P ON SB1.PROD_ID = P.PROD_ID
                    LEFT JOIN EMPLOYEE E ON SB0.USER_ID = E.EMP_ID
                    WHERE SB0.STATUS = '2' AND SB0.SHOP_ID NOT IN ('A', 'TEST01')
                ) AS CombinedData
                WHERE (RAW_DATE >= @S_DATE AND RAW_DATE < DATEADD(DAY, 1, @E_DATE))
                AND (ISNULL(@S_IDS, '') = '' OR SHOP_ID IN (SELECT t.v.value('.', 'NVARCHAR(50)') FROM @ShopXml.nodes('/r/v') AS t(v)))
                AND (ISNULL(@T_IDS, '') = '' OR TABLE_TYPE IN (SELECT t.v.value('.', 'NVARCHAR(50)') FROM @TypeXml.nodes('/r/v') AS t(v)))
                ORDER BY 序號 ASC
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

            // 處理輸入參數，確保空值為 ''，支援多選門市
            const sDate = (filterIn.SALE_DATE_S || '').toString()
            const eDate = (filterIn.SALE_DATE_E || '').toString()
            const shopIds = Array.isArray(filterIn.SHOP_ID)
                ? filterIn.SHOP_ID.join(',')
                : (filterIn.SHOP_ID || '').toString()

            const result = await pool.request()
                .input('S_DATE_VAL', sDate)
                .input('E_DATE_VAL', eDate)
                .input('SHOP_IDS_VAL', shopIds)
                .query(`
                /* 篩選變數定義 - 統一命名規則 */
                DECLARE @S_DT NVARCHAR(10) = @S_DATE_VAL
                DECLARE @E_DT NVARCHAR(10) = @E_DATE_VAL
                DECLARE @S_IDS NVARCHAR(MAX) = @SHOP_IDS_VAL

                /* 1. 日期與 XML 處理 */
                DECLARE @S_DATE DATETIME = CASE WHEN ISDATE(@S_DT) = 1 THEN CAST(@S_DT AS DATE) ELSE CAST(GETDATE() AS DATE) END
                DECLARE @E_DATE DATETIME = CASE WHEN ISDATE(@E_DT) = 1 THEN CAST(@E_DT AS DATE) ELSE CAST(GETDATE() AS DATE) END

                DECLARE @ShopXml XML = CAST('<r><v>' + REPLACE(ISNULL(@S_IDS, ''), ',', '</v><v>') + '</v></r>' AS XML)

                /* 2. 主查詢邏輯 (異常單據篩選) */
                SELECT 
                    單據日期, 建立門市, 單據類型, 單號, 調出門市, 
                    調入門市, 問題類型, 問題描述, 匯入類型, 匯入單號
                FROM (
                    -- A. 調出單 (OUT00) 異常判斷
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
                    WHERE (O.INPUT_DATE >= @S_DATE AND O.INPUT_DATE < DATEADD(DAY, 1, @E_DATE))
                      AND O.OUT_TYPE = '0'
                      AND (
                          O.SHOP_ID IN ('A', 'TEST01') OR O.STATUS <> '2' 
                          OR O.TO_SHOP IN ('A', 'TEST01') OR O.EXPORTED = 'F'
                      )

                    UNION ALL

                    -- B. 調入單 (IN00) 異常判斷
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
                    WHERE (I.INPUT_DATE >= @S_DATE AND I.INPUT_DATE < DATEADD(DAY, 1, @E_DATE))
                      AND I.IN_TYPE = '0'
                      AND (
                          I.SHOP_ID IN ('A', 'TEST01') OR I.STATUS <> '2' 
                          OR I.OUT_SHOP IN ('A', 'TEST01') OR O_MAP.OUT_ID IS NULL
                      )
                ) AS ResultTable
                /* 門市多選過濾與長編號處理 (NVARCHAR(50)) */
                WHERE (ISNULL(@S_IDS, '') = '' OR RAW_SHOP IN (SELECT t.v.value('.', 'NVARCHAR(50)') FROM @ShopXml.nodes('/r/v') AS t(v)))
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

            // 處理輸入參數，確保空值為 ''
            const sDate = (filterIn.SALE_DATE_S || '').toString()
            const eDate = (filterIn.SALE_DATE_E || '').toString()
            const shopIds = Array.isArray(filterIn.SHOP_ID)
                ? filterIn.SHOP_ID.join(',')
                : (filterIn.SHOP_ID || '').toString()

            const result = await pool.request()
                .input('S_DATE_VAL', sDate)
                .input('E_DATE_VAL', eDate)
                .input('SHOP_IDS_VAL', shopIds)
                .query(`
                /* 篩選變數定義 - 統一命名規則 */
                DECLARE @S_DT NVARCHAR(10) = @S_DATE_VAL
                DECLARE @E_DT NVARCHAR(10) = @E_DATE_VAL
                DECLARE @S_IDS NVARCHAR(MAX) = @SHOP_IDS_VAL

                /* 1. 日期與 XML 處理 */
                DECLARE @S_DATE DATETIME = CASE WHEN ISDATE(@S_DT) = 1 THEN CAST(@S_DT AS DATE) ELSE CAST(GETDATE() AS DATE) END
                DECLARE @E_DATE DATETIME = CASE WHEN ISDATE(@E_DT) = 1 THEN CAST(@E_DT AS DATE) ELSE CAST(GETDATE() AS DATE) END

                DECLARE @ShopXml XML = CAST('<r><v>' + REPLACE(ISNULL(@S_IDS, ''), ',', '</v><v>') + '</v></r>' AS XML)

                /* 2. 主查詢邏輯 */
                SELECT 
                    日期,
                    /* 序號重編：依照日期(降序)、客戶、倉庫、單號排序 */
                    ROW_NUMBER() OVER (
                        ORDER BY RAW_DATE DESC, [客戶/供應商編碼] ASC, 發貨倉庫 ASC, POS單號 ASC, 原始序號 ASC
                    ) AS 序號,
                    [客戶/供應商編碼],
                    '' AS [客戶/供應商名稱],
                    發貨倉庫,
                    POS單號,
                    /* 關鍵修正：確保報錯訊息不被截斷且帶入商品名稱 */
                    CAST(品項編碼 AS NVARCHAR(MAX)) AS 品項編碼,
                    '' AS 品項名稱,
                    '' AS 規格,
                    數量,
                    服務人員,
                    領用原因,
                    備註
                FROM (
                    SELECT 
                        CONVERT(VARCHAR(8), M0.INPUT_DATE, 112) AS 日期,
                        M1.SHOP_ID AS [客戶/供應商編碼],
                        M0.STK_ID AS 發貨倉庫,
                        M1.MAT_ID AS POS單號,
                        M1.MAT_SNO AS 原始序號,
                        /* 品項編碼判斷邏輯：NULLIF 結合 CAST 防止截斷 */
                        ISNULL(
                            CAST(NULLIF(LTRIM(RTRIM(P.prod_shortname)), '') AS NVARCHAR(MAX)), 
                            N'「' + CAST(ISNULL(P.PROD_NAME1, N'未知商品') AS NVARCHAR(MAX)) + N'」未設定ERP編號'
                        ) AS 品項編碼,
                        M1.QUANTITY AS 數量,
                        E.EMP_NAME AS 服務人員,
                        R.detail AS 領用原因,
                        M0.MEMO AS 備註,
                        M0.INPUT_DATE AS RAW_DATE
                    FROM MATERIAL01 M1
                    INNER JOIN MATERIAL00 M0 ON M1.MAT_ID = M0.MAT_ID
                    LEFT JOIN PRODUCT00 P ON M1.PROD_ID = P.PROD_ID
                    LEFT JOIN EMPLOYEE E ON M0.USER_ID = E.EMP_ID
                    LEFT JOIN matreason R ON M1.d_reason_id = R.d_reason_id
                    WHERE M0.STATUS = '2'
                    AND M1.SHOP_ID NOT IN ('A', 'TEST01')
                    AND (M0.INPUT_DATE >= @S_DATE AND M0.INPUT_DATE < DATEADD(DAY, 1, @E_DATE))
                    AND (
                        ISNULL(@S_IDS, '') = '' 
                        OR M1.SHOP_ID IN (SELECT t.v.value('.', 'NVARCHAR(50)') FROM @ShopXml.nodes('/r/v') AS t(v))
                    )
                ) AS BaseData
                /* 最終排序：序號 ASC */
                ORDER BY 序號 ASC
            `)
            return result.recordset
        } catch (err) {
            console.error('物料領用資料取得失敗：', err)
            throw err
        }
    },
    posStOrderOutToERP: async (id) => {
        try {
            const pool = await poolPromise
            const result = await pool.request()
                .input('TARGET_ID_VAL', (id || '').toString())
                .query(`
                /* 1. 定義目標單號，支援長單號 */
                DECLARE @TARGET_ID NVARCHAR(50) = @TARGET_ID_VAL

                /* 2. 主查詢邏輯 */
                SELECT 
                    CONVERT(VARCHAR(8), O.INPUT_DATE, 112) AS [日期],
                    '1' AS [序號],
                    '' AS [承辦人],
                    O.OUT_SHOP AS [出貨倉庫],
                    O.TO_SHOP AS [收貨倉庫],
                    '' AS [專案],
                    '' AS [借出客戶],
                    '' AS [倉庫調撥單號],
                    '總部出貨' AS [POS單據類型],
                    D.OUT_ID AS [POS單號],
                    /* 關鍵修正：品項編碼判斷邏輯，結合 CAST 防止截斷 */
                    CAST(
                        ISNULL(
                            CAST(NULLIF(LTRIM(RTRIM(P.prod_shortname)), '') AS NVARCHAR(MAX)), 
                            N'「' + CAST(ISNULL(P.PROD_NAME1, N'未知商品') AS NVARCHAR(MAX)) + N'」未設定ERP編號'
                        ) AS NVARCHAR(MAX)
                    ) AS [品項編碼],
                    '' AS [品項名稱],
                    '' AS [規格],
                    D.QUANTITY AS [數量],
                    E.EMP_NAME AS [服務人員],
                    O.MEMO AS [備註],
                    '' AS [產生生產入庫]
                FROM OUT00 O
                INNER JOIN OUT01 D ON O.OUT_ID = D.OUT_ID
                LEFT JOIN PRODUCT00 P ON D.PROD_ID = P.PROD_ID
                LEFT JOIN EMPLOYEE E ON O.USER_ID = E.EMP_ID
                WHERE O.OUT_ID = @TARGET_ID
                /* 最終排序：依據原始序號 OUT_SNO 排序 */
                ORDER BY D.OUT_SNO ASC
            `)
            return result.recordset
        } catch (err) {
            console.error('總部出貨資料取得失敗：', err)
            throw err
        }
    },
    posStPerformance: async (filterIn) => {
        try {
            const pool = await poolPromise

            // 變數初始化與前端帶入值處理
            const sDate = (filterIn.SALE_DATE_S || '').toString()
            const eDate = (filterIn.SALE_DATE_E || '').toString()

            const shopIds = Array.isArray(filterIn.SHOP_ID)
                ? filterIn.SHOP_ID.join(',')
                : (filterIn.SHOP_ID || '').toString()

            const vipGrp = Array.isArray(filterIn.VIP_GRP)
                ? filterIn.VIP_GRP.join(',')
                : (filterIn.VIP_GRP || '').toString()

            const result = await pool.request()
                .input('S_DATE_VAL', sDate)
                .input('E_DATE_VAL', eDate)
                .input('SHOP_IDS_VAL', shopIds)
                .input('VIP_GRP_VAL', vipGrp)
                .query(`
        /* 1. 日期與 XML 處理 */
        DECLARE @S_DT NVARCHAR(10) = @S_DATE_VAL
        DECLARE @E_DT NVARCHAR(10) = @E_DATE_VAL
        DECLARE @S_IDS NVARCHAR(MAX) = @SHOP_IDS_VAL
        DECLARE @V_IDS NVARCHAR(MAX) = @VIP_GRP_VAL

        DECLARE @S_DATE DATE = CASE WHEN ISDATE(@S_DT) = 1 THEN CAST(@S_DT AS DATE) ELSE CAST(GETDATE() AS DATE) END
        DECLARE @E_DATE DATE = CASE WHEN ISDATE(@E_DT) = 1 THEN CAST(@E_DT AS DATE) ELSE CAST(GETDATE() AS DATE) END

        DECLARE @ShopXml XML = CAST('<r><v>' + REPLACE(@S_IDS, ',', '</v><v>') + '</v></r>' AS XML)
        DECLARE @VipXml XML = CAST('<r><v>' + REPLACE(@V_IDS, ',', '</v><v>') + '</v></r>' AS XML)

        /* 2. 主查詢 */
        SELECT 
            S1.SHOP_ID,
            SH.SHOP_NAME,
            REPLACE(CONVERT(VARCHAR(8), S1.order_time, 11), '/', '-') AS SALE_DATE,
            S0.vipgrp_id AS VIPGRP_ID,
            VG.vipgrp_name AS VIPGRP_NAME,
            V.NAME AS VIP_NAME,
            CASE S0.TYPE
                WHEN '0' THEN N'銷貨單'
                WHEN '1' THEN N'銷退單'
                WHEN '2' THEN N'被退單'
                ELSE N'未設定的「' + CAST(ISNULL(S0.TYPE, '') AS NVARCHAR(MAX)) + N'」，請通知系統管理員'
            END AS TYPE,
            S1.SALE_ID,
            P.PROD_NAME1,
            S1.QTY,
            U.UNIT_NAME AS UNIT,
            S1.TASTE_MEMO,
            S1.SALE_PRICE,
            ISNULL(S1.ITEM_DISC, 0) + ISNULL(S1.itemdisc_total, 0) AS DISC,
            (S1.SALE_PRICE * S1.QTY) + (ISNULL(S1.ITEM_DISC, 0) + ISNULL(S1.itemdisc_total, 0)) AS TOTAL,
            CASE 
                WHEN ISNULL(S1.FREE_MEMO, '') <> '' AND ISNULL(S0.spec_memo, '') <> '' 
                    THEN LTRIM(RTRIM(S1.FREE_MEMO)) + CHAR(13) + CHAR(10) + LTRIM(RTRIM(S0.spec_memo))
                ELSE ISNULL(NULLIF(LTRIM(RTRIM(S1.FREE_MEMO)), ''), ISNULL(LTRIM(RTRIM(S0.spec_memo)), ''))
            END AS MEMO,
            PAY.PAY_ID,
            PAY.PAY_NAME AS PAY_NAEM,
            CASE WHEN ISNULL(S1.invo_no, '') = '' THEN 'X' ELSE 'O' END AS INV
        FROM SALE01 S1
        INNER JOIN SALE00 S0 ON S1.SHOP_ID = S0.SHOP_ID AND S1.SALE_ID = S0.SALE_ID
        LEFT JOIN SHOP00 SH ON S1.SHOP_ID = SH.SHOP_ID
        LEFT JOIN VIP00 V ON S0.VIP_ID = V.VIP_ID
        LEFT JOIN vip_group00 VG ON S0.vipgrp_id = VG.vipgrp_id
        LEFT JOIN PRODUCT00 P ON S1.PROD_ID = P.PROD_ID
        LEFT JOIN UNIT U ON P.UNIT = U.UNIT_ID
        OUTER APPLY (
            SELECT TOP 1 S2.PAY_ID, PM.PAY_NAME 
            FROM SALE02 S2
            LEFT JOIN PAYMENT PM ON S2.PAY_ID = PM.PAY_ID
            WHERE S2.SHOP_ID = S1.SHOP_ID AND S2.SALE_ID = S1.SALE_ID
        ) PAY
        WHERE S0.STATUS = '2'
          AND S1.SHOP_ID NOT IN ('A', 'TEST01')
          AND (CAST(S1.order_time AS DATE) >= @S_DATE AND CAST(S1.order_time AS DATE) <= @E_DATE)
          AND (@S_IDS = '' OR S1.SHOP_ID IN (SELECT t.v.value('.', 'NVARCHAR(50)') FROM @ShopXml.nodes('/r/v') AS t(v)))
          AND (@V_IDS = '' OR S0.vipgrp_id IN (SELECT t.v.value('.', 'NVARCHAR(50)') FROM @VipXml.nodes('/r/v') AS t(v)))
        ORDER BY S1.SHOP_ID ASC, S0.vipgrp_id ASC, PAY.PAY_ID ASC, S1.SALE_ID DESC
      `)
            return result.recordset
        } catch (err) {
            console.error('銷貨績效資料取得失敗：', err)
            throw err
        }
    }
}

module.exports = downloadModel
