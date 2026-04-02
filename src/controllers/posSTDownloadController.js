// src/controller/posDataController.js

const ExcelJS = require('exceljs')
const dayjs = require('dayjs')

const shopData = require('../models/shopModel')
const downloadData = require('../models/downloadModel')
const vipData = require('../models/vipModel')

const posDataController = {
  showDataDownloadPage: async (req, res) => {
    try {
      const [shop, vipGrp] = await Promise.all([
        shopData.getShopList(),
        vipData.getVipGrpList(),
      ])
      res.render('posSTDownload', { shop, vipGrp })
    } catch (err) {
      console.error('❌ 畫面載入失敗', err)
      res.status(500).send('畫面載入失敗')
    }
  },
  downloadPerformanceData: async (req, res) => {
    const CONFIG = {
      DEFAULT_FONT: '微軟正黑體',
      ROW_HEIGHT_DEF: 22,
      ROW_HEIGHT_STAT: 17,
      UNIT_CONVERSION: 5.5,
      INCH_TO_CM: 2.54,
      COLOR_BLACK: 'FF000000',
      COLOR_WHITE: 'FFFFFFFF',
      COLOR_GRAY: 'FFD9D9D9',
      COLOR_RED: 'FFFF0000',
      INDENT_LEFT: 0.5,
      INDENT_RIGHT: 0.5,
      MARGIN_TOP: 1.3,
      MARGIN_BOTTOM: 1.3,
      MARGIN_LEFT: 0.3,
      MARGIN_RIGHT: 0.3,
      MARGIN_HEADER: 0.5,
      MARGIN_FOOTER: 0.5
    }

    const PAGE_LIMITS = {
      TOTAL_PAGE_CM: 19.0,
      ROW_DETAIL_CM: 0.77,
      ROW_STAT_CM: 0.6,
      STAT_TABLE_TOTAL_CM: (0.6 * 8) + 0.77,
      HEADER_AREA_CM: 0.77 * 2
    }

    const LINE_BREAK_CONFIG = {
      VIP_NAME: 3.6,
      PROD_NAME: 6.4,
      MEMO: 2.7,
      CHAR_WEIGHT_FULL: 0.4,
      CHAR_WEIGHT_HALF: 0.2,
      SENSITIVITY: 0.95
    }

    const COL_WIDTHS = [
      { col: 1, cm: 2.2 }, { col: 2, cm: 0.9 }, { col: 3, cm: 0.9 }, { col: 4, cm: 0.9 }, { col: 5, cm: 0.9 },
      { col: 6, cm: 0.8 }, { col: 7, cm: 0.8 }, { col: 8, cm: 0.9 }, { col: 9, cm: 0.9 }, { col: 10, cm: 0.9 },
      { col: 11, cm: 0.9 }, { col: 12, cm: 0.9 }, { col: 13, cm: 0.9 }, { col: 14, cm: 1 }, { col: 15, cm: 1.3 },
      { col: 16, cm: 1.3 }, { col: 17, cm: 1.5 }, { col: 18, cm: 1.5 }, { col: 19, cm: 1.5 }, { col: 20, cm: 1.5 },
      { col: 21, cm: 2.7 }, { col: 22, cm: 2.7 }, { col: 23, cm: 1 }
    ]

    const STYLES = {
      FONT_NORMAL: { name: CONFIG.DEFAULT_FONT, size: 11 },
      FONT_NORMAL_10: { name: CONFIG.DEFAULT_FONT, size: 10 },
      FONT_NORMAL_8: { name: CONFIG.DEFAULT_FONT, size: 8 },
      FONT_RED_BOLD: { name: CONFIG.DEFAULT_FONT, size: 11, bold: true, color: { argb: CONFIG.COLOR_RED } },
      FONT_WHITE_BOLD: { name: CONFIG.DEFAULT_FONT, size: 11, bold: true, color: { argb: CONFIG.COLOR_WHITE } },
      FONT_BLACK_BOLD: { name: CONFIG.DEFAULT_FONT, size: 11, bold: true, color: { argb: CONFIG.COLOR_BLACK } },
      FILL_BLACK: { type: 'pattern', pattern: 'solid', fgColor: { argb: CONFIG.COLOR_BLACK } },
      FILL_GRAY: { type: 'pattern', pattern: 'solid', fgColor: { argb: CONFIG.COLOR_GRAY } },
      BORDER: {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      }
    }

    const DETAIL_MERGE_CONFIGS = [
      { start: 2, end: 5, label: '貴賓' },
      { start: 6, end: 7, label: '類型' },
      { start: 8, end: 14, label: '品項' }
    ]

    // --- 輔助工具函數 ---
    const calculateLines = (text, targetCm) => {
      if (!text) return 1
      const lines = text.toString().split('\n')
      let totalLines = 0
      lines.forEach(line => {
        let vLen = 0
        for (let i = 0; i < line.length; i++) {
          vLen += line.charCodeAt(i) > 255 ? LINE_BREAK_CONFIG.CHAR_WEIGHT_FULL : LINE_BREAK_CONFIG.CHAR_WEIGHT_HALF
        }
        totalLines += Math.ceil(vLen / (targetCm * LINE_BREAK_CONFIG.SENSITIVITY)) || 1
      })
      return totalLines
    }

    const cleanRow = (ws, r) => {
      const row = ws.getRow(r)
      row.values = []
      for (let c = 1; c <= 23; c++) {
        const cell = ws.getCell(r, c)
        if (cell.isMerged) cell.master = cell
        cell.fill = { type: 'pattern', pattern: 'none' }
        cell.border = {}
        cell.alignment = { vertical: 'middle', wrapText: true }
      }
    }

    const safeMerge = (ws, r, c1, r2, c2) => {
      try {
        const cell = ws.getCell(r, c1)
        if (cell.master.address === cell.address) {
          ws.mergeCells(r, c1, r2, c2)
        }
        ws.getCell(r, c1).alignment = { ...ws.getCell(r, c1).alignment, vertical: 'middle' }
      } catch (e) {
        console.warn(`Merge skip at Row ${r}:`, e.message)
      }
    }

    const setInfoRowStyle = (row) => {
      row.height = CONFIG.ROW_HEIGHT_DEF
      row.getCell(1).value = '銷貨門市:'
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', wrapText: false }
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left', wrapText: false }
      row.getCell(7).value = '業績日期:'
      row.getCell(7).alignment = { vertical: 'middle', horizontal: 'right', wrapText: false }
      row.getCell(8).alignment = { vertical: 'middle', horizontal: 'left', wrapText: false }
    }

    const printDetailHeader = (ws, startIdx, shopName, filterIn, showInfo = true) => {
      let headRowIdx = startIdx
      if (showInfo) {
        cleanRow(ws, startIdx)
        const rowInfo = ws.getRow(startIdx)
        setInfoRowStyle(rowInfo)
        rowInfo.getCell(2).value = shopName
        rowInfo.getCell(8).value = `${filterIn.SALE_DATE_S} ~ ${filterIn.SALE_DATE_E}`
        headRowIdx = startIdx + 1
      }
      cleanRow(ws, headRowIdx)
      const labels = { 1: '日期', 15: '數量', 16: '單位', 17: '加值', 18: '單價', 19: '總折讓', 20: '小計', 21: '招待備註', 22: '結帳方式', 23: '發票' }
      const rowHead = ws.getRow(headRowIdx)
      rowHead.height = CONFIG.ROW_HEIGHT_DEF
      for (let c = 1; c <= 23; c++) {
        const cell = rowHead.getCell(c)
        cell.fill = STYLES.FILL_BLACK; cell.font = STYLES.FONT_WHITE_BOLD; cell.border = STYLES.BORDER
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        if (labels[c]) cell.value = labels[c]
      }
      DETAIL_MERGE_CONFIGS.forEach(m => {
        safeMerge(ws, headRowIdx, m.start, headRowIdx, m.end)
        const cell = ws.getCell(headRowIdx, m.start)
        cell.value = m.label
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      })
      return headRowIdx + 1
    }

    // --- 對照配置 ---
    const PAY_MAPPING = [
      { name: '現金', rowOffset: 2, payIds: ['1'] },
      { name: '信用卡', rowOffset: 3, payIds: ['4', '5'] },
      { name: 'LINE PAY', rowOffset: 4, payIds: ['H'] },
      { name: 'iPASS MONEY', rowOffset: 5, payIds: ['O', 'OP13'] },
      { name: '賒帳', rowOffset: 6, payIds: ['Z', 'Z1'] }
    ]

    const GRP_MAPPING = [
      { id: 'CUST01', col: 2, isDefault: true }, // 標記門市客為預設分類
      { id: 'CR0001', col: 4 },
      { id: 'CRM001', col: 6 },
      { id: 'SALE01', col: 8 },
      { id: 'B2B001', col: 10 }
    ]

    const GROUP_CONFIGS = [
      { id: 'CUST01', label: '門市客', isDefault: true },
      { id: 'CR0001', label: '保養廠' },
      { id: 'CRM001', label: '機車行' },
      { id: 'SALE01', label: '業務' },
      { id: 'B2B001', label: '盤商' }
    ]

    try {
      const filterIn = { ...req.body }
      const todayStr = dayjs().format('YYYY-MM-DD')
      filterIn.SALE_DATE_S = filterIn.SALE_DATE_S ? dayjs(filterIn.SALE_DATE_S).format('YYYY-MM-DD') : todayStr
      filterIn.SALE_DATE_E = filterIn.SALE_DATE_E ? dayjs(filterIn.SALE_DATE_E).format('YYYY-MM-DD') : todayStr

      const data = await downloadData.posStPerformance(filterIn)
      if (!data || data.length === 0) return res.status(404).send('查無資料')

      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('門市業績表')
      ws.pageSetup.paperSize = 9
      ws.pageSetup.orientation = 'landscape'
      ws.pageSetup.fitToPage = true
      ws.pageSetup.fitToWidth = 1
      ws.pageSetup.fitToHeight = 0
      ws.pageSetup.margins = {
        top: CONFIG.MARGIN_TOP / CONFIG.INCH_TO_CM, bottom: CONFIG.MARGIN_BOTTOM / CONFIG.INCH_TO_CM,
        left: CONFIG.MARGIN_LEFT / CONFIG.INCH_TO_CM, right: CONFIG.MARGIN_RIGHT / CONFIG.INCH_TO_CM,
        header: CONFIG.MARGIN_HEADER / CONFIG.INCH_TO_CM, footer: CONFIG.MARGIN_FOOTER / CONFIG.INCH_TO_CM
      }

      const printTime = dayjs().format('YYYY-MM-DD HH:mm')
      ws.headerFooter.oddHeader = `&L&14&"${CONFIG.DEFAULT_FONT},Bold"門市業績表&R&11&"${CONFIG.DEFAULT_FONT}"列印時間：${printTime}`
      ws.headerFooter.oddFooter = `&C&11&"${CONFIG.DEFAULT_FONT}"第 &P 頁，共 &N 頁`

      ws.properties.defaultRowHeight = CONFIG.ROW_HEIGHT_DEF
      COL_WIDTHS.forEach(item => {
        const col = ws.getColumn(item.col); col.width = item.cm * CONFIG.UNIT_CONVERSION; col.font = STYLES.FONT_NORMAL
      })

      const shops = [...new Set(data.map(d => d.SHOP_NAME))]
      let currentRow = 1

      for (let i = 0; i < shops.length; i++) {
        const shopName = shops[i]
        const shopData = data.filter(d => d.SHOP_NAME === shopName)
        const pageStart = currentRow

        // --- 1. 統計表資訊列 ---
        cleanRow(ws, pageStart)
        const rowInfoTop = ws.getRow(pageStart)
        setInfoRowStyle(rowInfoTop)
        rowInfoTop.getCell(2).value = shopName
        rowInfoTop.getCell(8).value = `${filterIn.SALE_DATE_S} ~ ${filterIn.SALE_DATE_E}`

        // 統計表標頭
        const statHIdx = pageStart + 1
        cleanRow(ws, statHIdx)
        const statHeaderRow = ws.getRow(statHIdx)
        statHeaderRow.height = CONFIG.ROW_HEIGHT_STAT
        const statHeaders = [{ c: 1, v: '業績統計' }, { c: 2, v: '門市客' }, { c: 4, v: '保養廠' }, { c: 6, v: '機車行' }, { c: 8, v: '業務' }, { c: 10, v: '盤商' }, { c: 12, v: '合計' }]
        statHeaders.forEach(h => {
          const cell = statHeaderRow.getCell(h.c); cell.value = h.v
          if (h.c >= 2) safeMerge(ws, statHIdx, h.c, statHIdx, h.c + 1)
          cell.fill = STYLES.FILL_BLACK; cell.font = STYLES.FONT_WHITE_BOLD; cell.border = STYLES.BORDER; cell.alignment = { horizontal: 'center', vertical: 'middle' }
        })

        // 統計表內容渲染 (處理散客歸類)
        let groupTotals = {}
        PAY_MAPPING.forEach(p => {
          const rIdx = pageStart + p.rowOffset
          cleanRow(ws, rIdx)
          const row = ws.getRow(rIdx)
          row.height = CONFIG.ROW_HEIGHT_STAT
          row.getCell(1).value = p.name; row.getCell(1).border = STYLES.BORDER
          row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', indent: CONFIG.INDENT_LEFT, wrapText: false }
          row.getCell(1).font = p.name === 'iPASS MONEY' ? STYLES.FONT_NORMAL_8 : STYLES.FONT_NORMAL

          let rSum = 0
          GRP_MAPPING.forEach(g => {
            const val = shopData.filter(d => {
              const gid = (d.VIPGRP_ID || '').toString().trim()
              const isMatchPay = p.payIds.includes(d.PAY_ID) && d.PAY_ID !== '6'
              if (g.isDefault) {
                // 門市客包含 ID 為空或 CUST01 的單據
                return isMatchPay && (gid === 'CUST01' || gid === '')
              }
              return isMatchPay && gid === g.id
            }).reduce((acc, cur) => acc + (Number(cur.TOTAL) || 0), 0)

            safeMerge(ws, rIdx, g.col, rIdx, g.col + 1)
            const cell = row.getCell(g.col); cell.value = val; cell.border = STYLES.BORDER
            cell.alignment = { horizontal: 'right', vertical: 'middle', indent: CONFIG.INDENT_RIGHT, wrapText: false }
            rSum += val; groupTotals[g.id] = (groupTotals[g.id] || 0) + val
          })
          safeMerge(ws, rIdx, 12, rIdx, 13)
          row.getCell(12).value = rSum; row.getCell(12).border = STYLES.BORDER; row.getCell(12).alignment = { horizontal: 'right', vertical: 'middle', indent: CONFIG.INDENT_RIGHT, wrapText: false }
        })

        // 總計列
        const totalIdx = pageStart + 7
        cleanRow(ws, totalIdx)
        const tRow = ws.getRow(totalIdx)
        tRow.height = CONFIG.ROW_HEIGHT_STAT
        tRow.getCell(1).value = '總計'; tRow.getCell(1).font = STYLES.FONT_RED_BOLD; tRow.getCell(1).border = STYLES.BORDER; tRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', indent: CONFIG.INDENT_LEFT, wrapText: false }
        let gTotal = 0
        GRP_MAPPING.forEach(g => {
          safeMerge(ws, totalIdx, g.col, totalIdx, g.col + 1)
          const cell = tRow.getCell(g.col); cell.value = groupTotals[g.id] || 0; cell.font = STYLES.FONT_RED_BOLD; cell.border = STYLES.BORDER; cell.alignment = { horizontal: 'right', vertical: 'middle', indent: CONFIG.INDENT_RIGHT, wrapText: false }
          gTotal += (groupTotals[g.id] || 0)
        })
        safeMerge(ws, totalIdx, 12, totalIdx, 13)
        tRow.getCell(12).value = gTotal; tRow.getCell(12).font = STYLES.FONT_RED_BOLD; tRow.getCell(12).border = STYLES.BORDER; tRow.getCell(12).alignment = { horizontal: 'right', vertical: 'middle', indent: CONFIG.INDENT_RIGHT, wrapText: false }

        // --- 2. 明細初始化 ---
        let detIdx = printDetailHeader(ws, pageStart + 9, shopName, filterIn, false)
        let currentCMCounter = PAGE_LIMITS.STAT_TABLE_TOTAL_CM
        let currentPageLimit = PAGE_LIMITS.TOTAL_PAGE_CM

        // --- 3. 明細內容渲染 (處理散客歸類) ---
        for (const grp of GROUP_CONFIGS) {
          const items = shopData.filter(d => {
            const gid = (d.VIPGRP_ID || '').toString().trim()
            if (grp.isDefault) {
              return (gid === 'CUST01' || gid === '') && d.PAY_ID !== '6'
            }
            return gid === grp.id && d.PAY_ID !== '6'
          })

          if (items.length === 0) continue

          // 檢查分頁
          if (currentCMCounter + PAGE_LIMITS.ROW_DETAIL_CM > currentPageLimit) {
            ws.getRow(detIdx - 1).addPageBreak()
            detIdx = printDetailHeader(ws, detIdx, shopName, filterIn, true)
            currentCMCounter = PAGE_LIMITS.HEADER_AREA_CM
          }

          // 繪製群組標題
          cleanRow(ws, detIdx)
          const gRow = ws.getRow(detIdx)
          gRow.height = CONFIG.ROW_HEIGHT_DEF
          safeMerge(ws, detIdx, 1, detIdx, 23)
          const gCell = gRow.getCell(1)
          gCell.value = grp.label; gCell.font = STYLES.FONT_BLACK_BOLD; gCell.fill = STYLES.FILL_GRAY; gCell.border = STYLES.BORDER; gCell.alignment = { horizontal: 'left', vertical: 'middle', indent: CONFIG.INDENT_LEFT, wrapText: false }
          detIdx++; currentCMCounter += PAGE_LIMITS.ROW_DETAIL_CM

          for (const item of items) {
            const vL = calculateLines(item.VIP_NAME, LINE_BREAK_CONFIG.VIP_NAME)
            const pL = calculateLines(item.PROD_NAME1, LINE_BREAK_CONFIG.PROD_NAME)
            const mL = calculateLines(item.MEMO, LINE_BREAK_CONFIG.MEMO)
            const maxL = Math.max(vL, pL, mL)
            const itemHeightCM = maxL * PAGE_LIMITS.ROW_DETAIL_CM

            if (currentCMCounter + itemHeightCM > currentPageLimit) {
              ws.getRow(detIdx - 1).addPageBreak()
              detIdx = printDetailHeader(ws, detIdx, shopName, filterIn, true)
              // 補上群組續列標題
              cleanRow(ws, detIdx)
              const contRow = ws.getRow(detIdx)
              contRow.height = CONFIG.ROW_HEIGHT_DEF
              safeMerge(ws, detIdx, 1, detIdx, 23)
              const contCell = contRow.getCell(1)
              contCell.value = `${grp.label} (續)`; contCell.font = STYLES.FONT_BLACK_BOLD; contCell.fill = STYLES.FILL_GRAY; contCell.border = STYLES.BORDER; contCell.alignment = { horizontal: 'left', vertical: 'middle', indent: CONFIG.INDENT_LEFT, wrapText: false }
              detIdx++; currentCMCounter = PAGE_LIMITS.HEADER_AREA_CM + PAGE_LIMITS.ROW_DETAIL_CM
            }

            cleanRow(ws, detIdx)
            const row = ws.getRow(detIdx)
            row.height = maxL * CONFIG.ROW_HEIGHT_DEF

            row.getCell(1).value = item.SALE_DATE; row.getCell(2).value = item.VIP_NAME; row.getCell(6).value = item.TYPE; row.getCell(8).value = item.PROD_NAME1
            row.getCell(15).value = Number(item.QTY) || 0; row.getCell(16).value = item.UNIT; row.getCell(17).value = item.TASTE_MEMO
            row.getCell(18).value = Number(item.SALE_PRICE) || 0; row.getCell(19).value = Number(item.DISC) || 0; row.getCell(20).value = Number(item.TOTAL) || 0
            row.getCell(21).value = item.MEMO; row.getCell(22).value = item.PAY_NAEM; row.getCell(23).value = item.INV

            DETAIL_MERGE_CONFIGS.forEach(m => safeMerge(ws, detIdx, m.start, detIdx, m.end))

            for (let c = 1; c <= 23; c++) {
              const cell = row.getCell(c)
              cell.border = STYLES.BORDER; cell.font = STYLES.FONT_NORMAL
              if (c === 22 && ['iPASS MONEY', '賒帳(不開發票)', '信用卡(已付款)'].includes(item.PAY_NAEM)) cell.font = STYLES.FONT_NORMAL_10
              if (DETAIL_MERGE_CONFIGS.some(m => c > m.start && c <= m.end)) continue
              let alH = 'center'
              if ([2, 8, 21, 22].includes(c)) alH = 'left'
              if ([15, 18, 19, 20].includes(c)) alH = 'right'
              cell.alignment = { vertical: 'middle', horizontal: alH, wrapText: true, indent: alH === 'left' ? CONFIG.INDENT_LEFT : (alH === 'right' ? CONFIG.INDENT_RIGHT : 0) }
            }
            detIdx++; currentCMCounter += itemHeightCM
          }
        }
        currentRow = detIdx
        if (i < shops.length - 1) ws.getRow(currentRow - 1).addPageBreak()
      }

      ws.pageSetup.printArea = `A1:W${currentRow}`
      const fileName = `門市業績表_${dayjs().format('YYYYMMDD')}.xlsx`
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`)
      await wb.xlsx.write(res); res.end()
    } catch (err) {
      console.error('匯出失敗:', err); if (!res.headersSent) res.status(500).send('匯出失敗')
    }
  }
}

module.exports = posDataController