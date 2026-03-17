// public/js/inventory.js

document.addEventListener('DOMContentLoaded', () => {
  // --- 1. 定義選擇器 ---
  const CONFIG = {
    tableBodyId: 'prod-table-container',
    filterZeroId: 'filterZeroStock',
    shopToggleClass: '.shop-toggle',
    countDisplayId: 'visible-count',
    rowClass: '.inventory-row',
    shopColClass: '.shop-col',
    headerColClass: '.shop-col-header'
  };

  const tableBody = document.getElementById(CONFIG.tableBodyId);
  const filterZeroBtn = document.getElementById(CONFIG.filterZeroId);
  const countEl = document.getElementById(CONFIG.countDisplayId);

  /**
   * 核心過濾函數：處理門市列隱藏與零庫存行過濾
   */
  function applyInventoryFilters() {
    if (!tableBody) return;

    let visibleCount = 0;
    const hideZero = filterZeroBtn ? filterZeroBtn.checked : false;
    const shopCheckboxes = document.querySelectorAll(CONFIG.shopToggleClass);
    const rows = tableBody.querySelectorAll(CONFIG.rowClass);

    // --- A. 處理門市列 (Column) 的顯示與隱藏 ---
    shopCheckboxes.forEach(chk => {
      const shopId = chk.value;
      const isVisible = chk.checked;

      // 隱藏對應的表頭 (th)
      document.querySelectorAll(`${CONFIG.headerColClass}[data-shop-id="${shopId}"]`)
        .forEach(el => el.style.display = isVisible ? '' : 'none');

      // 隱藏內容單元格 (td)
      document.querySelectorAll(`${CONFIG.shopColClass}[data-shop-id="${shopId}"]`)
        .forEach(el => el.style.display = isVisible ? '' : 'none');
    });

    // --- B. 處理商品行 (Row) 的過濾 (零庫存) ---
    rows.forEach(row => {
      let shouldShowRow = true;

      if (hideZero) {
        // 取得當前「被打勾顯示」的門市庫存數
        const visibleStockCells = Array.from(row.querySelectorAll(CONFIG.shopColClass))
          .filter(td => {
            const chk = document.getElementById(`chk-${td.dataset.shopId}`);
            return chk && chk.checked;
          });

        const totalStock = visibleStockCells.reduce((sum, td) => {
          return sum + (parseFloat(td.dataset.stock) || 0);
        }, 0);

        if (totalStock <= 0) shouldShowRow = false;
      }

      row.style.display = shouldShowRow ? '' : 'none';
      if (shouldShowRow) visibleCount++;
    });

    if (countEl) countEl.textContent = visibleCount;
  }

  // --- 2. 監聽 UI 操作事件 ---
  // 使用事件委派監聽門市勾選與開關切換
  document.addEventListener('change', (e) => {
    if (e.target.matches(CONFIG.shopToggleClass) || e.target.id === CONFIG.filterZeroId) {
      applyInventoryFilters();
    }
  });

  // --- 3. 監聽 DOM 變動 (關鍵：對付分頁渲染) ---
  // 當 prodQuery.js 重新寫入 tableBody.innerHTML 時，自動觸發過濾
  if (tableBody) {
    const observer = new MutationObserver(() => {
      // 停止觀察一下下，避免無限迴圈（雖然這裡只是改 style 不太會觸發，但安全起見）
      observer.disconnect();
      applyInventoryFilters();
      // 重新開始觀察
      observer.observe(tableBody, { childList: true });
    });

    observer.observe(tableBody, { childList: true });
  }

  // 初始執行一次
  applyInventoryFilters();
});