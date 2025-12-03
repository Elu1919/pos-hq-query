// public/js/pagination/Paginator.js

/**
 * Paginator.js (可重用的前端分頁組件)
 * 負責渲染分頁控制項，並處理點擊事件
 * @param {string} containerId - 放置分頁元件的 HTML 元素的 ID
 * @param {number} totalItems - 總資料筆數
 * @param {number} pageSize - 每頁顯示筆數
 * @param {function} onPageChange - 頁碼改變時的回調函式
 */

class Paginator {
  constructor(containerId, totalItems, pageSize, onPageChange) {
    this.container = document.getElementById(containerId)
    this.totalItems = totalItems
    this.pageSize = pageSize
    this.onPageChange = onPageChange
    this.currentPage = 1

    if (!this.container) {
      console.error(`Paginator container not found: #${containerId}`)
      return
    }

    this.totalPages = Math.ceil(this.totalItems / this.pageSize)

    // 監聽點擊事件
    this.container.addEventListener('click', e => {
      const link = e.target.closest('a.page-link')
      if (!link) return

      e.preventDefault()
      const newPage = parseInt(link.dataset.page)

      if (newPage > 0 && newPage <= this.totalPages && newPage !== this.currentPage) {
        this.currentPage = newPage
        this.render()
        this.onPageChange(this.currentPage)
      }
    })

    // 初始渲染並載入第一頁資料
    this.render()
    this.onPageChange(this.currentPage)
  }

  /** 渲染分頁控制項的 HTML */
  render() {
    if (this.totalPages < 1) {
      this.container.innerHTML = ''
      return
    }

    // 決定顯示的分頁範圍 (最多顯示 10 頁)
    let startPage, endPage
    const maxPagesToShow = 10

    if (this.totalPages <= maxPagesToShow) {
      startPage = 1
      endPage = this.totalPages
    } else {
      startPage = this.currentPage - 4
      endPage = this.currentPage + 5

      if (startPage < 1) {
        startPage = 1
        endPage = maxPagesToShow
      } else if (endPage > this.totalPages) {
        endPage = this.totalPages
        startPage = this.totalPages - maxPagesToShow + 1
      }
    }

    let html = ''
    const prevPage = this.currentPage - 1 > 0 ? this.currentPage - 1 : 1
    const nextPage = this.currentPage + 1 <= this.totalPages ? this.currentPage + 1 : this.totalPages

    // 往第一頁 (如果超過顯示範圍才顯示)
    if (this.currentPage > 1 && this.totalPages > maxPagesToShow) {
      html += `<li class="page-item"><a class="page-link" href="#" data-page="1">第1頁</a></li>`
    }

    // 往前一頁
    html += `<li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${prevPage}" aria-label="Previous">
                    <span aria-hidden="true">&laquo;</span>
                </a>
              </li>`

    // 中間頁碼
    for (let i = startPage; i <= endPage; i++) {
      html += `<li class="page-item ${i === this.currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
               </li>`
    }

    // 往後一頁
    html += `<li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${nextPage}" aria-label="Next">
                    <span aria-hidden="true">&raquo;</span>
                </a>
              </li>`

    // 往最後一頁 (如果超過顯示範圍才顯示)
    if (this.currentPage < this.totalPages && this.totalPages > maxPagesToShow) {
      html += `<li class="page-item"><a class="page-link" href="#" data-page="${this.totalPages}">第${this.totalPages}頁</a></li>`
    }

    this.container.innerHTML = html
  }
}