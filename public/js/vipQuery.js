document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('vipAmountBtn')
  const modalContent = document.getElementById('vipAmountContent')
  const modalEl = document.getElementById('vipAmountModal')
  const modal = new bootstrap.Modal(modalEl)

  // VIP 數量總覽
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
})

// ========================= 分頁 VIP 列表 =========================
const pageSize = 50
let currentPage = 1

function renderTable(page = 1) {
  currentPage = page
  const start = (page - 1) * pageSize
  const pageVips = vips.slice(start, start + pageSize)

  const html = pageVips.map(v => `
    <tr>
      <td class="text-center">${v.APPLY_SHOP || ''}</td>
      <td>${v.VIP_ID || ''}</td>
      <td>${v.NAME || ''}</td>
      <td>${v.LINKMAN || ''}</td>
      <td>${v.TELEPHONE || ''}</td>
      <td>${v.MOBILE || ''}</td>
      <td>${v.COMPANY || ''}</td>
      <td>${v.vip_code || ''}</td>
      <td>${v.MEMO || ''}</td>
      <td>
        <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modal-${v.VIP_ID}">詳細</button>
        <div class="modal fade" id="modal-${v.VIP_ID}" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title fw-bold">${v.NAME || ''}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <table class="table">
                  <tbody>
                    ${[
      ['貴賓編號', v.VIP_ID],
      ['貴賓群組', v.vipgrp_name],
      ['聯絡人', v.LINKMAN],
      ['電話', v.MOBILE],
      ['手機', v.TELEPHONE],
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
    ].map(([label, value]) => `<tr><th>${label}</th><td>${value || ''}</td></tr>`).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>`).join('')

  document.getElementById('vip-table-container').innerHTML = html
  renderPagination()
}

function renderPagination() {
  const totalPages = Math.ceil(vips.length / pageSize)
  let startPage, endPage

  if (totalPages <= 10) {
    startPage = 1
    endPage = totalPages

  } else {
    startPage = currentPage - 4
    endPage = currentPage + 5

    if (startPage < 1) {
      startPage = 1
      endPage = 10
    } else if (endPage > totalPages) {
      endPage = totalPages
      startPage = totalPages - 9
    }
  }

  let html = ''

  if (currentPage > 1 && totalPages > 10) {
    html += `<li class="page-item"><a class="page-link" href="#" onclick="renderTable(1)">第1頁</a></li>`
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
               <a class="page-link" href="#" onclick="renderTable(${i})">${i}</a>
             </li>`
  }

  if (currentPage < totalPages && totalPages > 10) {
    html += `<li class="page-item"><a class="page-link" href="#" onclick="renderTable(${totalPages})">第${totalPages}頁</a></li>`
  }

  document.getElementById('vip-pagination').innerHTML = html
}

// 初始頁
renderTable(1)
