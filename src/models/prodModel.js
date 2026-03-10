// src/models/prodModel.js

const dayjs = require('dayjs')
const { poolPromise } = require('../config/db')

const prodData = {
  getAllProdData: async (filterIn) => {
    try {
      const pool = await poolPromise

      // 在 JS 層先轉為數字，避免傳入字串導致 SQL bit 轉型失敗
      const isFloatVal = parseInt(filterIn.isfloat ?? -1)
      const selectEnable = parseInt(filterIn.ENABLE ?? 1)

      const result = await pool.request()
        .input('PROD_ID', filterIn.PROD_ID || '')
        .input('PROD_NAME', filterIn.PROD_NAME || '')
        .input('PROD_KIND', filterIn.PROD_KIND || '')
        .input('DEP_ID', filterIn.DEP_ID || '')
        .input('IS_FLOAT_VAL', isFloatVal)
        .input('SELECT_ENABLE', selectEnable)
        .query(`
        SELECT
          p00.PROD_ID,
          p00.PROD_NAME1,
          p00.PROD_NAME2,
          pk.PROD_NAME AS PROD_KIND_NAME,
          d.DEP_NAME,
          u.UNIT_NAME,
          p00.DATE,
          p01.PRICE1,
          MAX(CASE WHEN t.NAME = '保養廠' THEN t.PRICE END) AS TASTE_CR,
          MAX(CASE WHEN t.NAME = '機車行' THEN t.PRICE END) AS TASTE_CRM,
          p01.PRICE1 + MAX(CASE WHEN t.NAME = '保養廠' THEN t.PRICE END) AS PRICE_CR,
          p01.PRICE1 + MAX(CASE WHEN t.NAME = '機車行' THEN t.PRICE END) AS PRICE_CRM,
          p00.TAX,
          p00.isfloat,
          p00.last_update,
          p01.isusepos,
          p01.ENABLE,
          p00.stock_type,
          p00.INV_TYPE
        FROM PRODUCT00 p00
        LEFT JOIN product01 p01 ON p00.PROD_ID = p01.PROD_ID
        LEFT JOIN prod_kind pk ON p00.PROD_KIND = pk.PROD_ID
        LEFT JOIN DEPARTMENT d ON p00.DEP_ID = d.DEP_ID
        LEFT JOIN unit u ON p00.UNIT = u.UNIT_ID
        LEFT JOIN PROD_TASTE pt ON p00.PROD_ID = pt.PROD_ID
        LEFT JOIN TASTE01 t ON pt.TASTE_ID = t.TASTE_ID
        
        WHERE 1 = 1
          AND (@PROD_ID = '' OR p00.PROD_ID LIKE '%' + @PROD_ID + '%')
          AND (@PROD_NAME = '' OR p00.PROD_NAME1 LIKE '%' + @PROD_NAME + '%' OR p00.PROD_NAME2 LIKE '%' + @PROD_NAME + '%')
          AND (@PROD_KIND = '' OR p00.PROD_KIND = @PROD_KIND)
          AND (@DEP_ID = '' OR p00.DEP_ID = @DEP_ID)
          
          -- 狀態篩選邏輯
          AND (
              @SELECT_ENABLE IN (2, 3, 4) 
              OR (@SELECT_ENABLE = 1 AND p01.ENABLE = 1)
              OR (@SELECT_ENABLE = 0 AND p01.ENABLE = 0)
          )
          AND (
              @SELECT_ENABLE IN (0, 1, 4) 
              OR (@SELECT_ENABLE = 2 AND p01.isusepos = 1)
              OR (@SELECT_ENABLE = 3 AND p01.isusepos = 0)
          )

          -- 使用處理過的數字進行判斷
          AND (@IS_FLOAT_VAL = -1 OR p00.isfloat = @IS_FLOAT_VAL)

        GROUP BY 
          p00.PROD_ID, p00.PROD_NAME1, p00.PROD_NAME2, pk.PROD_NAME,
          d.DEP_NAME, u.UNIT_NAME, p00.DATE, p01.PRICE1, p00.TAX,
          p00.isfloat, p00.last_update, p01.isusepos, p01.ENABLE,
          p00.stock_type, p00.INV_TYPE 
        ORDER BY p00.PROD_ID
      `)

      const prods = result.recordset.map(row => {
        const dateFields = ['DATE', 'last_update']
        dateFields.forEach(key => {
          if (row[key]) {
            const d = row[key].toISOString().replace('Z', '')
            row[key] = dayjs(d).format('YY-MM-DD HH:mm')
          }
        })
        return row
      })

      return { prods, totalCount: prods.length }

    } catch (err) {
      console.error('商品資料取得失敗：', err)
      throw err
    }
  },

  getProdQua: async (prodIds) => {

    try {
      const pool = await poolPromise
      const result = await pool.request()
        .query(`
               -- 宣告篩選條件
                DECLARE @ProdIdList NVARCHAR(MAX) = '${prodIds}' 

                DECLARE @inClause NVARCHAR(MAX) = ''
                DECLARE @isEmptyList BIT = 0 -- 新增布林變數來標記列表是否為空
                DECLARE @inCondition NVARCHAR(MAX) -- 用來存放 WHERE 條件

                IF ISNULL(@ProdIdList, '') != ''
                BEGIN
                    -- 將輸入字串轉為 IN 子句格式：('ID1','ID2',...)
                    SET @inClause = REPLACE(@ProdIdList, ',', ''',''')
                    SET @inClause = '(''' + @inClause + ''')'
                    SET @inCondition = ' PROD_ID IN ' + @inClause
                END
                ELSE
                BEGIN
                    -- 列表為空
                    SET @isEmptyList = 1
                    SET @inCondition = ' 1 = 1 ' -- 避免語法錯誤，設為無條件通過
                END

                -- 產生 SHOP_ID 欄位 (排除 TEST01、A)
                DECLARE @cols NVARCHAR(MAX) = ''
                DECLARE @sql  NVARCHAR(MAX) = ''

                SELECT @cols = STRING_AGG(QUOTENAME(SHOP_ID), ',')
                FROM (
                    SELECT DISTINCT SHOP_ID 
                    FROM PROD_QUANTITY
                    WHERE SHOP_ID NOT IN ('TEST01', 'A')
                ) AS x

                -- 檢查 @cols 是否為空，如果為空，則設為一個佔位符以防止 PIVOT 語法錯誤
                IF ISNULL(@cols, '') = ''
                BEGIN
                    SET @cols = 'NULL' -- 設置佔位符
                END

                -- PIVOT 查詢
                SET @sql = '
                    ;WITH base AS (
                        SELECT DISTINCT 
                            PROD_ID,
                            PROD_NAME1
                        FROM PRODUCT00
                        WHERE 1 = 1
                        -- ⬇️ 修正後的篩選邏輯：只在列表非空時應用 IN 條件 ⬇️
                        AND (
                              ' + CASE WHEN @isEmptyList = 1 THEN '1 = 1' ELSE @inCondition END + '
                        )
                    ),
                    pivotData AS (
                        SELECT *
                        FROM (
                            SELECT 
                                PROD_ID,
                                SHOP_ID,
                                QUANTITY
                            FROM PROD_QUANTITY
                            WHERE SHOP_ID NOT IN (''TEST01'', ''A'')
                        ) AS src
                        PIVOT (
                            MAX(QUANTITY) FOR SHOP_ID IN (' + @cols + ')
                        ) AS pvt
                    )
                    SELECT 
                        b.PROD_ID,
                        b.PROD_NAME1,
                        ' + @cols + '
                    FROM base b
                    LEFT JOIN pivotData pv
                        ON b.PROD_ID = pv.PROD_ID
                    ORDER BY b.PROD_ID
                '

                EXEC(@sql)
                `)

      const prodQuaList = result.recordset

      return { prodQuaList }

    } catch (err) {
      console.error('資料取得失敗：', err)
      throw err
    }
  },

  getExportData: async (prodIds) => {
    try {
      // 1. 強力清理：確保 ID 陣列是純粹的字串，且去除空白與重複
      const cleanIds = [...new Set(
        (Array.isArray(prodIds) ? prodIds : [])
          .map(id => String(id || '').trim())
          .filter(id => id.length > 0)
      )]

      // 如果沒有 ID，直接回傳空陣列，避免產生 IN () 的錯誤語法
      if (cleanIds.length === 0) return []

      const pool = await poolPromise
      const request = pool.request()

      // 2. 建立參數化查詢
      const inClause = cleanIds.map((id, index) => {
        const varName = `p${index}`
        // 依然使用參數化查詢來保證安全，但不顯式指定 sql.NVarChar
        request.input(varName, id)
        return `@${varName}`
      }).join(',')

      // 3. 加上 WITH (NOLOCK) 並優化 SQL 格式
      // 在 WHERE 條件前增加空格，並確保查詢語法在 2008 上絕對相容
      const query = `
      SELECT
        T1.PROD_ID,
        T1.PROD_NAME1,
        T1.PROD_NAME2,
        T2.DEP_NAME
      FROM
        dbo.PRODUCT00 AS T1 WITH (NOLOCK)
      INNER JOIN
        dbo.DEPARTMENT AS T2 WITH (NOLOCK)
      ON
        T1.DEP_ID = T2.DEP_ID
      WHERE
        T1.PROD_ID IN (${inClause})
    `
      const result = await request.query(query)
      return result.recordset

    } catch (err) {
      // 門市端出錯時，印出更精準的錯誤訊息
      console.error('SQL 執行錯誤:', err.message)
      throw err
    }
  },

  getProdList: async () => {
    try {
      const pool = await poolPromise
      const result = await pool.request()
        .query(`
          SELECT PROD_ID, PROD_NAME1 FROM PRODUCT00
        `)
      return result.recordset
    } catch (err) {
      console.error('資料取得失敗：', err)
      throw err
    }
  },

  getDepList: async () => {
    try {
      const pool = await poolPromise
      const result = await pool.request()
        .query(`
          SELECT DEP_ID, DEP_NAME FROM DEPARTMENT
        `)
      return result.recordset
    } catch (err) {
      console.error('資料取得失敗：', err)
      throw err
    }
  },

  getKindList: async () => {
    try {
      const pool = await poolPromise
      const result = await pool.request()
        .query(`
          SELECT PROD_ID, PROD_NAME
          FROM prod_kind
          WHERE stop_sale <> 1;
        `)
      return result.recordset
    } catch (err) {
      console.error('資料取得失敗：', err)
      throw err
    }
  }
}

module.exports = prodData
