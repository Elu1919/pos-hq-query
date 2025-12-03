// public/js/selectModal/genericSelectModal.js

/**
 * @fileoverview  - 用於初始化通用勾選/選擇模組的函式庫
 *
 * @param {object} options - 初始化選項
 * @param {string} options.rawId - 原始資料表格的 ID
 * @param {string} options.bodyId - 用於顯示可選列表的表格 tbody ID
 * @param {string} options.dataIdAttribute - 指定從 checkbox 的 data-屬性中提取的 ID 鍵名（例如：'vipId', 'prodId'）
 * @param {string} options.listKeyName - 指定送出到後端 JSON 中 ID 陣列的鍵名（例如：'VIP_ID', 'PROD_ID'）
 * @param {string} options.btnSelectAllId - 全選按鈕的 ID
 * @param {string} options.btnUnselectAllId - 取消全選按鈕的 ID
 * @param {boolean} options.addQty - 是否新增數量輸入欄位
 * @param {string} options.formId - 表單 ID，用於處理送出邏輯
 */

window.initGenericSelectModal = function (options) {
  const {
    rawId,
    bodyId,
    dataIdAttribute,
    listKeyName,
    btnSelectAllId,
    btnUnselectAllId,
    addQty,
    formId
  } = options

  // 1. 讀取原始資料
  const rawRows = []
  const rawTable = document.getElementById(rawId)

  if (!rawTable) {
    console.error(`找不到 ID 為 ${rawId} 的原始資料表格`)
    return
  }

  rawTable.querySelectorAll('tr').forEach(tr => {
    const idValue = tr.children[0]?.textContent
    const name = tr.children[1]?.textContent
    if (idValue && name) {
      rawRows.push({ idValue, name })
    }
  })

  const body = document.getElementById(bodyId)
  if (!body) {
    console.error(`找不到 ID 為 ${bodyId} 的目標表格 body`)
    return
  }
  body.innerHTML = ''

  // 2. 動態生成列表 (每行 3 個項目)
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
        // Checkbox
        const input = document.createElement('input')
        input.type = 'checkbox'
        input.classList.add('chk-item')
        input.name = 'id'
        input.value = item.idValue
        input.dataset[dataIdAttribute] = item.idValue
        input.checked = true
        tdCheck.appendChild(input)

        // 點擊事件處理
        tdCheck.style.cursor = 'pointer'
        tdCheck.addEventListener('click', e => {
          if (e.target.tagName !== 'INPUT') {
            input.checked = !input.checked
            updateCount()
          }
        })

        // Name
        tdName.textContent = item.name
        tdName.style.cursor = 'pointer'
        tdName.addEventListener('click', () => {
          input.checked = !input.checked
          updateCount()
        })

        // Qty Input
        if (addQty && tdQty) {
          const qtyInput = document.createElement('input')
          qtyInput.type = 'number'
          qtyInput.min = 1
          qtyInput.value = 1
          qtyInput.classList.add('form-control', 'form-control-sm', 'item-qty')
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

  // 3. 全選 / 取消全選 邏輯
  const btnSelectAll = document.getElementById(btnSelectAllId)
  const btnUnselectAll = document.getElementById(btnUnselectAllId)
  const chkSelector = `#${bodyId} .chk-item`

  const selectAll = () => {
    document.querySelectorAll(chkSelector).forEach(cb => cb.checked = true)
    updateCount()
  }
  const unselectAll = () => {
    document.querySelectorAll(chkSelector).forEach(cb => cb.checked = false)
    updateCount()
  }

  if (btnSelectAll) btnSelectAll.onclick = selectAll
  if (btnUnselectAll) btnUnselectAll.onclick = unselectAll

  // 4. 動態更新勾選數量
  function updateCount() {
    const checked = document.querySelectorAll(`${chkSelector}:checked`).length
    const counterId = 'count-' + bodyId.split('-').pop()
    const counterEl = document.getElementById(counterId)
    if (counterEl) counterEl.textContent = `已勾選：${checked}`
  }

  // Checkbox 變動事件監聽
  body.addEventListener('change', e => {
    if (e.target.classList.contains('chk-item')) updateCount()
  })

  updateCount()

  // 5. 表單送出（Fetch POST 邏輯）
  if (formId) {
    const form = document.getElementById(formId)
    if (!form) return

    form.addEventListener('submit', async e => {
      e.preventDefault()

      const itemList = []
      body.querySelectorAll('tr').forEach(tr => {
        const tds = Array.from(tr.children)
        for (let c = 0; c < tds.length; c += addQty ? 4 : 3) {
          const tdCheck = tds[c]
          const cb = tdCheck?.querySelector('.chk-item')

          if (cb && cb.checked) {
            const idValue = cb.dataset[dataIdAttribute]
            let qty = 1

            if (addQty) {
              const tdQty = tds[c + 2]
              const qtyInput = tdQty?.querySelector('.item-qty')
              qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1
            }

            const item = { qty }
            item[listKeyName] = idValue
            itemList.push(item)
          }
        }
      })

      if (itemList.length === 0) {
        alert('請至少勾選一筆資料再送出表單')
        return
      }

      if (itemList.length > 900) {
        alert('最多一次輸出 900 筆資料')
        return
      }

      // 構建動態 Payload
      const payload = {}
      payload[dataIdAttribute + 'List'] = itemList

      try {
        const res = await fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(`文件生成失敗: ${res.status} - ${errorText.substring(0, 100)}...`)
        }

        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
      } catch (err) {
        console.error('Fetch 或文件處理錯誤:', err)
        alert('文件生成失敗')
      }
    })
  }
}