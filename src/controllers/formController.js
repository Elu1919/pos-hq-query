// src/controller/formController.js

const ExcelJS = require('exceljs')
const dayjs = require('dayjs')
const path = require('path')
const fs = require('fs')

const { mergePhoneNumbers, chunkItems } = require('../utils/formUtils')
const pdfService = require('../services/pdfService')

const saleData = require('../models/saleModel')
const vipData = require('../models/vipModel')
const prodData = require('../models/prodModel')
const stOrderData = require('../models/stOrderModel')

const formController = {
  exportSalesData: async (req, res) => {
    const filterIn = { ...req.body }

    try {
      const [sales, lists] = await saleData.getAllSaleData(filterIn)

      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('銷售資料')

      // 標題列
      sheet.addRow([
        '門市', '單據類型', '單據編號', '日期', '貴賓名稱',
        '加值', '品名', '售價', '數量', '單位', '小計', '折讓', '招待備註',
        '總金額', '總折讓', '結帳方式', '發票號碼', '載具號碼', '單據備註'
      ])

      let currentRow = 2

      sales.forEach(sale => {
        const prodCount = sale.PROD_LIST.length || 1
        const startRow = sheet.lastRow.number + 1
        const type = Number(sale.TYPE) < 3 ? Number(sale.TYPE) === 0 ? '銷貨' : Number(sale.TYPE) === 1 ? '銷退' : '已退' : null
        const memo = [sale.spec_memo, sale.MEMO].filter(Boolean).join('\n')

        sale.PROD_LIST.forEach((prod, index) => {
          const rowValues = [
            index === 0 ? sale.SHOP_ID : null,
            index === 0 ? type : null,
            index === 0 ? sale.SALE_ID : null,
            index === 0 ? sale.SALE_DATE : null,
            index === 0 ? sale.VIP.NAME : null,
            prod.TASTE_MEMO,
            prod.PROD_NAME1,
            prod.SALE_PRICE,
            prod.QTY,
            prod.UNIT_NAME,
            prod.SUBTOTAL,
            prod.ITEM_DISC,
            prod.FREE_MEMO,
            index === 0 ? sale.amount : null,
            index === 0 ? sale.TOT_DISCHARGE : null,
            index === 0 ? sale.PAY_NAME : null,
            index === 0 ? sale.invo_no_b : null,
            index === 0 ? sale.buyer_number : null,
            index === 0 ? memo : null
          ]
          sheet.addRow(rowValues)
        })

        // 自動調整欄寬、凍結列、樣式與合併欄位
        sheet.columns.forEach(col => {
          let maxLength = 5
          col.eachCell({ includeEmpty: true }, cell => {
            const len = cell.value ? cell.value.toString().length : 0
            if (len > maxLength) maxLength = len
          })
          col.width = maxLength * 1.8
        })
        sheet.views = [{ state: 'frozen', ySplit: 1 }]
        sheet.eachRow({ includeEmpty: true }, row => {
          row.eachCell({ includeEmpty: true }, cell => {
            if (cell.value == null) cell.value = ''
            cell.alignment = { vertical: 'middle', horizontal: 'center' }
            cell.font = { name: 'Microsoft JhengHei', size: 11 }
            if ([8, 9, 11, 12, 14, 15].includes(cell.col)) cell.alignment.horizontal = 'right'
            if ([7].includes(cell.col)) cell.alignment.horizontal = 'left'
            if ([1].includes(cell.row)) {
              cell.alignment.horizontal = 'center'
              cell.font = { name: 'Microsoft JhengHei', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } }
            }
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
          })
        })
        if (prodCount > 1) {
          [1, 2, 3, 4, 5, 14, 15, 16, 17, 18, 19].forEach(col => sheet.mergeCells(startRow, col, startRow + prodCount - 1, col))
        }

        currentRow += prodCount
      })

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', 'attachment; filename=sale_data.xlsx')
      await workbook.xlsx.write(res)
      res.end()
    } catch (err) {
      res.status(500).send('資料取得失敗')
    }
  },

  exportBillById: async (req, res) => {
    const { id } = req.params
    const { bills } = req.body
    const bill = bills.find(b => b.STR_BAL_ID === id)
    if (!bill) return res.status(404).send('找不到資料')

    const ExcelJS = require('exceljs')
    const wb = new ExcelJS.Workbook()
    const templatePath = path.join(__dirname, '../../public/form/應收帳款明細表_範本.xlsx')
    if (!fs.existsSync(templatePath)) throw new Error('範本檔不存在: ' + templatePath)
    await wb.xlsx.readFile(templatePath)

    const ws = wb.getWorksheet(1)
    const billYear = bill.BILL_MONTH.slice(0, 4)
    const billMonth = Number(bill.BILL_MONTH.slice(4, 6))
    const billYearLast = billMonth === 1 ? billYear - 1 : billYear
    const billMonthLast = billMonth === 1 ? 12 : billMonth - 1
    const tel = bill.VIP.TELEPHONE || ''
    const mob = bill.VIP.MOBILE || ''
    const vipTel = tel ? mob ? `${tel} / ${mob}` : tel : mob

    ws.getCell('A2').value = `${billYear} 年 ${billMonth} 月 應收對帳明細表`
    ws.getCell('D4').value = bill.SHOP_NAME
    ws.getCell('K4').value = bill.TEL
    ws.getCell('D6').value = bill.VIP.VIP_ID
    ws.getCell('K6').value = bill.VIP.NAME
    ws.getCell('W6').value = bill.VIP.LINKMAN
    ws.getCell('AG6').value = vipTel
    ws.getCell('D7').value = bill.VIP.VIP_CODE
    ws.getCell('K7').value = bill.VIP.COMPANY
    ws.getCell('W7').value = bill.VIP.COMPANY_ADDR
    ws.getCell('D9').value = `${billYearLast}/${billMonthLast}/26 ~ ${billYear}/${billMonth}/25`
    ws.getCell('N9').value = bill.AMOUNT
    ws.getCell('T9').value = bill.DISCOUNT
    ws.getCell('Y9').value = bill.DISCHARGE
    ws.getCell('AE9').value = bill.MISCELL_COST
    ws.getCell('AK9').value = bill.TOTAL
    ws.getCell('E11').value = bill.TOTAL
    ws.getCell('AI13').value = bill.STR_BAL_ID

    const dataList = bill.SALE_LIST

    let startRow = 1
    const tempTopRows = 14
    const pageSize = 16
    const tempBotRows = 1
    const pageRows = tempTopRows + pageSize + tempBotRows

    function copyTemplate(ws, sourceStart, sourceEnd, targetStart) {
      for (let r = sourceStart; r <= sourceEnd; r++) {
        const sourceRow = ws.getRow(r)
        const targetRow = ws.getRow(targetStart + (r - sourceStart))
        targetRow.height = sourceRow.height
        sourceRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const targetCell = targetRow.getCell(colNumber)
          targetCell.value = cell.value
          targetCell.style = { ...cell.style }
        })
      }
      for (let r = targetStart + tempTopRows; r < targetStart + tempTopRows + pageSize; r++) {
        ws.getRow(r).eachCell({ includeEmpty: true }, (cell) => { cell.value = null })
      }
    }

    const totalPages = Math.ceil(dataList.length / pageSize)

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      if (pageIndex > 0) {
        const targetStart = startRow + pageIndex * pageRows
        copyTemplate(ws, 1, pageRows, targetStart)
      }

      // 填資料 
      const startDataIndex = pageIndex * pageSize
      const endDataIndex = Math.min(startDataIndex + pageSize, dataList.length)

      for (let i = startDataIndex; i < endDataIndex; i++) {
        const rowInPage = i % pageSize
        const rowNumber = startRow + pageIndex * pageRows + tempTopRows + rowInPage
        const data = dataList[i]
        const orderDate = data.ORDER_TIME.toString().replace('Z', '')
        const shopName = data.SHOP_NAME.slice(0, 2)
        const type = Number(data.TYPE) < 3 ? Number(data.TYPE) === 0 ? '銷貨' : Number(data.TYPE) === 1 ? '銷退' : '已退' : null

        ws.getCell(`A${rowNumber}`).value = dayjs(orderDate).format('YY-MM-DD')
        ws.getCell(`D${rowNumber}`).value = shopName
        ws.getCell(`F${rowNumber}`).value = type
        ws.getCell(`H${rowNumber}`).value = data.SALE_ID
        ws.getCell(`N${rowNumber}`).value = data.PROD_NAME1
        ws.getCell(`W${rowNumber}`).value = data.SALE_PRICE
        ws.getCell(`Z${rowNumber}`).value = data.QTY
        ws.getCell(`AB${rowNumber}`).value = data.UNIT_NAME
        ws.getCell(`AC${rowNumber}`).value = data.SUBTOTAL
        ws.getCell(`AF${rowNumber}`).value = data.ITEM_DISC
        ws.getCell(`AI${rowNumber}`).value = data.FREE_MEMO
      }

      // 頁碼 
      const rowNumber = startRow + pageIndex * pageRows + tempTopRows + pageSize
      ws.getCell(`A${rowNumber}`).value = `第${pageIndex + 1} 頁 / 共${totalPages} 頁`
    }

    // 欄寬調整 
    for (let i = 1; i <= 40; i++) {
      ws.getColumn(i).width = 3.9
    }

    // 設定列印範圍與橫向列印 
    const lastRow = totalPages * pageRows
    ws.pageSetup.printArea = `A1:AM${lastRow}`
    ws.pageSetup.orientation = 'landscape'
    ws.pageSetup.paperSize = 9

    // 設定下載 header
    const fileName = `${bill.VIP.NAME}_${billYear} 年 ${billMonth} 月 應收對帳明細表.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
    )
    await wb.xlsx.write(res)
    res.end()
  },

  exportVipA4barcode: async (req, res) => {
    const { vipIdList } = req.body
    const parsedList = Array.isArray(vipIdList) ? vipIdList : []
    const vipIds = parsedList.map(v => v.VIP_ID)

    try {
      const vips = await vipData.getExportData(vipIds)

      if (!vips || !vips.length) {
        req.flash('err_msg', '無法輸出：貴賓不存在')
        return res.redirect('/vip/vip-data')
      }

      const { pdfDoc, fontBold, fontRegular } = await pdfService.initPdfDocument()

      // 提取貴賓內容的函式 (傳入 drawA4Item)
      const getVipContent = (item, fontRegular, maxWidth) => {
        const TELEPHONE = item.TELEPHONE || ''
        const MOBILE = item.MOBILE || ''
        const phoneText = mergePhoneNumbers(TELEPHONE, MOBILE)

        const wrappedName = pdfService.wrapText(item.NAME, fontRegular, pdfService.FONT_SIZE, maxWidth)

        return [...wrappedName, item.VIP_ID, phoneText]
      }

      const perPage = 30
      const chunks = chunkItems(vips, perPage)

      // ➤ PDF 內容繪製
      for (const chunk of chunks) {
        const page = pdfDoc.addPage([pdfService.A4_PAGE_WIDTH, pdfService.A4_PAGE_HEIGHT])
        let cursorY = pdfService.A4_PAGE_HEIGHT - pdfService.A4_MARGIN.top

        // 標頭
        pdfService.drawA4Header(page, fontRegular, '貴賓條碼簿')

        // 標題列
        const headerYPos = pdfService.drawA4TitleRow(page, fontBold, ['名稱/電話/編號', '條碼'], cursorY)
        cursorY = headerYPos

        for (let row = 1; row <= pdfService.A4_ROW_SET.count; row++) {
          const listIndex = row - 1
          const leftItem = chunk[listIndex]
          const rightItem = chunk[listIndex + perPage / 2]

          // 繪製左欄
          await pdfService.drawA4Item(
            pdfDoc, page, leftItem, pdfService.A4_MARGIN.left, 0,
            row, cursorY, fontRegular, getVipContent
          )

          // 繪製右欄
          const rightStartX = pdfService.A4_MARGIN.left + pdfService.A4_COL_WIDTHS.slice(0, 3).reduce((a, b) => a + b, 0)
          await pdfService.drawA4Item(
            pdfDoc, page, rightItem, rightStartX, 3,
            row, cursorY, fontRegular, getVipContent
          )

          // 繪製邊框
          cursorY = pdfService.drawA4Border(page, cursorY, row)
        }
      }

      // ➤ PDF 輸出 (抽出為共用邏輯)
      pdfDoc.setTitle('貴賓A4條碼簿.pdf')
      const pdfBytes = await pdfDoc.save()

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent('貴賓A4條碼簿.pdf')}`)
      res.send(Buffer.from(pdfBytes))

    } catch (err) {
      console.error('PDF生成失敗', err)
      res.status(500).send('資料取得失敗')
    }
  },

  exportVipBarcode: async (req, res) => {
    const { vipIdList } = req.body
    const parsedList = Array.isArray(vipIdList) ? vipIdList : []
    const vipIds = parsedList.map(v => v.VIP_ID)

    try {
      const vips = await vipData.getExportData(vipIds)

      if (!vips) {
        req.flash('err_msg', '無法輸出：貴賓不存在')
        return res.redirect('/vip/vip-data')
      }

      const qtyMap = new Map(parsedList.map(item => [item.VIP_ID, item.qty]))
      for (const v of vips) {
        v.qty = qtyMap.get(v.VIP_ID) || 1
      }

      const { pdfDoc, fontBold, fontRegular } = await pdfService.initPdfDocument()

      // 提取貴賓電話/手機的函式 (傳入 drawLabelSticker)
      const getVipDepContent = (item) => {
        return mergePhoneNumbers(item.TELEPHONE, item.MOBILE)
      }

      // ➤ 條碼內容
      for (const vip of vips) {
        await pdfService.drawLabelSticker(
          pdfDoc, vip, fontBold, fontRegular, vip.qty,
          'VIP_ID', 'NAME', getVipDepContent
        )
      }

      // PDF 輸出
      pdfDoc.setTitle(`貴賓條碼標籤貼.pdf`)
      const pdfBytes = await pdfDoc.save()

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader(
        'Content-Disposition',
        `inline; filename*=UTF-8''${encodeURIComponent('貴賓條碼標籤貼.pdf')}`
      )
      res.send(Buffer.from(pdfBytes))

    } catch (err) {
      res.status(500).send('資料取得失敗')
    }
  },

  exportProdA4barcode: async (req, res) => {
    const { prodIdList } = req.body
    const parsedList = Array.isArray(prodIdList) ? prodIdList : []
    const prodIds = parsedList.map(v => v.PROD_ID)

    try {
      // 注意：此處 prodData.getExportData 已經在 prodModel.js 中修正，會包含 PROD_ID 和 PROD_NAME1
      const products = await prodData.getExportData(prodIds)

      if (!products || !products.length) {
        return res.status(404).send('無法輸出：產品不存在')
      }

      const { pdfDoc, fontBold, fontRegular } = await pdfService.initPdfDocument()

      // 提取產品內容的函式 (傳入 drawA4Item)
      const getProdContent = (item, fontRegular, maxWidth) => {
        // 【關鍵修正】：確保 PROD_NAME2 和 DEP_NAME 即使為 null/undefined 也能安全地轉換為字串

        // 1. 取得要換行的名稱，並確保它是字串
        // item.PROD_NAME1 來自資料庫，作為 PROD_NAME2 的備援
        const nameToWrap = String(item.PROD_NAME2 || item.PROD_NAME1 || '')

        // 2. 進行換行處理
        const wrappedName = pdfService.wrapText(nameToWrap, fontRegular, pdfService.FONT_SIZE, maxWidth)

        // 3. 組合內容陣列，確保 PROD_ID 和 DEP_NAME 都是字串
        return [
          ...wrappedName,
          String(item.PROD_ID || ''), // 確保 PROD_ID 為字串
          String(item.DEP_NAME || '') // 確保 DEP_NAME 即使是 null 也能轉換為空字串
        ]
      }

      const perPage = 30
      const chunks = chunkItems(products, perPage)

      // ➤ PDF 內容繪製
      for (const chunk of chunks) {
        const page = pdfDoc.addPage([pdfService.A4_PAGE_WIDTH, pdfService.A4_PAGE_HEIGHT])
        let cursorY = pdfService.A4_PAGE_HEIGHT - pdfService.A4_MARGIN.top

        // 標頭
        pdfService.drawA4Header(page, fontRegular, '商品條碼簿')

        // 標題列
        const headerYPos = pdfService.drawA4TitleRow(page, fontBold, ['名稱/編號/類別', '條碼'], cursorY)
        cursorY = headerYPos

        for (let row = 1; row <= pdfService.A4_ROW_SET.count; row++) {
          const listIndex = row - 1
          const leftItem = chunk[listIndex]
          const rightItem = chunk[listIndex + perPage / 2]

          // 繪製左欄
          await pdfService.drawA4Item(
            pdfDoc, page, leftItem, pdfService.A4_MARGIN.left, 0,
            row, cursorY, fontRegular, getProdContent
          )

          // 繪製右欄
          const rightStartX = pdfService.A4_MARGIN.left + pdfService.A4_COL_WIDTHS.slice(0, 3).reduce((a, b) => a + b, 0)
          await pdfService.drawA4Item(
            pdfDoc, page, rightItem, rightStartX, 3,
            row, cursorY, fontRegular, getProdContent
          )

          // 繪製邊框
          cursorY = pdfService.drawA4Border(page, cursorY, row)
        }
      }

      // ➤ PDF 輸出
      pdfDoc.setTitle('產品A4條碼簿.pdf')
      const pdfBytes = await pdfDoc.save()

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent('產品A4條碼簿.pdf')}`)
      res.send(Buffer.from(pdfBytes))

    } catch (err) {
      console.error('產品 A4 條碼 PDF 生成失敗', err)
      res.status(500).send('資料取得失敗')
    }
  },

  exportProdBarcode: async (req, res) => {
    const { prodIdList } = req.body
    const parsedList = Array.isArray(prodIdList) ? prodIdList : []
    const prodIds = parsedList.map(v => v.PROD_ID)

    try {
      const products = await prodData.getExportData(prodIds)

      if (!products) {
        return res.status(404).send('無法輸出：產品不存在')
      }

      const qtyMap = new Map(parsedList.map(item => [item.PROD_ID, item.qty]))

      for (const p of products) {
        p.qty = qtyMap.get(p.PROD_ID) || 1
      }

      const { pdfDoc, fontBold, fontRegular } = await pdfService.initPdfDocument()

      // 產品標籤沒有附屬資訊，留空
      const getProdDepContent = (item) => {
        // 產品名稱已在 drawLabelSticker 繪製，這裡僅繪製類別或留空
        return item.DEP_NAME || ''
      }

      // ➤ 條碼內容
      for (const prod of products) {
        await pdfService.drawLabelSticker(
          pdfDoc, prod, fontBold, fontRegular, prod.qty,
          'PROD_ID', 'PROD_NAME1', getProdDepContent
        )
      }

      // PDF 輸出
      pdfDoc.setTitle(`產品條碼標籤貼.pdf`)
      const pdfBytes = await pdfDoc.save()

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader(
        'Content-Disposition',
        `inline; filename*=UTF-8''${encodeURIComponent('產品條碼標籤貼.pdf')}`
      )

      res.send(Buffer.from(pdfBytes))

    } catch (err) {
      console.error('產品條碼標籤貼 PDF 生成失敗', err)
      res.status(500).send('資料取得失敗')
    }
  },

  exportStOrderData: async (req, res) => {
    try {
      const id = req.body.ORDER_ID
      if (!id) return res.status(400).send('缺少 ORDER_ID')

      const order = await stOrderData.getOrderDetail(id)
      if (!order) return res.status(404).send('找不到訂單資料')

      const wb = new ExcelJS.Workbook()
      const templatePath = path.join(__dirname, '../../public/form/補撥明細_範本.xlsx')

      if (!fs.existsSync(templatePath)) {
        return res.status(500).send('範本檔不存在: ' + templatePath)
      }

      await wb.xlsx.readFile(templatePath)
      const ws = wb.getWorksheet(1)

      // --- 設定分頁與高度參數 ---
      const dataList = order.PROD_DATA || []
      const tempTopRows = 3
      const pageRows = 27
      const pageSize = pageRows - tempTopRows
      const totalPages = Math.ceil(dataList.length / pageSize) || 1
      const rowHeightCm = 30

      // --- 調整欄位寬度 ---
      ws.getColumn(1).width = 10    // A: #
      ws.getColumn(2).width = 25   // B: 商品類別 (再次增加)
      ws.getColumn(3).width = 40   // C: 商品名稱
      ws.getColumn(4).width = 8    // D: 數量
      ws.getColumn(5).width = 8    // E: 單位 (再次縮小)
      ws.getColumn(6).width = 17   // F: 備註

      const borderStyle = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }

      function copyPageTemplate(ws, sourceStart, sourceEnd, targetStart) {
        for (let r = sourceStart; r <= sourceEnd; r++) {
          const sourceRow = ws.getRow(r)
          const targetRow = ws.getRow(targetStart + (r - sourceStart))
          targetRow.height = sourceRow.height
          sourceRow.eachCell({ includeEmpty: true }, (sourceCell, colNumber) => {
            const targetCell = targetRow.getCell(colNumber)
            targetCell.value = sourceCell.value
            targetCell.style = sourceCell.style
          })
        }
      }

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const startRow = 1 + (pageIndex * pageRows)

        if (pageIndex > 0) {
          copyPageTemplate(ws, 1, tempTopRows, startRow)
        }

        // --- 填寫單頭 ---
        ws.getCell(`B${startRow}`).value = order.SHOP_ID
        ws.getCell(`D${startRow}`).value = order.INPUT_DATE
        ws.getCell(`B${startRow + 1}`).value = order.USER
        ws.getCell(`D${startRow + 1}`).value = order.ORDER_ID

        // --- 填寫明細 ---
        const startDataIndex = pageIndex * pageSize
        const endDataIndex = Math.min(startDataIndex + pageSize, dataList.length)

        for (let i = startDataIndex; i < endDataIndex; i++) {
          const rowInPage = i % pageSize
          const rowNumber = startRow + tempTopRows + rowInPage
          const item = dataList[i]
          const currentRow = ws.getRow(rowNumber)

          currentRow.height = rowHeightCm

          const rowData = {
            A: item.ORDER_SNO || (i + 1),
            B: item.DEP,
            C: item.PROD_NAME,
            D: item.QUANTITY,
            E: item.UNIT,
            F: item.MEMO1
          }

          Object.keys(rowData).forEach(col => {
            const cell = ws.getCell(`${col}${rowNumber}`)
            cell.value = rowData[col]
            cell.border = borderStyle

            // 對齊：A(序號)、D(數量)、E(單位) 置中
            let hAlign = 'left'
            if (['A', 'D', 'E'].includes(col)) {
              hAlign = 'center'
            }

            cell.alignment = {
              vertical: 'middle',
              horizontal: hAlign,
              wrapText: true // 寬度變動大，統一開啟自動換行
            }
          })
        }
      }

      ws.views = [] // 確保取消凍結視窗

      const lastRow = totalPages * pageRows
      ws.pageSetup.printArea = `A1:F${lastRow}`
      ws.pageSetup.orientation = 'portrait'
      ws.pageSetup.paperSize = 9

      const fileName = `補撥明細_${order.SHOP_ID}_${dayjs().format('YYYYMMDD')}.xlsx`
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`)

      await wb.xlsx.write(res)
      res.end()

    } catch (err) {
      console.error('Excel 匯出失敗:', err)
      if (!res.headersSent) res.status(500).send('匯出失敗')
    }
  },

  exportStOrderOutData: async (req, res) => {
    try {
      const outId = req.body.OUT_ID
      if (!outId) return res.status(400).send('缺少 OUT_ID')

      const order = await stOrderData.getOrderOutDetail(outId)
      if (!order) return res.status(404).send('找不到訂單資料')

      const wb = new ExcelJS.Workbook()
      const templatePath = path.join(__dirname, '../../public/form/出貨明細_範本.xlsx')
      if (!fs.existsSync(templatePath)) return res.status(500).send('範本檔不存在')

      await wb.xlsx.readFile(templatePath)
      const ws = wb.getWorksheet(1)

      // --- 設定分頁參數 ---
      const dataList = order.PROD_DATA || []
      const tempTopRows = 4    // 出貨單範本單頭佔 3 列，第 4 列是標題
      const pageRows = 27
      const pageSize = pageRows - tempTopRows
      const totalPages = Math.ceil(dataList.length / pageSize) || 1
      const rowHeightCm = 30

      // --- 調整欄位寬度 (同步為要求寬度) ---
      ws.getColumn(1).width = 10    // A: #
      ws.getColumn(2).width = 25    // B: 商品類別
      ws.getColumn(3).width = 40    // C: 商品名稱
      ws.getColumn(4).width = 8     // D: 數量
      ws.getColumn(5).width = 8     // E: 單位
      ws.getColumn(6).width = 17    // F: 備註

      const borderStyle = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      }

      function copyPageTemplate(ws, sourceStart, sourceEnd, targetStart) {
        for (let r = sourceStart; r <= sourceEnd; r++) {
          const sourceRow = ws.getRow(r)
          const targetRow = ws.getRow(targetStart + (r - sourceStart))
          targetRow.height = sourceRow.height
          sourceRow.eachCell({ includeEmpty: true }, (sourceCell, colNumber) => {
            const targetCell = targetRow.getCell(colNumber)
            targetCell.value = sourceCell.value
            targetCell.style = sourceCell.style
          })
        }
      }

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const startRow = 1 + (pageIndex * pageRows)
        if (pageIndex > 0) copyPageTemplate(ws, 1, tempTopRows, startRow)

        // --- 填寫出貨單單頭 (根據範本位置) ---
        ws.getCell(`B${startRow}`).value = order.TO_SHOP      // 收貨門市
        ws.getCell(`D${startRow}`).value = order.OUT_ID       // 出貨單號
        ws.getCell(`B${startRow + 1}`).value = order.USER    // 負責人員
        ws.getCell(`D${startRow + 1}`).value = order.INPUT_DATE // 建立日期
        ws.getCell(`B${startRow + 2}`).value = order.APP_USER // 核准人員
        ws.getCell(`D${startRow + 2}`).value = order.APP_DATE // 核准日期

        // --- 填寫明細 ---
        const startDataIndex = pageIndex * pageSize
        const endDataIndex = Math.min(startDataIndex + pageSize, dataList.length)

        for (let i = startDataIndex; i < endDataIndex; i++) {
          const rowInPage = i % pageSize
          const rowNumber = startRow + tempTopRows + rowInPage
          const item = dataList[i]

          ws.getRow(rowNumber).height = rowHeightCm
          const rowData = {
            A: item.ORDER_SNO || (i + 1),
            B: item.DEP,
            C: item.PROD_NAME,
            D: item.QUANTITY,
            E: item.UNIT,
            F: item.MEMO1
          }

          Object.keys(rowData).forEach(col => {
            const cell = ws.getCell(`${col}${rowNumber}`)
            cell.value = rowData[col]
            cell.border = borderStyle
            cell.alignment = {
              vertical: 'middle',
              horizontal: ['A', 'D', 'E'].includes(col) ? 'center' : 'left',
              wrapText: true
            }
          })
        }
      }

      ws.views = []
      ws.pageSetup.printArea = `A1:F${totalPages * pageRows}`
      ws.pageSetup.orientation = 'portrait'
      ws.pageSetup.paperSize = 9

      const fileName = `出貨明細_${order.TO_SHOP}_${dayjs().format('YYYYMMDD')}.xlsx`
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}"`)

      await wb.xlsx.write(res)
      res.end()

    } catch (err) {
      console.error('Excel 匯出失敗:', err)
      if (!res.headersSent) res.status(500).send('匯出失敗')
    }
  }

}

module.exports = formController
