// document.getElementById('exportExcelBtn').addEventListener('click', async (e) => {
//   e.preventDefault(); // 阻止表單預設提交

//   const form = document.getElementById('sale-form');

//   // 收集表單資料
//   const formData = new FormData(form);
//   // 如果 checkbox 多選，FormData 會有多筆同名值
//   const plainData = {};
//   formData.forEach((value, key) => {
//     if (plainData[key]) {
//       // 已存在就變陣列
//       if (!Array.isArray(plainData[key])) {
//         plainData[key] = [plainData[key]];
//       }
//       plainData[key].push(value);
//     } else {
//       plainData[key] = value;
//     }
//   });

//   try {
//     // 傳送到匯出 API
//     const res = await fetch('/sale/sale-data/export', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(plainData)
//     });

//     if (!res.ok) throw new Error('匯出失敗')

//     // 下載檔案
//     const blob = await res.blob()
//     const url = window.URL.createObjectURL(blob)
//     const a = document.createElement('a')
//     a.href = url

//     // 從 header 解析檔名（如果後端有設定 Content-Disposition）
//     let filename = '銷售資料.xlsx'
//     const disposition = res.headers.get('Content-Disposition');
//     if (disposition) {
//       const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
//       if (match != null && match[1]) {
//         filename = decodeURIComponent(match[1].replace(/['"]/g, ''))
//       }
//     }

//     a.download = filename
//     document.body.appendChild(a)
//     a.click()
//     a.remove()
//     window.URL.revokeObjectURL(url)
//   } catch (err) {
//     alert(err.message)
//   }
// })

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





