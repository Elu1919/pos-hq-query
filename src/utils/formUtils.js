// src/utils/formUtils.js

const ExcelJS = require('exceljs')
const path = require('path')
const fs = require('fs')
const dayjs = require('dayjs')

/**
 * 根據單據類型代碼 (0, 1, 2, 3...) 轉換成中文名稱。
 * @param {number} typeCode - 單據類型代碼。
 * @returns {string | null} 對應的中文名稱。
 */
const getSaleType = (typeCode) => {
  const type = Number(typeCode)
  if (type === 0) return '銷貨'
  if (type === 1) return '銷退'
  if (type === 2) return '已退'
  return null
}

/**
 * 合併市話和手機號碼成單一字串。
 * @param {string | null} tel - 市話號碼。
 * @param {string | null} mob - 手機號碼。
 * @returns {string} 合併後的電話字串。
 */
const mergePhoneNumbers = (tel, mob) => {
  const TELEPHONE = tel || ''
  const MOBILE = mob || ''

  if (TELEPHONE && MOBILE) return `${TELEPHONE} / ${MOBILE}`
  if (TELEPHONE) return TELEPHONE
  if (MOBILE) return MOBILE
  return ''
}

/**
 * 將陣列切塊 (用於 PDF/Excel 分頁或分欄)。
 * @param {Array<any>} items - 要切塊的陣列。
 * @param {number} size - 每個塊的大小。
 * @returns {Array<Array<any>>} 切塊後的陣列。
 */
const chunkItems = (items, size) => {
  const chunks = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

/**
 * 統一檢查日期範圍
 */
const validateDateRange = (dateS, dateE) => {
  const today = dayjs().format('YYYY-MM-DD')
  const start = dateS || today
  const end = dateE || today

  if (start > end) {
    return { error: '起始日期不可大於結束日期', start, end }
  }
  return { error: null, start, end }
}

/**
 * 通用 Excel 匯出模組
 */
const exportToExcel = async (res, data, fileName, sheetName = 'Sheet1') => {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(sheetName)

  // 寫入標題與內容
  const headers = Object.keys(data[0])
  sheet.addRow(headers)
  data.forEach(item => sheet.addRow(Object.values(item)))

  // 檔案暫存與下載
  const tempDir = path.join(__dirname, '../../public/temp')
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
  const filePath = path.join(tempDir, fileName)

  await workbook.xlsx.writeFile(filePath)

  res.download(filePath, fileName, (err) => {
    if (err) console.error('下載失敗:', err)
    fs.unlink(filePath, (uErr) => {
      if (uErr) console.error('刪除暫存失敗:', uErr)
    })
  })
}

module.exports = {
  getSaleType,
  mergePhoneNumbers,
  chunkItems,
  validateDateRange,
  exportToExcel,
}