// src/models/saleModel.js

const dayjs = require('dayjs')
const { poolPromise } = require('../config/db')
const shopData = require('../models/shopModel')
const vipData = require('../models/vipModel')
const prodData = require('./prodModel')

function filterToCheck(list, filterValue, keyField, checkName, filterOut) {
  filterValue = filterValue || null
  let valueArray = []

  if (filterValue == null) {
    filterOut[keyField] = 'NULL'
    filterOut[`${keyField}_LIST`] = '(NULL)'
  } else {
    valueArray = Array.isArray(filterValue) ? filterValue : [filterValue]
    const indexStr = valueArray.map(v => `('${v}')`).join(',')
    filterOut[keyField] = "'next'"
    filterOut[`${keyField}_LIST`] = indexStr
  }

  list.forEach(item => {
    item.isCheck = valueArray.includes(item[checkName])
  })

  return filterOut
}

async function getLists() {
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

const saleData = {
  getAllSaleData: async (filterIn) => {

    const lists = await getLists()

    const now = dayjs().format('YYYY-MM-DD')
    if (!filterIn.SALE_DATE_S) filterIn.SALE_DATE_S = now
    if (!filterIn.SALE_DATE_E) filterIn.SALE_DATE_E = now

    const filter = {
      SHOP_ID: null,
      SHOP_ID_LIST: null,
      TYPE: null,
      TYPE_LIST: null,
      SALE_DATE_S: `'${filterIn.SALE_DATE_S}'` || 'NULL',
      SALE_DATE_E: `'${filterIn.SALE_DATE_E}T23:59:59'` || 'NULL',
      VIP_NAME: filterIn.VIP_NAME == '' ? 'NULL' : `'${filterIn.VIP_NAME}'`,
      VIP_ID: filterIn.VIP_ID == '' ? 'NULL' : `'${filterIn.VIP_ID}'`,
      vipgrp_id: filterIn.vipgrp_id == '' ? 'NULL' : `'${filterIn.vipgrp_id}'`,
      VIP_TEL: filterIn.VIP_TEL == '' ? 'NULL' : `'${filterIn.VIP_TEL}'`,
      vip_code: filterIn.vip_code == '' ? 'NULL' : `'${filterIn.vip_code}'`,
      buyer_number: filterIn.buyer_number == '' ? 'NULL' : `'${filterIn.buyer_number}'`,
      PAY_ID: filterIn.PAY_ID == '' ? 'NULL' : `'${filterIn.PAY_ID}'`,
      MEMO: filterIn.MEMO == '' ? 'NULL' : `'${filterIn.MEMO}'`,
      EXPORTED: filterIn.EXPORTED == '' ? 'NULL' : `'${filterIn.EXPORTED}'`,
      PROD_NAME1: filterIn.PROD_NAME1 == '' ? 'NULL' : `'${filterIn.PROD_NAME1}'`,
      DEP_NAME: filterIn.DEP_NAME == '' ? 'NULL' : `'${filterIn.DEP_NAME}'`,
      SALE_ID: filterIn.SALE_ID == '' ? 'NULL' : `'${filterIn.SALE_ID}'`,
      invo_no_b: filterIn.invo_no_b == '' ? 'NULL' : `'${filterIn.invo_no_b}'`,
      is_inv: filterIn.is_inv == '' ? '' : filterIn.is_inv == 'T' ? 'AND S0.invo_no_b IS NOT NULL' : 'AND S0.invo_no_b IS NULL'
    }

    // 多選處理
    await filterToCheck(lists.shop, filterIn.SHOP_ID, 'SHOP_ID', 'SHOP_ID', filter)
    await filterToCheck(lists.saleType, filterIn.TYPE, 'TYPE', 'TYPE_ID', filter)

    try {
      const pool = await poolPromise
      const result = await pool.request()
        .query(`
          DECLARE 
          @VIP_ID NVARCHAR(20) = ${filter.VIP_ID}, -- 貴賓編號 
          @VIP_NAME NVARCHAR(50) = ${filter.VIP_NAME}, -- 貴賓名稱 
          @vipgrp_id NVARCHAR(20) = ${filter.vipgrp_id}, -- 貴賓群組 
          @TELEPHONE NVARCHAR(20) = ${filter.VIP_TEL}, -- 電話 
          @MOBILE NVARCHAR(20) = ${filter.VIP_TEL}, -- 手機 
          @VIP_CODE NVARCHAR(20) = ${filter.vip_code}, -- 統一編號 
          @SALE_DATE_S DATETIME = ${filter.SALE_DATE_S}, -- 銷售起日 
          @SALE_DATE_E DATETIME = ${filter.SALE_DATE_E}, -- 銷售迄日 
          @SALE_ID NVARCHAR(20) = ${filter.SALE_ID}, -- 單據編號 
          @SHOP_ID NVARCHAR(MAX)= ${filter.SHOP_ID}, -- 銷貨分店 
          @MEMO NVARCHAR(100)= ${filter.MEMO}, -- 備註 
          @BUYER_NUMBER NVARCHAR(50) = ${filter.buyer_number}, -- 載具號碼 
          @INVO_NO_B NVARCHAR(20) = ${filter.invo_no_b}, -- 發票號碼 
          @EXPORTED NVARCHAR(1) = ${filter.EXPORTED}, -- 是否結算 
          @TYPE NVARCHAR(10) = ${filter.TYPE}, -- 單據類型 
          @PROD_NAME1 NVARCHAR(50) = ${filter.PROD_NAME1}, -- 商品名稱 
          @DEP_NAME NVARCHAR(50) = ${filter.DEP_NAME}, --商品類別名稱 
          @PAY_ID NVARCHAR(20) = ${filter.PAY_ID}; --付款方式ID 
          
          --多門市 table 變數 
          DECLARE 
          @SHOP_LIST TABLE(SHOP_ID NVARCHAR(20)); 
          INSERT INTO @SHOP_LIST VALUES ${filter.SHOP_ID_LIST}; 
          
          --單據類型 table 變數 
          DECLARE 
          @TYPE_LIST TABLE(TYPE NVARCHAR(20)); 
          INSERT INTO @TYPE_LIST VALUES ${filter.TYPE_LIST}; 
          
          SELECT 
          S0.SHOP_ID, 
          S0.SALE_ID, 
          S0.RETURNED_ID, 
          S0.SALE_DATE, 
          S0.TOT_SALES, 
          S0.TOT_EXTRA, 
          S0.TOT_DISCHARGE, 
          S0.TYPE, 
          S0.MEMO, 
          S0.EXPORTED, 
          S0.TOT_QUAN, 
          S0.CHANGE, 
          S0.CUST_CODE, 
          S0.invo_no_b, 
          S0.spec_memo, 
          S0.buyer_number, 
          S0.amount, 
          S2.PAY_ID, 
          PAY.PAY_NAME, 
          ( SELECT 
            S0.VIP_ID, 
            S0.vipgrp_id, 
            VG.vipgrp_name, 
            V.NAME, 
            V.TELEPHONE, 
            V.MOBILE 
            FOR JSON PATH, 
            WITHOUT_ARRAY_WRAPPER ) AS VIP, 
          ( SELECT 
           S1.SALE_SNO, 
           S1.PROD_ID, 
           PROD.PROD_NAME1, 
           PROD.DEP_ID, 
           D.DEP_NAME, 
           PROD.UNIT AS UNIT_ID, 
           U.UNIT_NAME, 
           S1.SALE_PRICE, 
           S1.QTY, 
           S1.ITEM_DISC, 
           S1.PROM_ID, 
           PROM.PROM_NAME, 
           S1.std_price, 
           S1.PRICE_TYPE, 
           S1.FREE_MEMO, 
           S1.TASTE_MEMO, 
           S1.SALE_PRICE * S1.QTY AS SUBTOTAL 
           FROM 
           SALE01 S1 
           LEFT JOIN PRODUCT00 PROD ON S1.PROD_ID = PROD.PROD_ID 
           LEFT JOIN DEPARTMENT D ON PROD.DEP_ID = D.DEP_ID 
           LEFT JOIN UNIT U ON PROD.UNIT = U.UNIT_ID 
           LEFT JOIN promotion00 PROM ON S1.PROM_ID = PROM.PROM_ID 
           WHERE 
           S1.SHOP_ID = S0.SHOP_ID 
           AND S1.SALE_ID = S0.SALE_ID 
           ORDER BY S1.SALE_SNO ASC 
           FOR JSON PATH ) AS PROD_LIST 
           FROM SALE00 S0 
           LEFT JOIN VIP00 V ON S0.VIP_ID = V.VIP_ID 
           LEFT JOIN vip_group00 VG ON S0.vipgrp_id = VG.vipgrp_id 
           LEFT JOIN SALE02 S2 ON S0.SHOP_ID = S2.SHOP_ID AND S0.SALE_ID = S2.SALE_ID 
           LEFT JOIN PAYMENT PAY ON S2.PAY_ID = PAY.PAY_ID 
           WHERE 
           S0.STATUS = '2' 
           AND S0.SHOP_ID NOT IN ('A', 'TEST01')

           ${filter.is_inv} 
               AND (@VIP_ID      IS NULL OR S0.VIP_ID      LIKE '%' + @VIP_ID + '%')
                AND (@VIP_NAME    IS NULL OR V.NAME         LIKE '%' + @VIP_NAME + '%')
                AND (@VIPGRP_ID   IS NULL OR S0.vipgrp_id   = @VIPGRP_ID)
                AND ((@TELEPHONE  IS NULL OR V.TELEPHONE    LIKE '%' + @TELEPHONE + '%')
                  OR (@MOBILE     IS NULL OR V.MOBILE      LIKE '%' + @MOBILE + '%'))
                AND (@VIP_CODE    IS NULL OR V.vip_code    LIKE '%' + @VIP_CODE + '%')
                AND (@SALE_DATE_S IS NULL OR S0.SALE_DATE >= @SALE_DATE_S)
                AND (@SALE_DATE_E IS NULL OR S0.SALE_DATE <= @SALE_DATE_E)
                AND (@SALE_ID     IS NULL OR S0.SALE_ID    LIKE '%' + @SALE_ID + '%')
                AND (@SHOP_ID     IS NULL OR S0.SHOP_ID IN(SELECT SHOP_ID FROM @SHOP_LIST))
                AND (
                      @MEMO IS NULL
                      OR S0.MEMO LIKE '%' + @MEMO + '%'
                      OR EXISTS (
                          SELECT 1
                          FROM SALE01 S1
                          WHERE S1.SHOP_ID = S0.SHOP_ID
                            AND S1.SALE_ID = S0.SALE_ID
                            AND S1.FREE_MEMO LIKE '%' + @MEMO + '%'
                      )
                    )
                AND (@BUYER_NUMBER IS NULL OR S0.buyer_number LIKE '%' + @BUYER_NUMBER + '%')
                AND (@INVO_NO_B   IS NULL OR S0.invo_no_b  LIKE '%' + @INVO_NO_B + '%')
                AND (@EXPORTED    IS NULL OR S0.EXPORTED  = @EXPORTED)
                AND (@TYPE        IS NULL OR S0.TYPE IN(SELECT TYPE FROM @TYPE_LIST))
                AND (@PROD_NAME1  IS NULL OR EXISTS(
                    SELECT 1
                    FROM SALE01 S1
                    JOIN PRODUCT00 P ON S1.PROD_ID = P.PROD_ID
                    WHERE S1.SHOP_ID = S0.SHOP_ID
                      AND S1.SALE_ID = S0.SALE_ID
                      AND P.PROD_NAME1 LIKE '%' + @PROD_NAME1 + '%'
                ))
                AND (@DEP_NAME IS NULL OR EXISTS(
                    SELECT 1
                    FROM SALE01 S1
                    JOIN PRODUCT00 P ON S1.PROD_ID = P.PROD_ID
                    JOIN DEPARTMENT D ON P.DEP_ID = D.DEP_ID
                    WHERE S1.SHOP_ID = S0.SHOP_ID
                      AND S1.SALE_ID = S0.SALE_ID
                      AND D.DEP_NAME LIKE '%' + @DEP_NAME + '%'
                ))
                AND (@PAY_ID IS NULL OR S2.PAY_ID = @PAY_ID)
            ORDER BY S0.SALE_DATE DESC;
              `)

      const sales = result.recordset

      for (const sale of sales) {
        const d = sale.SALE_DATE.toISOString().replace('Z', '');
        sale.SALE_DATE = dayjs(d).format('YY-MM-DD HH:mm');

        try { sale.VIP = JSON.parse(sale.VIP) } catch { }
        try { sale.PROD_LIST = JSON.parse(sale.PROD_LIST) } catch { }

        sale.PROD_COUNT = sale.PROD_LIST?.length || 0;
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
}

module.exports = saleData
