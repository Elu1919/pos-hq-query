// helpers/hbsHelpers.js
module.exports = {
  // 基本條件判斷 (相等)
  eq: (a, b) => a === b,

  // 三元判斷 (類似 JS ? :)
  ternary: (condition, valTrue, valFalse) => (condition ? valTrue : valFalse),

  // 格式化日期
  formatDate: (date) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toISOString().split('T')[0] // YYYY-MM-DD
  },

  // 下拉選單自動選取
  select: (selected, value) => (selected === value ? 'selected' : ''),

  // 將 ID & 名稱合併
  optionLabel: (a, b) => {
    const index = a ? b ? `${b}<br>${a}` : a : b
    return index
  },

  // to json
  json: (context) => JSON.stringify(context)
}
