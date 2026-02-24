const { DateTime } = require('luxon')

module.exports = {
  // --- 邏輯判斷 ---
  eq: (a, b) => a === b,

  ne: (a, b) => a !== b,

  gt: (a, b, options) => options?.fn ? (a > b ? options.fn(this) : options.inverse(this)) : a > b,

  lt: (a, b, options) => options?.fn ? (a < b ? options.fn(this) : options.inverse(this)) : a < b,

  gte: (a, b) => a >= b,

  lte: (a, b) => a <= b,

  // 針對訂單狀態的多重判斷：如果 a 等於 b 或 c
  or: function (a, b, c, options) {
    return (a === b || a === c) ? options.fn(this) : options.inverse(this)
  },

  ifEquals: (a, b, options) => options?.fn ? (a === b ? options.fn(this) : options.inverse(this)) : a === b,

  // --- 資料轉換與處理 ---
  ternary: (condition, valTrue, valFalse) => (condition ? valTrue : valFalse),

  boolean: (val) => (val === true || val === 'true' ? 'true' : 'false'),

  number: (val) => {
    const num = Number(val)
    return isNaN(num) ? 0 : num
  },

  json: (context) => JSON.stringify(context),

  lookup: (obj, field) => obj[field],

  // --- 介面顯示相關 ---
  select: (selected, value) => (selected === value ? 'selected' : ''),

  optionLabel: (a, b) => (a ? (b ? `${b}<br>${a}` : a) : b),

  // --- 時間與日期 ---
  currentYear: () => new Date().getFullYear(),

  formatDate: (date) => {
    if (!date) return ''
    // 統一使用 Luxon 處理台北時區，格式為 yyyy-MM-dd HH:mm
    return DateTime.fromJSDate(new Date(date))
      .setZone('Asia/Taipei')
      .toFormat('yyyy-MM-dd HH:mm')
  }
}