// src/models/prodModel.js

const dayjs = require('dayjs')
const { poolPromise } = require('../config/db')

const prodData = {
  getAllProdData: async (filter) => {

    try {
      const pool = await poolPromise
      const result = await pool.request()
        .query(`
                -- 宣告篩選變數
                 DECLARE @ProdId        NVARCHAR(50)  = '${filter.PROD_ID}'
                 DECLARE @ProdName      NVARCHAR(100) = '${filter.PROD_NAME}' 
                 DECLARE @ProdKindId    NVARCHAR(50)  = '${filter.PROD_KIND}'
                 DECLARE @DepId         NVARCHAR(50)  = '${filter.DEP_ID}'
                 DECLARE @IsFloat       INT           = ${filter.isfloat ?? -1}
                 DECLARE @SelectEnable  INT           = ${filter.ENABLE ?? 1} 

                 SELECT
                     p00.PROD_ID,
                     p00.PROD_NAME1,
                     p00.PROD_NAME2,
                     pk.PROD_NAME AS PROD_KIND_NAME,
                     d.DEP_NAME,
                     u.UNIT_NAME,
                     p00.DATE,
                     p01.PRICE1,
                     -- 計算特定口味價格
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
                 LEFT JOIN product01 p01
                     ON p00.PROD_ID = p01.PROD_ID
                 LEFT JOIN prod_kind pk
                     ON p00.PROD_KIND = pk.PROD_ID
                 LEFT JOIN DEPARTMENT d
                     ON p00.DEP_ID = d.DEP_ID
                 LEFT JOIN unit u
                     ON p00.UNIT = u.UNIT_ID
                 LEFT JOIN PROD_TASTE pt
                     ON p00.PROD_ID = pt.PROD_ID
                 LEFT JOIN TASTE01 t
                     ON pt.TASTE_ID = t.TASTE_ID
                 WHERE 1 = 1
                     AND (@ProdId        = '' OR p00.PROD_ID LIKE '%' + @ProdId + '%')

                     -- PROD_NAME 同時篩選 PROD_NAME1 或 PROD_NAME2
                     AND (@ProdName      = '' OR p00.PROD_NAME1 LIKE '%' + @ProdName + '%' OR p00.PROD_NAME2 LIKE '%' + @ProdName + '%')
                     AND (@ProdKindId    = '' OR p00.PROD_KIND = @ProdKindId)
                     AND (@DepId         = '' OR p00.DEP_ID = @DepId)
                     
                     -- ** 複合邏輯：控制 p01.ENABLE 的篩選 **
                     AND (
                         @SelectEnable IN (2, 3, 4) -- 選擇 2, 3, 4 時，p01.ENABLE 不過濾
                         OR ( @SelectEnable = 1 AND p01.ENABLE = 1 )
                         OR ( @SelectEnable = 0 AND p01.ENABLE = 0 )
                     )
                     
                     -- ** 複合邏輯：控制 p01.isusepos 的篩選 **
                     AND (
                         @SelectEnable IN (0, 1, 4) -- 選擇 0, 1, 4 時，p01.isusepos 不過濾
                         OR ( @SelectEnable = 2 AND p01.isusepos = 1 )
                         OR ( @SelectEnable = 3 AND p01.isusepos = 0 )
                     )

                     -- ▲ isfloat 過濾：-1全部, 0=停用, 1=啟用
                     AND (
                             @IsFloat = -1
                             OR p00.isfloat = @IsFloat
                         )
                 GROUP BY 
                     p00.PROD_ID,
                     p00.PROD_NAME1,
                     p00.PROD_NAME2,
                     pk.PROD_NAME,
                     d.DEP_NAME,
                     u.UNIT_NAME,
                     p00.DATE,
                     p01.PRICE1, 
                     p00.TAX,
                     p00.isfloat,
                     p00.last_update,
                     p01.isusepos,
                     p01.ENABLE,
                     p00.stock_type,
                     p00.INV_TYPE 
                 ORDER BY
                     p00.PROD_ID
                `)

      const totalCount = result.recordset.length
      const prods = result.recordset.map(row => {
        const fields = ['DATE', 'last_update']
        fields.forEach(key => {
          if (row[key]) {
            const d = row[key].toISOString().replace('Z', '')
            row[key] = dayjs(d).format('YY-MM-DD HH:mm')
          }
        })
        return row
      })

      return { prods, totalCount }

    } catch (err) {
      console.error('資料取得失敗：', err)
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
      const pool = await poolPromise
      const request = pool.request()

      const inClause = prodIds.map((id, index) => {
        const varName = `prod${index}`
        request.input(varName, id)
        return `@${varName}`
      }).join(',')

      const result = await request.query(`
        SELECT
          T1.PROD_ID,       -- 產品編號
          T1.PROD_NAME1,    -- 【產品名稱1 (作為備援名稱)
          T1.PROD_NAME2,    -- 產品名稱2 (主要長名稱)
          T2.DEP_NAME       -- 部門名稱 (類別)
        FROM
          PRODUCT00 AS T1
        INNER JOIN
          DEPARTMENT AS T2
        ON
          T1.DEP_ID = T2.DEP_ID 
        WHERE
          T1.PROD_ID IN (${inClause}) 
      `)

      return result.recordset

    } catch (err) {
      console.error('資料取得失敗：', err)
      throw err // 重新拋出錯誤，讓呼叫方處理
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
          SELECT PROD_ID, PROD_NAME FROM prod_kind
        `)
      return result.recordset
    } catch (err) {
      console.error('資料取得失敗：', err)
      throw err
    }
  }
}

module.exports = prodData
