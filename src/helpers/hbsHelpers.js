// src/helper/hbsHelpers.js

module.exports = {
  eq: (a, b) => a === b,
  ternary: (condition, valTrue, valFalse) => (condition ? valTrue : valFalse),
  formatDate: (date) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toISOString().split('T')[0]
  },
  select: (selected, value) => (selected === value ? 'selected' : ''),
  optionLabel: (a, b) => (a ? b ? `${b}<br>${a}` : a : b),
  json: (context) => JSON.stringify(context),

  ifEquals: (a, b, options) => options?.fn ? (a === b ? options.fn(this) : options.inverse(this)) : a === b,
  gt: (a, b, options) => options?.fn ? (a > b ? options.fn(this) : options.inverse(this)) : a > b,
  lt: (a, b, options) => options?.fn ? (a < b ? options.fn(this) : options.inverse(this)) : a < b
}
