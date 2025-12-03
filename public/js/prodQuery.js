// public/js/prodQuery.js

document.addEventListener('DOMContentLoaded', () => {

  // ========================= 分頁列表 =========================
  const pageSize = 50

  const allProds = typeof prods !== 'undefined' && Array.isArray(prods) ? prods : []

  /**
   * 根據頁碼渲染當前頁面的 PROD 資料
   * @param {number} page - 當前頁碼
   */
  function renderTable(page) {
    const start = (page - 1) * pageSize
    const pageProds = allProds.slice(start, start + pageSize)

    // PROD 資料渲染邏輯
    const html = pageProds.map(v => `
      <tr>
        <td>${v.DEP_NAME || ''}</td>
        <td data-prod-id="${v.PROD_ID}">${v.PROD_ID || ''}</td>
        <td>${v.PROD_NAME1 || ''}</td>
        <td>${v.isfloat ? '浮動價' : v.PRICE1}</td>
        <td>${v.isfloat ? '浮動價' : v.PRICE_CR || ''}</td>
        <td>${v.isfloat ? '浮動價' : v.PRICE_CRM || ''}</td>
        <td>${v.UNIT_NAME || ''}</td>
        <td>${v.TAX || ''}</td>
        <td>
          <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#modal-${v.PROD_ID}">詳細</button>
          <div class="modal fade" id="modal-${v.PROD_ID}" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title fw-bold">${v.PROD_NAME1 || ''}</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                  <table class="table">
                    <tbody>
                      ${[
        ['商品編號', v.PROD_ID],
        ['第二名稱', v.PROD_NAME2],
        ['商品類別', v.DEP_NAME],
        ['商品性質', v.PROD_KIND_NAME],
        ['門市價', v.isfloat ? '浮動價' : v.PRICE1],
        ['保養廠價', v.isfloat ? '浮動價' : v.PRICE_CR],
        ['機車行價', v.isfloat ? '浮動價' : v.PRICE_CRM],
        ['商品單位', v.UNIT_NAME],
        ['稅率', v.TAX],
        ['是否停用', v.isusepos ? '啟用' : '停用'],
        ['建立日期', v.DATE],
        ['最後更新', v.last_update]
      ].map(([label, value]) => `<tr><th style:"width: 30px;">${label}</th><td>${value || ''}</td></tr>`).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>`).join('')

    document.getElementById('prod-table-container').innerHTML = html
  }

  // 實例化 Paginator
  if (allProds.length > 0) {
    new Paginator(
      'prod-pagination-client', // 使用新的 ID，代表前端分頁
      allProds.length,
      pageSize,
      (newPage) => {
        // 當 Paginator 偵測到頁碼變更時，執行 renderTable
        renderTable(newPage);
      }
    );
  }
})
