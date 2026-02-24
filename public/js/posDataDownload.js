// public/js/posDataDownload.js

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('no-transfer-btn')
  const modalContent = document.getElementById('no-transfer-content')
  const modalEl = document.getElementById('no-transfer-modal')
  const modal = new bootstrap.Modal(modalEl)

  const transferForm = document.getElementById('transfer-form')

  btn.addEventListener('click', async (e) => {
    e.preventDefault()

    const formData = new FormData(transferForm)
    const dateS = formData.get('SALE_DATE_S')
    const dateE = formData.get('SALE_DATE_E')

    const selectedShops = Array.from(transferForm.querySelectorAll('input[name="SHOP_ID"]:checked'))
      .map(input => input.value)
      .join(',')

    modalContent.innerHTML = `
      <div class="text-center py-4">
        <div class="spinner-border text-warning" role="status"></div>
        <p class="mt-2">正在搜尋 ${dateS} ~ ${dateE} 的異常單據...</p>
      </div>`
    modal.show()

    try {
      const url = `/pos/data/download/transfer/no-transfer?dateS=${dateS}&dateE=${dateE}&shops=${selectedShops}`
      const response = await fetch(url)

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('伺服器未回傳正確格式，請確認路徑或登入狀態')
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '讀取失敗')
      }

      const data = await response.json()

      if (data.length === 0) {
        modalContent.innerHTML = '<div class="text-center py-5 fs-5 fw-bold text-secondary">沒有異常單據</div>'
      } else {
        renderNoTransferTables(data, modalContent)
      }

    } catch (err) {
      modalContent.innerHTML = `<div class="alert alert-danger">錯誤：${err.message}</div>`
    }
  })
})

/**
 * 依照問題類型渲染多個獨立表格
 */
function renderNoTransferTables(data, container) {
  // 1. 依照問題類型進行分組
  const groups = data.reduce((acc, row) => {
    const typeKey = row.問題類型 || '99999'
    const typeDesc = row.問題描述 || '其他異常'

    if (!acc[typeKey]) {
      acc[typeKey] = {
        description: typeDesc,
        rows: []
      }
    }
    acc[typeKey].rows.push(row)
    return acc
  }, {})

  let finalHtml = ''

  // 2. 排序並遍歷分組，每個分組產生一個獨立 Table
  Object.keys(groups).sort().forEach(typeKey => {
    const group = groups[typeKey]

    finalHtml += `
      <div class="mb-5">
        <div class="d-flex align-items-center mb-2">
          <span class="badge bg-dark me-2 px-3 py-2">${typeKey}</span>
          <h5 class="mb-0 fw-bold text-dark">${group.description}</h5>
          <span class="ms-auto badge rounded-pill bg-secondary">共 ${group.rows.length} 筆</span>
        </div>
        <div class="table-responsive">
          <table class="table table-sm table-hover table-bordered border-secondary-subtle">
            <thead class="table-dark">
              <tr class="small text-center align-middle">
                <th style="width: 100px;">日期</th>
                <th style="width: 80px;">建立門市</th>
                <th style="width: 85px;">類型</th>
                <th style="width: 130px;">單號</th>
                <th style="width: 80px;">調出門市</th>
                <th style="width: 80px;">調入門市</th>
                <th style="width: 90px;">匯入類型</th>
                <th style="width: 130px;">匯入單號</th>
              </tr>
            </thead>
            <tbody>
    `

    group.rows.forEach(row => {
      const typeClass = row.單據類型 === '調出單' ? 'bg-info text-black' : 'bg-primary'

      finalHtml += `
        <tr class="small align-middle">
          <td class="text-center">${row.單據日期.split(' ')[0]}</td>
          <td class="text-center text-secondary">${row.建立門市}</td>
          <td class="text-center">
            <span class="badge ${typeClass} fw-bold" style="font-size: 0.85rem; padding: 0.4em 0.6em;">${row.單據類型}</span>
          </td>
          <td class="fw-bold text-start ps-2 text-primary font-monospace">${row.單號}</td>
          <td class="text-center">${row.調出門市}</td>
          <td class="text-center">${row.調入門市}</td>
          <td class="text-center">${row.匯入類型 || '<span class="text-muted">--</span>'}</td>
          <td class="text-start ps-2 font-monospace">${row.匯入單號 || '<span class="text-muted">--</span>'}</td>
        </tr>
      `
    })

    finalHtml += `
            </tbody>
          </table>
        </div>
      </div>
    `
  })

  container.innerHTML = finalHtml
}