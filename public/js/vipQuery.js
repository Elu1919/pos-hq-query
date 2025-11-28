document.addEventListener('DOMContentLoaded', () => {

  const btn = document.getElementById('vipAmountBtn')
  const modalContent = document.getElementById('vipAmountContent')
  const modalEl = document.getElementById('vipAmountModal')

  // ✅ 只建立一次 Modal 實例
  const modal = new bootstrap.Modal(modalEl)

  btn.addEventListener('click', async (e) => {
    e.preventDefault()

    // 顯示載入訊息
    modalContent.innerHTML = '<p class="text-center">資料載入中...</p>'
    modal.show()  // 立即顯示 Modal

    try {
      const res = await fetch('/vip/vip-amount', { method: 'GET' })
      if (!res.ok) throw new Error('取得數量總覽失敗')

      const data = await res.json()

      const groups = {}
      data.forEach(row => {
        if (!groups[row.vipgrp_name]) groups[row.vipgrp_name] = []
        groups[row.vipgrp_name].push(row)
      })

      let html = ''
      for (const grpName in groups) {
        const rows = groups[grpName]

        html += `<h5 class="mt-3 fw-bold">${grpName}</h5>`
        html += '<div style="overflow-x:auto"><table class="table table-striped table-sm" style="table-layout: fixed; width: 100%">'

        html += '<thead class="table-dark"><tr><th style="width:120px">配號門市</th>'
        rows.forEach(r => { html += `<td class="fw-bold">${r.SHOP_ID}</td>` })
        html += '</tr></thead><tbody>'

        html += '<tr><th style="width:120px">已使用</th>'
        rows.forEach(r => { html += `<td>${r.used}</td>` })
        html += '</tr>'

        html += '<tr><th style="width:120px">未使用</th>'
        rows.forEach(r => { html += `<td>${r.remaining}</td>` })
        html += '</tr>'

        html += '<tr><th style="width:120px">總數量</th>'
        rows.forEach(r => { html += `<td>${r.total}</td>` })
        html += '</tr>'

        html += '</tbody></table></div>'
      }

      modalContent.innerHTML = html

    } catch (err) {
      modalContent.innerHTML = `<p class="text-danger text-center">${err.message}</p>`
    }

  })

})





