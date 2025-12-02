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
  lt: (a, b, options) => options?.fn ? (a < b ? options.fn(this) : options.inverse(this)) : a < b,
  increment: (val) => val + 1,
  decrement: (val) => val - 1,

  paginationPages: (currentPage, totalPages, options) => {
    currentPage = Number(currentPage) || 1
    totalPages = Number(totalPages) || 1

    let startPage = 1
    let endPage = totalPages

    if (totalPages > 10) {
      if (currentPage <= 6) {
        startPage = 1
        endPage = 10
      } else if (currentPage + 4 >= totalPages) {
        startPage = totalPages - 9
        endPage = totalPages
      } else {
        startPage = currentPage - 5
        endPage = currentPage + 4
      }
    }

    let result = ''
    for (let i = startPage; i <= endPage; i++) {
      result += options.fn({ page: i, currentPage })
    }
    return result
  }
}
