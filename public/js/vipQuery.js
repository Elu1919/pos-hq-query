// public/js/vipQuery.js

document.addEventListener('DOMContentLoaded', () => {

  // ========================= VIP 數量總覽 (權限相關) =========================
  const btn = document.getElementById('vipAmountBtn')
  const modalContent = document.getElementById('vipAmountContent')
  const modalEl = document.getElementById('vipAmountModal')

  // 加上防呆判斷：只有當按鈕與 Modal 元素同時存在時（通常是 ACC 權限），才初始化事件
  if (btn && modalContent && modalEl) {
    const modal = new bootstrap.Modal(modalEl)

    btn.addEventListener('click', async (e) => {
      e.preventDefault()
      modalContent.innerHTML = '<p class="text-center">資料載入中...</p>'
      modal.show()

      try {
        const res = await fetch('/vip/vip-amount')
        if (!res.ok) throw new Error('取得數量總覽失敗')

        const data = await res.json()
        const groups = data.reduce((acc, row) => {
          (acc[row.vipgrp_name] ||= []).push(row)
          return acc
        }, {})

        let html = ''
        for (const grpName in groups) {
          const rows = groups[grpName]

          html += `<h5 class="mt-3 fw-bold">${grpName}</h5>`
          html += `<div style="overflow-x:auto">
                    <table class="table table-striped table-sm" style="table-layout: fixed; width: 100%">
                      <thead class="table-dark">
                        <tr><th style="width:120px">配號門市</th>${rows.map(r => `<td class="fw-bold">${r.SHOP_ID}</td>`).join('')}</tr>
                      </thead>
                      <tbody>
                        <tr><th style="width:120px">已使用</th>${rows.map(r => `<td>${r.used}</td>`).join('')}</tr>
                        <tr><th style="width:120px">未使用</th>${rows.map(r => `<td>${r.remaining}</td>`).join('')}</tr>
                        <tr><th style="width:120px">總數量</th>${rows.map(r => `<td>${r.total}</td>`).join('')}</tr>
                      </tbody>
                    </table>
                  </div>`
        }

        modalContent.innerHTML = html
      } catch (err) {
        modalContent.innerHTML = `<p class="text-danger text-center">${err.message}</p>`
      }
    })
  }

  //  ========================= 分頁 VIP 列表 (全權限通用) =========================
  const pageSize = 50
  // 假設後端已將所有 VIP 資料注入到全域變數 vips 中
  const allVips = typeof vips !== 'undefined' && Array.isArray(vips) ? vips : []

  /**
   * 根據頁碼渲染當前頁面的 VIP 資料
   * @param {number} page - 當前頁碼
   */
  function renderTable(page) {
    const start = (page - 1) * pageSize
    const pageVips = allVips.slice(start, start + pageSize)
    const container = document.getElementById('vip-table-container')

    if (!container) return

    const html = pageVips.map(v => `
      <tr>
        <td class="text-center">${v.APPLY_SHOP || ''}</td>
        <td data-vip-id="${v.VIP_ID}">${v.VIP_ID || ''}</td> 
        <td>${v.NAME || ''}</td>
        <td>${v.LINKMAN || ''}</td>
        <td>${v.TELEPHONE || ''}</td>
        <td>${v.MOBILE || ''}</td>
        <td>${v.COMPANY || ''}</td>
        <td>${v.vip_code || ''}</td>
        <td>${v.MEMO || ''}</td>
        <td>
          <button type="button" class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#modal-${v.VIP_ID}">詳細</button>
          <div class="modal fade" id="modal-${v.VIP_ID}" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title fw-bold text-dark">${v.NAME || ''}</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body text-dark">
                  <table class="table table-bordered">
                    <tbody>
                      ${[
        ['貴賓編號', v.VIP_ID],
        ['貴賓群組', v.vipgrp_name],
        ['聯絡人', v.LINKMAN],
        ['電話', v.TELEPHONE],
        ['手機', v.MOBILE],
        ['Email', v.EMAIL],
        ['住址', v.ADDRESS],
        ['公司名稱', v.COMPANY],
        ['公司統編', v.vip_code],
        ['公司地址', v.COMPANY_ADDR],
        ['備註一', v.MEMO],
        ['備註二', v.iccardno],
        ['取號門市', v.APPLY_SHOP],
        ['取號時間', v.APPLY_DATE],
        ['建立時間', v.modify_date],
        ['最後更新', v.last_update]
      ].map(([label, value]) => `<tr><th class="bg-light" style="width: 30%">${label}</th><td>${value || ''}</td></tr>`).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>`).join('')

    container.innerHTML = html
  }

  // 實例化 Paginator 並執行首次渲染
  const paginationEl = document.getElementById('vip-pagination-client')
  if (allVips.length > 0 && paginationEl) {
    new Paginator(
      'vip-pagination-client',
      allVips.length,
      pageSize,
      (newPage) => {
        renderTable(newPage)
      }
    )
    // 預設執行第一頁渲染
    renderTable(1)
  } else if (allVips.length === 0) {
    const container = document.getElementById('vip-table-container')
    if (container) container.innerHTML = '<tr><td colspan="10" class="text-center py-4">查無資料</td></tr>'
  }
})