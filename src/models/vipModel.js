const dayjs = require('dayjs')
const { poolPromise } = require('../config/db')
const { calculatePagination } = require('../utils/pagination')

const vipData = {
  getAllVipData: async (filter) => {

    try {
      const pool = await poolPromise

      const result = await pool.request()
        .query(`
              DECLARE @VipId       NVARCHAR(50)  = '${filter.VIP_ID}'
              DECLARE @VipName     NVARCHAR(50)  = '${filter.NAME}'
              DECLARE @Memo        NVARCHAR(200) = '${filter.MEMO}'   
              DECLARE @Telephone   NVARCHAR(30)  = '${filter.TEL}'
              DECLARE @Linkman     NVARCHAR(50)  = '${filter.LINKMAN}'
              DECLARE @Company     NVARCHAR(100) = '${filter.COMPANY}'
              DECLARE @Address     NVARCHAR(200) = '${filter.ADDRESS}' 
              DECLARE @VipGrpId    NVARCHAR(50)  = '${filter.vipgrp_id}'
              DECLARE @VipCode     NVARCHAR(20)  = '${filter.vip_code}'
              DECLARE @ApplyShop   NVARCHAR(20)  = '${filter.APPLY_SHOP}'
              DECLARE @DisabledOnly BIT = ${filter.onlyDisabled || 0}   -- 0 = 只搜尋停用, 1 = 排除停用

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
              LEFT JOIN vip_group00 g
                  ON v.vipgrp_id = g.vipgrp_id

              WHERE 1 = 1
                  AND (@VipId      = '' OR v.VIP_ID LIKE '%' + @VipId + '%')
                  AND (@VipName    = '' OR v.NAME LIKE '%' + @VipName + '%')

                  -- MEMO + iccardno
                  AND (
                          @Memo = '' 
                          OR v.MEMO     LIKE '%' + @Memo + '%'
                          OR v.iccardno LIKE '%' + @Memo + '%'
                      )

                  -- 電話 + 手機
                  AND (
                          @Telephone = '' 
                          OR v.TELEPHONE LIKE '%' + @Telephone + '%'
                          OR v.MOBILE    LIKE '%' + @Telephone + '%'
                      )

                  AND (@Linkman    = '' OR v.LINKMAN LIKE '%' + @Linkman + '%')
                  AND (@Company    = '' OR v.COMPANY LIKE '%' + @Company + '%')

                  -- ADDRESS + COMPANY_ADDR
                  AND (
                          @Address = ''
                          OR v.ADDRESS       LIKE '%' + @Address + '%'
                          OR v.COMPANY_ADDR  LIKE '%' + @Address + '%'
                      )

                  AND (@VipGrpId = '' OR v.vipgrp_id = @VipGrpId)

                  AND (@VipCode    = '' OR v.vip_code LIKE '%' + @VipCode + '%')
                  AND (@ApplyShop  = '' OR v.APPLY_SHOP = @ApplyShop)

                  -- 排除停用
                  AND (
                          (@DisabledOnly = 0 AND v.NAME LIKE '%停用%') 
                          OR
                          (@DisabledOnly = 1 AND v.NAME NOT LIKE '%停用%')
                      )

                  -- 排除空號邏輯
                  AND (
                          (
                              (v.VIP_ID LIKE 'CR%' OR v.VIP_ID LIKE 'B2B%' OR v.VIP_ID LIKE 'SALE%')
                              AND v.VIP_ID <> v.NAME
                          )
                          OR
                          (
                              v.VIP_ID LIKE 'CUST%'
                              AND (v.TELEPHONE IS NOT NULL OR v.MOBILE IS NOT NULL)
                          )
                      )
                  AND v.VIP_ID NOT LIKE 'TEST%'

              ORDER BY v.VIP_ID
              `)

      const totalCount = result.recordset.length
      const vips = result.recordset.map(row => {
        const fields = ['APPLY_DATE', 'modify_date', 'last_update']
        fields.forEach(key => {
          if (row[key]) {
            const d = row[key].toISOString().replace('Z', '')
            row[key] = dayjs(d).format('YY-MM-DD HH:mm')
          }
        })
        return row
      })

      return { vips, totalCount }

    } catch (err) {
      console.error('資料取得失敗：', err)
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
              ( VIP_ID LIKE 'CUST%' AND (TELEPHONE IS NOT NULL OR MOBILE IS NOT NULL))
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
                            WHEN gr.vipgrp_id = 'CUST01' AND v.CARD IS NOT NULL THEN 1
                            WHEN gr.vipgrp_id <> 'CUST01' AND v.VIP_ID <> v.NAME THEN 1
                            ELSE 0
                        END
                    ) AS used,
                    SUM(
                        CASE
                            WHEN gr.vipgrp_id = 'CUST01' AND v.CARD IS NULL THEN 1
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

