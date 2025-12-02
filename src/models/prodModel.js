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
                DECLARE @ProdId      NVARCHAR(50)  = ''
                DECLARE @ProdName    NVARCHAR(100) = ''  -- 統一 PROD_NAME 篩選
                DECLARE @ProdKindId  NVARCHAR(50)  = ''
                DECLARE @DepId       NVARCHAR(50)  = ''
                DECLARE @OnlyUsePos  BIT           = 1
                DECLARE @IsFloat     BIT           = 0

                SELECT
                    p00.PROD_ID,
                    p00.PROD_NAME1,
                    p00.PROD_NAME2,
                    pk.PROD_NAME AS PROD_KIND_NAME,
                    d.DEP_NAME,
                    u.UNIT_NAME,
                    p00.DATE,
                    p00.PRICE1,
                    -- 計算特定口味價格
                    MAX(CASE WHEN t.NAME = '保養廠' THEN t.PRICE END) AS TASTE_CR,
                    MAX(CASE WHEN t.NAME = '機車行' THEN t.PRICE END) AS TASTE_CRM,
                    p00.PRICE1 + MAX(CASE WHEN t.NAME = '保養廠' THEN t.PRICE END) AS PRICE_CR,
                    p00.PRICE1 + MAX(CASE WHEN t.NAME = '機車行' THEN t.PRICE END) AS PRICE_CRM,
                    p00.TAX,
                    p00.isfloat,
                    p00.last_update,
                    p01.isusepos
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
                    AND (@ProdId      = '' OR p00.PROD_ID LIKE '%' + @ProdId + '%')
                    -- PROD_NAME 同時篩選 PROD_NAME1 或 PROD_NAME2
                    AND (@ProdName    = '' OR p00.PROD_NAME1 LIKE '%' + @ProdName + '%' OR p00.PROD_NAME2 LIKE '%' + @ProdName + '%')
                    AND (@ProdKindId  = '' OR p00.PROD_KIND = @ProdKindId)
                    AND (@DepId       = '' OR p00.DEP_ID = @DepId)
                    AND (
                            (@OnlyUsePos = 0) 
                            OR 
                            (@OnlyUsePos = 1 AND p01.isusepos = 1)
                        )
                    AND (@IsFloat = -1 OR p00.isfloat = @IsFloat)  -- 可篩選 isfloat
                GROUP BY 
                    p00.PROD_ID,
                    p00.PROD_NAME1,
                    p00.PROD_NAME2,
                    pk.PROD_NAME,
                    d.DEP_NAME,
                    u.UNIT_NAME,
                    p00.DATE,
                    p00.PRICE1,
                    p00.TAX,
                    p00.isfloat,
                    p00.last_update,
                    p01.isusepos
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
  }
}

module.exports = prodData
