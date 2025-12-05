// public/js/selectModal/genericSelectModal.js

window.initGenericSelectModal = function (options) {
  const {
    rawId,
    bodyId,
    dataIdAttribute,
    listKeyName,
    btnSelectAllId,
    btnUnselectAllId,
    addQty,
    formId,
    enableStockFilter = false // 【變動 1】新增 enableStockFilter 參數，預設為 false
  } = options

  // 1. 讀取原始資料
  const rawRowsAll = []
  const rawTable = document.getElementById(rawId)

  if (!rawTable) {
    console.error(`找不到 ID 為 ${rawId} 的原始資料表格`)
    return
  }

  // 【變動 1.2】讀取原始資料，現在包含 stockType (如果 enableStockFilter 為 true 則讀取)
  rawTable.querySelectorAll('tr').forEach(tr => {
    const idValue = tr.children[0]?.textContent
    const name = tr.children[1]?.textContent

    // 只有當 enableStockFilter 為 true 時才嘗試讀取 stockType
    let stockType = 0;
    if (enableStockFilter) {
      // 假設 stock_type 仍在第三個 td
      const stockTypeStr = tr.children[2]?.textContent;
      stockType = parseInt(stockTypeStr) || 0;
    }

    if (idValue && name) {
      rawRowsAll.push({
        idValue,
        name,
        stockType // 只有 PROD 相關模組的 stockType 會是非 0 的值
      })
    }
  })

  const body = document.getElementById(bodyId)
  if (!body) {
    console.error(`找不到 ID 為 ${bodyId} 的目標表格 body`)
    return
  }

  // 取得過濾用的 Checkbox
  const btnRemoveNotInv = document.getElementById('btnRemoveNotInv')

  // 4. 動態更新勾選數量
  function updateCount() {
    const chkSelector = `#${bodyId} .chk-item`
    // 計算所有被勾選的項目
    const checked = document.querySelectorAll(`${chkSelector}:checked`).length
    const counterId = 'count-' + bodyId.split('-').pop()
    const counterEl = document.getElementById(counterId)
    if (counterEl) counterEl.textContent = `已勾選：${checked}`
  }

  // 【變動 2】將表格生成邏輯封裝在 generateTable 函數中
  function generateTable() {
    let dataToRender = rawRowsAll

    // --- 過濾邏輯 ---
    // 【變動 2.1】新增條件：只有當 enableStockFilter 為 true 時才執行過濾
    if (enableStockFilter && btnRemoveNotInv && btnRemoveNotInv.checked) {
      // 排除 stock_type 等於 0 的項目
      dataToRender = rawRowsAll.filter(item => item.stockType !== 0)
    }

    body.innerHTML = '' // 清空表格內容

    // 2. 動態生成列表 (每行 3 個項目) - 現在使用過濾後的 dataToRender
    for (let i = 0; i < dataToRender.length; i += 3) {
      const row = document.createElement('tr')
      const cols = [dataToRender[i], dataToRender[i + 1], dataToRender[i + 2]]

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
          input.checked = true // 預設勾選
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

        // 將項目添加到行中 (item 為空時，會添加空的 td)
        row.appendChild(tdCheck)
        row.appendChild(tdName)
        if (addQty && tdQty) row.appendChild(tdQty)
        row.appendChild(tdEmpty)
      })

      body.appendChild(row)
    }
    updateCount() // 重新生成後更新計數
  }
  // --- generateTable 函數結束 ---

  // 【變動 3】綁定過濾按鈕事件
  // 只有當 enableStockFilter 為 true 時才綁定事件
  if (enableStockFilter && btnRemoveNotInv) {
    // 當過濾開關變動時，重新生成表格
    btnRemoveNotInv.addEventListener('change', generateTable)
  }

  // 初始呼叫生成表格
  generateTable()

  // ... (後續的 全選/取消全選, updateCount, Form Submit 邏輯保持不變)
  // 3. 全選 / 取消全選 邏輯 
  const btnSelectAll = document.getElementById(btnSelectAllId)
  const btnUnselectAll = document.getElementById(btnUnselectAllId)
  const chkSelector = `#${bodyId} .chk-item`

  const selectAll = () => {
    // 由於 generateTable 會重建 DOM，這裡選擇的是當前已顯示的項目
    document.querySelectorAll(chkSelector).forEach(cb => cb.checked = true)
    updateCount()
  }
  const unselectAll = () => {
    document.querySelectorAll(chkSelector).forEach(cb => cb.checked = false)
    updateCount()
  }

  if (btnSelectAll) btnSelectAll.onclick = selectAll
  if (btnUnselectAll) btnUnselectAll.onclick = unselectAll

  // Checkbox 變動事件監聽 (保持不變)
  body.addEventListener('change', e => {
    if (e.target.classList.contains('chk-item')) updateCount()
  })


  // 5. 表單送出（Fetch POST 邏輯） (保持不變)
  if (formId) {
    const form = document.getElementById(formId)
    if (!form) return

    form.addEventListener('submit', async e => {
      e.preventDefault()

      const itemList = []
      // 這裡遍歷的是當前顯示在 DOM 上的表格
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