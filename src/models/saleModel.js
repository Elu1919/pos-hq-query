// src/models/saleModel.js

const dayjs = require('dayjs')
const { poolPromise } = require('../config/db')
const shopData = require('../models/shopModel')
const vipData = require('../models/vipModel')
const prodData = require('./prodModel')

const markCheckStatus = (list, selectedValues, idField) => {
  if (!list || !Array.isArray(list)) return

  const valueArray = Array.isArray(selectedValues)
    ? selectedValues
    : (selectedValues ? [selectedValues] : [])

  list.forEach(item => {
    item.isCheck = valueArray.includes(item[idField]) ? 'T' : ''
  })
}

const saleData = {
  getAllSaleData: async (filterIn) => {
    try {
      const pool = await poolPromise
      const lists = await saleData.getLists()

      // 1. 參數標準化處理
      const sDate = (filterIn.SALE_DATE_S || '').toString()
      const eDate = (filterIn.SALE_DATE_E || '').toString()

      const shopIds = Array.isArray(filterIn.SHOP_ID)
        ? filterIn.SHOP_ID.join(',')
        : (filterIn.SHOP_ID || '').toString()

      const types = Array.isArray(filterIn.TYPE)
        ? filterIn.TYPE.join(',')
        : (filterIn.TYPE || '').toString()

      // 2. 抓取主表資料 (移除 FOR JSON，改為扁平化欄位)
      const result = await pool.request()
        .input('S_DATE_VAL', sDate)
        .input('E_DATE_VAL', eDate)
        .input('SHOP_IDS_VAL', shopIds)
        .input('TYPE_VAL', types)
        .input('VIP_ID', filterIn.VIP_ID || '')
        .input('VIP_NAME', filterIn.VIP_NAME || '')
        .input('VIP_GRP', filterIn.vipgrp_id || '')
        .input('VIP_TEL', filterIn.VIP_TEL || '')
        .input('VIP_CODE', filterIn.vip_code || '')
        .input('SALE_ID', filterIn.SALE_ID || '')
        .input('MEMO', filterIn.MEMO || '')
        .input('BUYER_NUM', filterIn.buyer_number || '')
        .input('INVO_NO', filterIn.invo_no_b || '')
        .input('EXPORTED', filterIn.EXPORTED || '')
        .input('PROD_NAME', filterIn.PROD_NAME1 || '')
        .input('DEP_NAME', filterIn.DEP_NAME || '')
        .input('PAY_ID', filterIn.PAY_ID || '')
        .input('IS_INV_FILTER', filterIn.is_inv || '')
        .query(`
          /* 初始化變數並處理日期 (相容 SQL 2008 R2) */
          DECLARE @S_DT NVARCHAR(10) = @S_DATE_VAL
          DECLARE @E_DT NVARCHAR(10) = @E_DATE_VAL
          DECLARE @S_IDS NVARCHAR(MAX) = @SHOP_IDS_VAL
          DECLARE @T_IDS NVARCHAR(MAX) = @TYPE_VAL

          DECLARE @S_DATE DATETIME = CASE WHEN ISDATE(@S_DT) = 1 THEN CAST(@S_DT AS DATETIME) ELSE CAST(CONVERT(VARCHAR(10), GETDATE(), 120) AS DATETIME) END
          DECLARE @E_DATE DATETIME = CASE WHEN ISDATE(@E_DT) = 1 THEN CAST(@E_DT AS DATETIME) ELSE CAST(CONVERT(VARCHAR(10), GETDATE(), 120) AS DATETIME) END

          DECLARE @ShopXml XML = CAST('<r><v>' + REPLACE(CAST(@S_IDS AS NVARCHAR(MAX)), ',', '</v><v>') + '</v></r>' AS XML)
          DECLARE @TypeXml XML = CAST('<r><v>' + REPLACE(CAST(@T_IDS AS NVARCHAR(MAX)), ',', '</v><v>') + '</v></r>' AS XML)

          SELECT 
            S0.SHOP_ID, S0.SALE_ID, S0.RETURNED_ID, S0.SALE_DATE, S0.TOT_SALES, 
            S0.TOT_EXTRA, S0.TOT_DISCHARGE, S0.TYPE, S0.MEMO, S0.EXPORTED, 
            S0.TOT_QUAN, S0.CHANGE, S0.CUST_CODE, S0.invo_no_b, S0.spec_memo, 
            S0.buyer_number, S0.amount, S2.PAY_ID, PAY.PAY_NAME,
            -- VIP 資訊扁平取出
            S0.VIP_ID, S0.vipgrp_id, VG.vipgrp_name, V.NAME, V.TELEPHONE, V.MOBILE
          FROM SALE00 S0 
          LEFT JOIN VIP00 V ON S0.VIP_ID = V.VIP_ID 
          LEFT JOIN vip_group00 VG ON S0.vipgrp_id = VG.vipgrp_id 
          LEFT JOIN SALE02 S2 ON S0.SHOP_ID = S2.SHOP_ID AND S0.SALE_ID = S2.SALE_ID 
          LEFT JOIN PAYMENT PAY ON S2.PAY_ID = PAY.PAY_ID 
          WHERE S0.STATUS = '2' 
          --AND S0.SHOP_ID NOT IN ('A', 'TEST01')

          /* 過濾條件區 (與原邏輯完全一致) */
          AND (S0.SALE_DATE >= @S_DATE AND S0.SALE_DATE < DATEADD(DAY, 1, @E_DATE))
          AND (@S_IDS = '' OR S0.SHOP_ID IN (SELECT t.v.value('.', 'NVARCHAR(50)') FROM @ShopXml.nodes('/r/v') AS t(v)))
          AND (@T_IDS = '' OR S0.TYPE IN (SELECT t.v.value('.', 'NVARCHAR(50)') FROM @TypeXml.nodes('/r/v') AS t(v)))
          AND (
            @IS_INV_FILTER = '' 
            OR (@IS_INV_FILTER = 'T' AND S0.invo_no_b IS NOT NULL)
            OR (@IS_INV_FILTER = 'F' AND S0.invo_no_b IS NULL)
          )
          AND (@VIP_ID = '' OR S0.VIP_ID LIKE '%' + @VIP_ID + '%')
          AND (@VIP_NAME = '' OR V.NAME LIKE '%' + @VIP_NAME + '%')
          AND (@VIP_GRP = '' OR S0.vipgrp_id = @VIP_GRP)
          AND (@VIP_TEL = '' OR (V.TELEPHONE LIKE '%' + @VIP_TEL + '%' OR V.MOBILE LIKE '%' + @VIP_TEL + '%'))
          AND (@VIP_CODE = '' OR V.vip_code LIKE '%' + @VIP_CODE + '%')
          AND (@SALE_ID = '' OR S0.SALE_ID LIKE '%' + @SALE_ID + '%')
          AND (@BUYER_NUM = '' OR S0.buyer_number LIKE '%' + @BUYER_NUM + '%')
          AND (@INVO_NO = '' OR S0.invo_no_b LIKE '%' + @INVO_NO + '%')
          AND (@EXPORTED = '' OR S0.EXPORTED = @EXPORTED)
          AND (@PAY_ID = '' OR S2.PAY_ID = @PAY_ID)
          AND (@MEMO = '' OR (
            S0.MEMO LIKE '%' + @MEMO + '%' OR 
            EXISTS (SELECT 1 FROM SALE01 S1 WHERE S1.SHOP_ID = S0.SHOP_ID AND S1.SALE_ID = S0.SALE_ID AND S1.FREE_MEMO LIKE '%' + @MEMO + '%')
          ))
          AND (@PROD_NAME = '' OR EXISTS (
            SELECT 1 FROM SALE01 S1 JOIN PRODUCT00 P ON S1.PROD_ID = P.PROD_ID 
            WHERE S1.SHOP_ID = S0.SHOP_ID AND S1.SALE_ID = S0.SALE_ID AND P.PROD_NAME1 LIKE '%' + @PROD_NAME + '%'
          ))
          AND (@DEP_NAME = '' OR EXISTS (
            SELECT 1 FROM SALE01 S1 JOIN PRODUCT00 P ON S1.PROD_ID = P.PROD_ID JOIN DEPARTMENT D ON P.DEP_ID = D.DEP_ID
            WHERE S1.SHOP_ID = S0.SHOP_ID AND S1.SALE_ID = S0.SALE_ID AND D.DEP_NAME LIKE '%' + @DEP_NAME + '%'
          ))

          ORDER BY S0.SALE_DATE DESC
        `)

      const sales = result.recordset
      if (sales.length === 0) return [[], lists]

      // 3. 抓取對應的明細 (只抓主表有的 SaleID)
      const saleIds = sales.map(s => `'${s.SALE_ID}'`).join(',')
      const detailResult = await pool.request()
        .query(`
          SELECT 
            S1.SALE_ID, S1.SHOP_ID, S1.SALE_SNO, S1.PROD_ID, PROD.PROD_NAME1, PROD.DEP_ID, D.DEP_NAME, 
            PROD.UNIT AS UNIT_ID, U.UNIT_NAME, S1.SALE_PRICE, S1.QTY, S1.ITEM_DISC, 
            S1.PROM_ID, PROM.PROM_NAME, S1.std_price, S1.PRICE_TYPE, S1.FREE_MEMO, 
            S1.TASTE_MEMO, S1.SALE_PRICE * S1.QTY AS SUBTOTAL 
          FROM SALE01 S1 
          LEFT JOIN PRODUCT00 PROD ON S1.PROD_ID = PROD.PROD_ID 
          LEFT JOIN DEPARTMENT D ON PROD.DEP_ID = D.DEP_ID 
          LEFT JOIN UNIT U ON PROD.UNIT = U.UNIT_ID 
          LEFT JOIN promotion00 PROM ON S1.PROM_ID = PROM.PROM_ID 
          WHERE S1.SALE_ID IN (${saleIds})
          ORDER BY S1.SALE_SNO ASC
        `)
      const allDetails = detailResult.recordset

      // 4. 效能優化：使用 Map 預處理明細對照表
      const detailsMap = {}
      allDetails.forEach(d => {
        const key = `${d.SHOP_ID}_${d.SALE_ID}`
        if (!detailsMap[key]) detailsMap[key] = []
        detailsMap[key].push(d)
      })

      markCheckStatus(lists.shop, filterIn.SHOP_ID, 'SHOP_ID')
      markCheckStatus(lists.saleType, filterIn.TYPE, 'TYPE_ID')

      // 5. 資料組裝 (維持原輸出變數名稱)
      for (const sale of sales) {
        // 處理日期格式
        const d = sale.SALE_DATE ? sale.SALE_DATE.toISOString().replace('Z', '') : null
        sale.SALE_DATE = d ? dayjs(d).format('YY-MM-DD HH:mm') : ''

        // 組裝 VIP 物件 (與 JSON 原結構一致)
        sale.VIP = {
          VIP_ID: sale.VIP_ID,
          vipgrp_id: sale.vipgrp_id,
          vipgrp_name: sale.vipgrp_name,
          NAME: sale.NAME,
          TELEPHONE: sale.TELEPHONE,
          MOBILE: sale.MOBILE
        }

        // 從 Map 快速取得該單明細
        const key = `${sale.SHOP_ID}_${sale.SALE_ID}`
        sale.PROD_LIST = detailsMap[key] || []
        sale.PROD_COUNT = sale.PROD_LIST.length

        // 清理暫存欄位，確保輸出乾淨
        delete sale.NAME
        delete sale.TELEPHONE
        delete sale.MOBILE
        delete sale.vipgrp_name
      }

      return [sales, lists]

    } catch (err) {
      console.error('資料取得失敗：', err)
      throw err
    }
  },

  getPayList: async () => {
    try {
      const pool = await poolPromise
      const result = await pool.request()
        .query(`
          SELECT PAY_ID, PAY_NAME FROM PAYMENT
          WHERE PAY_MEMO = '前台顯示中'
            OR PAY_ID IN('Z', 'Z1')
        `)
      return result.recordset
    } catch (err) {
      console.error('資料取得失敗：', err)
      throw err
    }
  },

  getSaleTypeList: async () => {
    try {
      const saleType = [
        { TYPE_ID: '0', TYPE_NAME: '銷貨單' },
        { TYPE_ID: '1', TYPE_NAME: '銷退單' },
        { TYPE_ID: '2', TYPE_NAME: '被銷退單' }
      ]
      return saleType
    } catch (err) {
      console.error('資料取得失敗：', err)
      throw err
    }
  },

  getLists: async () => {
    try {
      const [shop, vip, vipgrp, pay, saleType, prod, dep] = await Promise.all([
        shopData.getShopList(),
        vipData.getVipList(),
        vipData.getVipGrpList(),
        saleData.getPayList(),
        saleData.getSaleTypeList(),
        prodData.getProdList(),
        prodData.getDepList(),
      ])

      return { saleType, shop, vip, vipgrp, pay, prod, dep }

    } catch (err) {
      console.error('❌ 抓取清單資料失敗：', err)
      throw err
    }
  }
}

module.exports = saleData
