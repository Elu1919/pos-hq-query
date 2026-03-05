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
  },

  // --- 權限判斷 ---

  // 功能：大於等於判斷 (專門給 {{#authGte}} 使用)
  authGte: function (userLevel, requiredLevel, options) {
    if (Number(userLevel) >= Number(requiredLevel)) {
      return options.fn(this) // 渲染內部的 HTML
    }
    return options.inverse(this) // 渲染 {{else}} 內容
  },

  // 功能：多重身分包含判斷
  // 範例：{{#isRoles user.shopId 'B,C,D'}} ... {{/isRoles}}
  isRoles: function (value, listString, options) {
    const list = listString.split(',')
    if (list.includes(String(value))) {
      return options.fn(this)
    }
    return options.inverse(this)
  },

  // 功能：級別區間判斷 (例如 30~50 之間)
  authBetween: function (userLevel, min, max, options) {
    const level = Number(userLevel)
    if (level >= Number(min) && level <= Number(max)) {
      return options.fn(this)
    }
    return options.inverse(this)
  }

}