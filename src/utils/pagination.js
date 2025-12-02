// src/utils/pagination.js

const calculatePagination = (totalCount, page, pageSize) => {
  page = Number(page) || 1
  pageSize = Number(pageSize) || 50
  const totalPages = Math.ceil(totalCount / pageSize)
  const offset = (page - 1) * pageSize
  return { totalPages, offset }
}

module.exports = { calculatePagination }
