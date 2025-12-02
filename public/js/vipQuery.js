// public/js/vipQuery.js
document.addEventListener('DOMContentLoaded', () => {

  // ========================= A4 / Barcode Modal 初始化 =========================
  function initVipModal(options) {
    const { rawId, bodyId, btnSelectAllId, btnUnselectAllId, addQty, formId } = options
    const rawRows = []
    document.querySelectorAll('#' + rawId + ' tr').forEach(tr => {
      rawRows.push({ vipId: tr.children[0].textContent, name: tr.children[1].textContent })
    })

    const body = document.getElementById(bodyId)
    body.innerHTML = ''

    for (let i = 0; i < rawRows.length; i += 3) {
      const row = document.createElement('tr')
      const cols = [rawRows[i], rawRows[i + 1], rawRows[i + 2]]

      cols.forEach(item => {
        const tdCheck = document.createElement('td')
        tdCheck.classList.add('text-center')
        const tdName = document.createElement('td')
        const tdQty = addQty ? document.createElement('td') : null
        const tdEmpty = document.createElement('td')

        if (item) {
          // checkbox
          const input = document.createElement('input')
          input.type = 'checkbox'
          input.classList.add('chk-vip')
          input.dataset.vipId = item.vipId
          input.checked = true
          tdCheck.appendChild(input)

          tdCheck.addEventListener('click', e => {
            if (e.target.tagName !== 'INPUT') {
              input.checked = !input.checked
              updateCount()
            }
          })

          // name
          tdName.textContent = item.name
          tdName.style.cursor = 'pointer'
          tdName.addEventListener('click', () => {
            input.checked = !input.checked
            updateCount()
          })

          // qty
          if (addQty && tdQty) {
            const qtyInput = document.createElement('input')
            qtyInput.type = 'number'
            qtyInput.min = 1
            qtyInput.value = 1
            qtyInput.classList.add('form-control', 'form-control-sm', 'vip-qty')
            tdQty.appendChild(qtyInput)
          }
        }

        row.appendChild(tdCheck)
        row.appendChild(tdName)
        if (addQty && tdQty) row.appendChild(tdQty)
        row.appendChild(tdEmpty)
      })

      body.appendChild(row)
    }

    // 全選 / 取消全選
    const btnSelectAll = document.getElementById(btnSelectAllId)
    const btnUnselectAll = document.getElementById(btnUnselectAllId)
    if (btnSelectAll) btnSelectAll.onclick = () => {
      document.querySelectorAll('#' + bodyId + ' .chk-vip').forEach(cb => cb.checked = true)
    }
    if (btnUnselectAll) btnUnselectAll.onclick = () => {
      document.querySelectorAll('#' + bodyId + ' .chk-vip').forEach(cb => cb.checked = false)
    }

    // ========================= 動態顯示勾選數量 =========================
    function updateCount() {
      const checked = document.querySelectorAll('#' + bodyId + ' .chk-vip:checked').length
      const counterEl = document.getElementById('count-' + bodyId.replace('vip-table-body-', ''))
      if (counterEl) counterEl.textContent = `已勾選：${checked}`
    }

    // checkbox 事件監聽
    body.addEventListener('change', e => {
      if (e.target.classList.contains('chk-vip')) updateCount()
    })

    // 全選 / 全不選 後更新數量
    if (btnSelectAll) btnSelectAll.addEventListener('click', updateCount)
    if (btnUnselectAll) btnUnselectAll.addEventListener('click', updateCount)

    // 初始化時先算一次
    updateCount()

    // 送出表單時，把 VIP_ID 與對應數量一起送出
    if (formId) {
      const form = document.getElementById(formId)
      form.addEventListener('submit', async e => {
        e.preventDefault()

        // 清掉舊 hidden input
        form.querySelectorAll('.vip-hidden-input').forEach(el => el.remove())

        const rows = body.querySelectorAll('tr')
        let hasChecked = false
        const vipList = []

        rows.forEach(tr => {
          const tds = Array.from(tr.children)
          for (let c = 0; c < tds.length; c += addQty ? 4 : 3) {
            const tdCheck = tds[c]
            const tdQty = addQty ? tds[c + 2] : null
            const cb = tdCheck.querySelector('.chk-vip')

            if (cb && cb.checked) {
              hasChecked = true
              const vipId = cb.dataset.vipId
              let qty = 1
              if (addQty && tdQty) {
                const qtyInput = tdQty.querySelector('.vip-qty')
                qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1
              }
              vipList.push({ VIP_ID: vipId, qty })
            }
          }
        })

        if (!hasChecked) {
          e.preventDefault()
          alert('請至少勾選一筆資料再送出表單')
        }

        if (vipList.length > 900) {
          alert('最多一次輸出 900 筆資料')
          return
        }

        // 用 fetch 發送 POST，取得 PDF blob
        try {
          const res = await fetch(form.action, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vipList }) // 直接送 JSON
          })

          if (!res.ok) throw new Error('PDF 生成失敗')

          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          window.open(url, '_blank')
        } catch (err) {
          console.error(err)
          alert('PDF 生成失敗')
        }

      })
    }
  }

  // 初始化 A4
  initVipModal({
    rawId: 'vip-raw-data-a4',
    bodyId: 'vip-table-body-a4',
    btnSelectAllId: 'btnSelectAllA4',
    btnUnselectAllId: 'btnUnselectAllA4',
    addQty: false,
    formId: 'vipExportA4-form'
  })

  // 初始化 Barcode
  initVipModal({
    rawId: 'vip-raw-data-barcode',
    bodyId: 'vip-table-body-barcode',
    btnSelectAllId: 'btnSelectAllBarcode',
    btnUnselectAllId: 'btnUnselectAllBarcode',
    addQty: true,
    formId: 'vipExportBarcode-form'
  })


  // ========================= VIP 數量總覽 =========================
  const btn = document.getElementById('vipAmountBtn')
  const modalContent = document.getElementById('vipAmountContent')
  const modalEl = document.getElementById('vipAmountModal')
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

  // ========================= 分頁 VIP 列表 =========================
  const pageSize = 50
  let currentPage = 1

  // 把函式暴露到全域，讓 HTML onclick 可正常呼叫
  window.renderTable = function (page = 1) {
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
    window.renderPagination()
  }

  window.renderPagination = function () {
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
  window.renderTable(1)
})
