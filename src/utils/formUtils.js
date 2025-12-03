// src/utils/formUtils.js

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

module.exports = {
  getSaleType,
  mergePhoneNumbers,
  chunkItems,
}