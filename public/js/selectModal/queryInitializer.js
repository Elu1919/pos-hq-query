// public/js/selectModal/queryInitializer.js

// 確保 DOM 加載完畢再執行初始化
document.addEventListener('DOMContentLoaded', () => {

  // 處理 VIP 列表 - A4 (不需要數量)
  window.initGenericSelectModal({
    rawId: 'vip-raw-data-a4',
    bodyId: 'vip-table-body-a4',
    dataIdAttribute: 'vipId',
    listKeyName: 'VIP_ID',
    btnSelectAllId: 'btnSelectAllA4',
    btnUnselectAllId: 'btnUnselectAllA4',
    addQty: false,
    formId: 'vipExportA4-form'
  })

  // 處理 VIP 列表 - Barcode (需要數量)
  window.initGenericSelectModal({
    rawId: 'vip-raw-data-barcode',
    bodyId: 'vip-table-body-barcode',
    dataIdAttribute: 'vipId',
    listKeyName: 'VIP_ID',
    btnSelectAllId: 'btnSelectAllBarcode',
    btnUnselectAllId: 'btnUnselectAllBarcode',
    addQty: true,
    formId: 'vipExportBarcode-form'
  })

  // 假設：新增一個產品列表 (Prod) 處理
  // initGenericSelectModal({
  //   rawId: 'prod-raw-data',
  //   bodyId: 'prod-table-body',
  //   dataIdAttribute: 'prodId',
  //   listKeyName: 'PROD_ID',
  //   btnSelectAllId: 'btnSelectAllProd',
  //   btnUnselectAllId: 'btnUnselectAllProd',
  //   addQty: true,
  //   formId: 'prodExport-form'
  // })
})