// public/js/selectModal/queryInitializer.js

// 確保 DOM 加載完畢再執行初始化
document.addEventListener('DOMContentLoaded', () => {

  // VIP 列表 - A4 (不需要數量)
  window.initGenericSelectModal({
    rawId: 'vip-raw-data-a4',
    bodyId: 'vip-table-body-a4',
    dataIdAttribute: 'vipId',
    listKeyName: 'VIP_ID',
    btnSelectAllId: 'btnSelectAllA4',
    btnUnselectAllId: 'btnUnselectAllA4',
    addQty: false,
    enableStockFilter: false,
    formId: 'vipExportA4-form'
  })

  // VIP 列表 - Barcode (需要數量)
  window.initGenericSelectModal({
    rawId: 'vip-raw-data-barcode',
    bodyId: 'vip-table-body-barcode',
    dataIdAttribute: 'vipId',
    listKeyName: 'VIP_ID',
    btnSelectAllId: 'btnSelectAllBarcode',
    btnUnselectAllId: 'btnUnselectAllBarcode',
    addQty: true,
    enableStockFilter: false,
    formId: 'vipExportBarcode-form'
  })

  // PROD QTY 列表 (不需要數量)
  window.initGenericSelectModal({
    rawId: 'prod-raw-data-qua',
    bodyId: 'prod-table-body-qua',
    dataIdAttribute: 'prodId',
    listKeyName: 'PROD_ID',
    btnSelectAllId: 'btnSelectAllProdQua',
    btnUnselectAllId: 'btnUnselectAllProdQua',
    addQty: false,
    enableStockFilter: true
  })

  // PROD 列表 - A4 (不需要數量)
  window.initGenericSelectModal({
    rawId: 'prod-raw-data-a4',
    bodyId: 'prod-table-body-a4',
    dataIdAttribute: 'prodId',
    listKeyName: 'PROD_ID',
    btnSelectAllId: 'btnSelectAllA4',
    btnUnselectAllId: 'btnUnselectAllA4',
    addQty: false,
    enableStockFilter: false,
    formId: 'prodExportA4-form'
  })

  // PROD 列表 - Barcode (需要數量)
  window.initGenericSelectModal({
    rawId: 'prod-raw-data-barcode',
    bodyId: 'prod-table-body-barcode',
    dataIdAttribute: 'prodId',
    listKeyName: 'PROD_ID',
    btnSelectAllId: 'btnSelectAllBarcode',
    btnUnselectAllId: 'btnUnselectAllBarcode',
    addQty: true,
    enableStockFilter: false,
    formId: 'prodExportBarcode-form'
  })

})