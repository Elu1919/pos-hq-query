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
    // 讓 Luxon 自動判斷是 ISO 字串還是 JS Date
    const dt = (typeof date === 'string')
      ? DateTime.fromISO(date)
      : DateTime.fromJSDate(new Date(date))

    return dt.setZone('Asia/Taipei').toFormat('yyyy-MM-dd HH:mm')
  },

  // --- 權限判斷 ---

  // 功能：大於等於判斷 (專門給 {{#authGte}} 使用)
  authGte: function (userLevel, requiredLevel, options) {
    const uLevel = Number(userLevel)
    const rLevel = Number(requiredLevel)

    // 特別處理：如果要求的是 WH (30) 權限，但使用者是 ST (40)，則隱藏按鈕
    // 假設 ROLES.ST = 40, ROLES.WH = 30
    if (rLevel === 30 && uLevel === 40) {
      return options.inverse(this)
    }

    if (uLevel >= rLevel) {
      return options.fn(this)
    }
    return options.inverse(this)
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