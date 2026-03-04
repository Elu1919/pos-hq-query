// src/models/vipModel.js

const dayjs = require('dayjs')
const { poolPromise } = require('../config/db')

const vipData = {
  getAllVipData: async (filterIn) => {
    try {
      const pool = await poolPromise

      // JS 層處理數值預設值
      const disabledOnly = parseInt(filterIn.onlyDisabled || 0)

      const result = await pool.request()
        .input('VIP_ID', filterIn.VIP_ID || '')
        .input('NAME', filterIn.NAME || '')
        .input('MEMO', filterIn.MEMO || '')
        .input('TELEPHONE', filterIn.TEL || '')
        .input('LINKMAN', filterIn.LINKMAN || '')
        .input('COMPANY', filterIn.COMPANY || '')
        .input('ADDRESS', filterIn.ADDRESS || '')
        .input('VIPGRP_ID', filterIn.vipgrp_id || '')
        .input('VIP_CODE', filterIn.vip_code || '')
        .input('APPLY_SHOP', filterIn.APPLY_SHOP || '')
        .input('DISABLED_ONLY', disabledOnly)
        .query(`
        /* 1. 主查詢邏輯 */
        SELECT
          v.VIP_ID,
          v.NAME,
          v.MEMO,
          v.ADDRESS,
          v.TELEPHONE,
          v.LINKMAN,
          v.EMAIL,
          v.MOBILE,
          v.COMPANY,
          v.COMPANY_ADDR,
          v.vipgrp_id,
          g.vipgrp_name,
          v.iccardno,
          v.vip_code,
          v.modify_date,
          v.last_update,
          v.APPLY_DATE,
          v.APPLY_SHOP
        FROM VIP00 v
        LEFT JOIN vip_group00 g ON v.vipgrp_id = g.vipgrp_id

        WHERE 1 = 1
          AND (@VIP_ID = '' OR v.VIP_ID LIKE '%' + @VIP_ID + '%')
          AND (@NAME = '' OR v.NAME LIKE '%' + @NAME + '%')

          -- MEMO + iccardno 模糊搜尋
          AND (
            @MEMO = '' 
            OR v.MEMO LIKE '%' + @MEMO + '%'
            OR v.iccardno LIKE '%' + @MEMO + '%'
          )

          -- 電話 + 手機 模糊搜尋
          AND (
            @TELEPHONE = '' 
            OR v.TELEPHONE LIKE '%' + @TELEPHONE + '%'
            OR v.MOBILE LIKE '%' + @TELEPHONE + '%'
          )

          AND (@LINKMAN = '' OR v.LINKMAN LIKE '%' + @LINKMAN + '%')
          AND (@COMPANY = '' OR v.COMPANY LIKE '%' + @COMPANY + '%')

          -- 住址 + 公司地址 模糊搜尋
          AND (
            @ADDRESS = ''
            OR v.ADDRESS LIKE '%' + @ADDRESS + '%'
            OR v.COMPANY_ADDR LIKE '%' + @ADDRESS + '%'
          )

          AND (@VIPGRP_ID = '' OR v.vipgrp_id = @VIPGRP_ID)
          AND (@VIP_CODE = '' OR v.vip_code LIKE '%' + @VIP_CODE + '%')
          AND (@APPLY_SHOP = '' OR v.APPLY_SHOP = @APPLY_SHOP)

          -- 停用狀態邏輯 (0 = 只看停用, 1 = 排除停用)
          AND (
            (@DISABLED_ONLY = 0 AND v.NAME LIKE '%停用%') 
            OR (@DISABLED_ONLY = 1 AND v.NAME NOT LIKE '%停用%')
          )

          -- 排除空號與測試帳號
          AND (
            (
              (v.VIP_ID LIKE 'CR%' OR v.VIP_ID LIKE 'B2B%' OR v.VIP_ID LIKE 'SALE%')
              AND v.VIP_ID <> v.NAME
            )
            OR
            (
              v.VIP_ID LIKE 'CUST%'
              AND v.CARD IS NOT NULL 
              AND (v.TELEPHONE IS NOT NULL OR v.MOBILE IS NOT NULL)
            )
          )
          AND v.VIP_ID NOT LIKE 'TEST%'

        ORDER BY v.VIP_ID
      `)

      const totalCount = result.recordset.length
      const vips = result.recordset.map(row => {
        // 統一處理日期欄位格式
        const dateFields = ['APPLY_DATE', 'modify_date', 'last_update']
        dateFields.forEach(key => {
          if (row[key]) {
            const d = row[key].toISOString().replace('Z', '')
            row[key] = dayjs(d).format('YY-MM-DD HH:mm')
          }
        })
        return row
      })

      return { vips, totalCount }

    } catch (err) {
      console.error('VIP 資料取得失敗：', err)
      throw err
    }
  },

  getVipList: async () => {
    try {
      const pool = await poolPromise
      const result = await pool.request()
        .query(`
          SELECT VIP_ID, NAME, COMPANY, LINKMAN
          FROM VIP00
          WHERE 
            (
              (( VIP_ID LIKE 'CR%' OR VIP_ID LIKE 'B2B%' OR VIP_ID LIKE 'SALE%') AND VIP_ID <> NAME )
              OR
              ( 
                VIP_ID LIKE 'CUST%' 
                AND CARD IS NOT NULL 
                AND (TELEPHONE IS NOT NULL OR MOBILE IS NOT NULL)
              )
            )
            AND VIP_ID NOT LIKE 'TEST%';
        `)
      return result.recordset
    } catch (err) {
      console.error('資料取得失敗：', err)
      throw err
    }
  },

  getVipGrpList: async () => {
    try {
      const pool = await poolPromise
      const result = await pool.request()
        .query(`
          SELECT vipgrp_id, vipgrp_name FROM vip_group00
        `)
      return result.recordset
    } catch (err) {
      console.error('資料取得失敗：', err)
      throw err
    }
  },

  getVipAmount: async () => {
    try {
      const pool = await poolPromise
      const result = await pool.request()
        .query(`
                WITH GroupRule AS (
                  SELECT 'CUST01' AS vipgrp_id, 'CARD' AS field_name, NULL AS empty_value
                  UNION ALL
                  SELECT 'CR0001', 'VIP_ID', NULL
                  UNION ALL
                  SELECT 'CRM001', 'VIP_ID', NULL
                  UNION ALL
                  SELECT 'B2B001', 'VIP_ID', NULL
                  UNION ALL
                  SELECT 'SALE01', 'VIP_ID', NULL
              )
              SELECT
                  g.vipgrp_id,
                  g.vipgrp_name,
                  CASE
                      WHEN g.vipgrp_id IN ('CR0001','CRM001') THEN SUBSTRING(v.VIP_ID, 3, 1)
                      ELSE v.APPLY_SHOP
                  END AS SHOP_ID,
                  COUNT(*) AS total,
                  SUM(
                      CASE
                          -- *** 這是修改後的 CUST01 已使用（used）邏輯 ***
                          WHEN gr.vipgrp_id = 'CUST01' 
                              AND v.CARD IS NOT NULL 
                              AND (v.TELEPHONE IS NOT NULL OR v.MOBILE IS NOT NULL) THEN 1
                          -- 其他群組的已使用邏輯不變
                          WHEN gr.vipgrp_id <> 'CUST01' AND v.VIP_ID <> v.NAME THEN 1
                          ELSE 0
                      END
                  ) AS used,
                  SUM(
                      CASE
                          -- CUST01 的空號（remaining）邏輯 (上次修改的版本)
                          WHEN gr.vipgrp_id = 'CUST01' 
                              AND v.CARD IS NULL 
                              AND v.TELEPHONE IS NULL 
                              AND v.MOBILE IS NULL THEN 1
                          -- 其他群組的空號（remaining）邏輯不變
                          WHEN gr.vipgrp_id <> 'CUST01' AND v.VIP_ID = v.NAME THEN 1
                          ELSE 0
                      END
                  ) AS remaining
              FROM VIP00 v
              INNER JOIN vip_group00 g
                  ON v.vipgrp_id = g.vipgrp_id
              INNER JOIN GroupRule gr
                  ON v.vipgrp_id = gr.vipgrp_id
              WHERE g.vipgrp_id IN ('CUST01','CR0001','CRM001','B2B001','SALE01')
              GROUP BY g.vipgrp_id, g.vipgrp_name,
                  CASE
                      WHEN g.vipgrp_id IN ('CR0001','CRM001') THEN SUBSTRING(v.VIP_ID, 3, 1)
                      ELSE v.APPLY_SHOP
                  END
              ORDER BY
                  CASE g.vipgrp_id
                      WHEN 'CUST01' THEN 1
                      WHEN 'CR0001' THEN 2
                      WHEN 'CRM001' THEN 3
                      WHEN 'B2B001' THEN 4
                      WHEN 'SALE01' THEN 5
                      ELSE 99
                  END,
                  SHOP_ID;
               `)
      return result.recordset
    } catch (err) {
      console.error('資料取得失敗：', err)
      throw err
    }
  },

  getExportData: async (vipIds) => {
    try {
      const pool = await poolPromise
      const request = pool.request()

      const inClause = vipIds.map((id, index) => {
        const varName = `vip${index}`
        request.input(varName, id)
        return `@${varName}`
      }).join(',')

      const result = await request.query(`
      SELECT VIP_ID, NAME, TELEPHONE, MOBILE
      FROM VIP00
      WHERE VIP_ID IN (${inClause})
    `)

      return result.recordset

    } catch (err) {
      console.error('資料取得失敗：', err)
      throw err
    }
  }
}

module.exports = vipData

