// src/controller/formController.js

const ExcelJS = require('exceljs')
const dayjs = require('dayjs')
const path = require('path')
const fs = require('fs')
const utc = require('dayjs/plugin/utc')
dayjs.extend(utc)

const { mergePhoneNumbers, chunkItems } = require('../utils/formUtils')
const pdfService = require('../services/pdfService')

const saleData = require('../models/saleModel')
const vipData = require('../models/vipModel')
const prodData = require('../models/prodModel')
const stOrderData = require('../models/stOrderModel')
const billData = require('../models/billModel')

const templatePath = path.join(__dirname, '../../public/form/應收帳款明細表_範本.xlsx')
let templateBuffer = null

if (fs.existsSync(templatePath)) {
  templateBuffer = fs.readFileSync(templatePath)
}

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
        '加值', '品名', '售價', '數量', '單位', '小計', '單品折讓', '招待備註',
        '整單折讓', '總金額', '結帳方式', '發票號碼', '載具號碼', '單據備註'
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
            index === 0 ? sale.TOT_DISCHARGE : null,
            index === 0 ? sale.amount : null,
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
    try {
      const { id } = req.params

      // 1. 從資料庫取得資料
      const bill = await billData.getBillById(id)
      if (!bill) return res.status(404).send('找不到資料')

      // 2. 載入單頁範本檔
      const wb = new ExcelJS.Workbook()
      if (!templateBuffer) {
        if (!fs.existsSync(templatePath)) throw new Error('範本檔不存在: ' + templatePath)
        templateBuffer = fs.readFileSync(templatePath)
      }
      await wb.xlsx.load(templateBuffer)

      const ws = wb.getWorksheet(1)
      const billYear = bill.BILL_MONTH.slice(0, 4)
      const billMonth = Number(bill.BILL_MONTH.slice(4, 6))
      const billYearLast = billMonth === 1 ? Number(billYear) - 1 : billYear
      const billMonthLast = billMonth === 1 ? 12 : billMonth - 1
      const tel = bill.VIP?.TELEPHONE || ''
      const mob = bill.VIP?.MOBILE || ''
      const vipTel = tel ? (mob ? `${tel} / ${mob}` : tel) : mob

      // 第一頁表頭基礎資訊填入
      ws.getCell('A2').value = `${billYear} 年 ${billMonth} 月 應收對帳明細表`
      ws.getCell('D4').value = bill.SHOP_NAME
      ws.getCell('K4').value = bill.TEL
      ws.getCell('D6').value = bill.VIP?.VIP_ID || ''
      ws.getCell('K6').value = bill.VIP?.NAME || ''
      ws.getCell('W6').value = bill.VIP?.LINKMAN || ''
      ws.getCell('AG6').value = vipTel
      ws.getCell('D7').value = bill.VIP?.VIP_CODE || ''
      ws.getCell('K7').value = bill.VIP?.COMPANY || ''
      ws.getCell('W7').value = bill.VIP?.COMPANY_ADDR || ''
      ws.getCell('D9').value = `${billYearLast}/${billMonthLast}/26 ~ ${billYear}/${billMonth}/25`
      ws.getCell('N9').value = bill.AMOUNT
      ws.getCell('T9').value = bill.DISCOUNT
      ws.getCell('Y9').value = bill.DISCHARGE
      ws.getCell('AE9').value = bill.MISCELL_COST
      ws.getCell('AK9').value = bill.TOTAL
      ws.getCell('E11').value = bill.TOTAL
      ws.getCell('AI13').value = bill.STR_BAL_ID

      const dataList = bill.SALE_LIST || []
      const tempTopRows = 14
      const pageSize = 16
      const tempBotRows = 1
      const pageRows = tempTopRows + pageSize + tempBotRows // 每頁 31 列
      const totalPages = Math.ceil(dataList.length / pageSize) || 1

      // 取得第一頁原始的合併儲存格資訊
      const firstPageMerges = []
      ws.model.merges.forEach(merge => {
        const [start, end] = merge.split(':')
        const startCol = start.replace(/[0-9]/g, '')
        const startRow = parseInt(start.replace(/[A-Z]/g, ''), 10)
        const endCol = end.replace(/[0-9]/g, '')
        const endRow = parseInt(end.replace(/[A-Z]/g, ''), 10)

        if (startRow <= pageRows && endRow <= pageRows) {
          firstPageMerges.push({
            startCol,
            endCol,
            startRowOffset: startRow - 1,
            rowSpan: endRow - startRow
          })
        }
      })

      // 3. ✅ 高效複製第一頁格式與樣式至第 2 頁以後
      for (let pageIndex = 1; pageIndex < totalPages; pageIndex++) {
        const targetStart = 1 + pageIndex * pageRows

        // 複製列高度、儲存格樣式與非明細區固定數值
        for (let r = 1; r <= pageRows; r++) {
          const sourceRow = ws.getRow(r)
          const targetRow = ws.getRow(targetStart + (r - 1))
          targetRow.height = sourceRow.height

          sourceRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const targetCell = targetRow.getCell(colNumber)

            if (cell.style) {
              targetCell.style = Object.assign({}, cell.style)
            }

            if (r <= tempTopRows || r > tempTopRows + pageSize) {
              targetCell.value = cell.value
            }
          })
        }

        // 複製並套用該頁的合併儲存格
        firstPageMerges.forEach(m => {
          const newStartRow = targetStart + m.startRowOffset
          const newEndRow = newStartRow + m.rowSpan
          ws.mergeCells(`${m.startCol}${newStartRow}:${m.endCol}${newEndRow}`)
        })
      }

      // 4. ✅ 填入各頁銷售明細資料與頁碼
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const startDataIndex = pageIndex * pageSize
        const endDataIndex = Math.min(startDataIndex + pageSize, dataList.length)
        const pageStartRow = 1 + pageIndex * pageRows + tempTopRows

        for (let i = startDataIndex; i < endDataIndex; i++) {
          const rowInPage = i % pageSize
          const rowNumber = pageStartRow + rowInPage
          const data = dataList[i]

          const rawSaleDate = data.SALE_DATE
          const formattedDate = rawSaleDate ? dayjs.utc(rawSaleDate).format('YY-MM-DD') : ''

          const shopName = data.SHOP_NAME ? data.SHOP_NAME.slice(0, 2) : ''
          const typeNum = Number(data.TYPE)
          const type = typeNum < 3 ? (typeNum === 0 ? '銷貨' : typeNum === 1 ? '銷退' : '已退') : null

          ws.getCell(`A${rowNumber}`).value = formattedDate
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

        const pageFooterRow = pageStartRow + pageSize
        ws.getCell(`A${pageFooterRow}`).value = `第${pageIndex + 1} 頁 / 共${totalPages} 頁`
      }

      // 5. 欄寬與列印設定
      for (let i = 1; i <= 40; i++) {
        ws.getColumn(i).width = 3.9
      }

      const lastRow = totalPages * pageRows
      ws.pageSetup.printArea = `A1:AM${lastRow}`
      ws.pageSetup.orientation = 'landscape'
      ws.pageSetup.paperSize = 9

      // 6. Response 傳送
      const fileName = `${bill.VIP?.NAME || ''}_${billYear} 年 ${billMonth} 月 應收對帳明細表.xlsx`
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
      )

      await wb.xlsx.write(res)
      res.end()

    } catch (err) {
      console.error('❌ 匯出失敗：', err)
      res.status(500).send('匯出失敗')
    }
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
    // === 1. 檔案與基礎配置變數 ===
    const TEMPLATE_FILENAME = '補撥明細_範本.xlsx'
    const HEADER_ROWS = 3            // 單頭(2列) + 標題(1列)
    const PAGE_TOTAL_ROWS = 29       // 每 29 列換頁 (固定格式)
    const ROW_HEIGHT = 21           // 資料列高
    const UNIT_CONVERSION = 5.5      // 公分轉 Excel 欄寬係數

    // === 2. 欄寬配置 (單位：公分) ===
    const COL_WIDTH_CM = [
      { col: 1, cm: 4.2 },  // A: 類別
      { col: 2, cm: 7.5 },  // B: 名稱
      { col: 3, cm: 1.3 },  // C: 數量
      { col: 4, cm: 1.1 },  // D: 單位
      { col: 5, cm: 0.2 },  // E: 間距 (窄)
      { col: 6, cm: 4.2 },  // F: 類別
      { col: 7, cm: 7.5 },  // G: 名稱
      { col: 8, cm: 1.3 },  // H: 數量
      { col: 9, cm: 1.1 }   // I: 單位
    ]

    // === 3. 版面設定變數 ===
    const PAGE_SETUP = {
      orientation: 'landscape',      // 橫式
      paperSize: 9,                  // A4
      margins: {
        left: 0.2, right: 0.2,
        top: 0.5, bottom: 0,
        header: 0.18, footer: 0
      },
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    }

    // === 4. 頁首頁尾設定 ===
    const HEADER_FOOTER = {
      oddHeader: '&C&16&"微軟正黑體,粗體"補撥明細表',
      oddFooter: '&R第 &P 頁，共 &N 頁'
    }

    // === 5. 樣式定義 ===
    const BORDER_STYLE = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
    // ==========================================

    try {
      const id = req.body.ORDER_ID
      if (!id) return res.status(400).send('缺少 ORDER_ID')

      const order = await stOrderData.getOrderDetail(id)
      if (!order) return res.status(404).send('找不到訂單資料')

      const wb = new ExcelJS.Workbook()
      const templatePath = path.join(__dirname, '../../public/form/', TEMPLATE_FILENAME)

      if (!fs.existsSync(templatePath)) {
        return res.status(500).send('範本檔不存在: ' + templatePath)
      }

      await wb.xlsx.readFile(templatePath)
      const ws = wb.getWorksheet(1)

      // 套用欄寬
      COL_WIDTH_CM.forEach(item => {
        ws.getColumn(item.col).width = item.cm * UNIT_CONVERSION
      })

      // 套用版面設定
      ws.pageSetup = {
        ...PAGE_SETUP,
        headerFooter: HEADER_FOOTER
      }

      const dataList = order.PROD_DATA || []
      const dataRowsPerPage = PAGE_TOTAL_ROWS - HEADER_ROWS
      const pageSize = dataRowsPerPage * 2
      const totalPages = Math.ceil(dataList.length / pageSize) || 1

      const copyPageTemplate = (ws, sourceStart, sourceEnd, targetStart) => {
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
        const startRow = 1 + (pageIndex * PAGE_TOTAL_ROWS)

        // 如果是第二頁以後，複製第一頁的標題與單頭格式
        if (pageIndex > 0) {
          copyPageTemplate(ws, 1, HEADER_ROWS, startRow)
        }

        // 填寫單頭
        ws.getCell(`B${startRow}`).value = order.SHOP_ID
        ws.getCell(`G${startRow}`).value = order.APP_DATE
        ws.getCell(`B${startRow + 1}`).value = order.USER
        ws.getCell(`G${startRow + 1}`).value = order.ORDER_ID

        const startDataIndex = pageIndex * pageSize
        const endDataIndex = Math.min(startDataIndex + pageSize, dataList.length)

        // --- 填寫明細資料 ---
        for (let i = startDataIndex; i < endDataIndex; i++) {
          const item = dataList[i]
          const relativeIndex = i - startDataIndex
          const isLeft = relativeIndex < dataRowsPerPage
          const rowInPage = isLeft ? relativeIndex : relativeIndex - dataRowsPerPage
          const rowNumber = startRow + HEADER_ROWS + rowInPage

          const colMap = isLeft
            ? { dep: 'A', name: 'B', qty: 'C', unit: 'D' }
            : { dep: 'F', name: 'G', qty: 'H', unit: 'I' }

          ws.getCell(`${colMap.dep}${rowNumber}`).value = item.DEP
          ws.getCell(`${colMap.name}${rowNumber}`).value = item.PROD_NAME
          ws.getCell(`${colMap.qty}${rowNumber}`).value = item.QUANTITY
          ws.getCell(`${colMap.unit}${rowNumber}`).value = item.UNIT

          // 套用邊框、字體與對齊
          Object.entries(colMap).forEach(([key, col]) => {
            const cell = ws.getCell(`${col}${rowNumber}`)
            cell.border = BORDER_STYLE
            const isAlignLeft = key === 'dep' || key === 'name'

            cell.alignment = {
              vertical: 'middle',
              horizontal: isAlignLeft ? 'left' : 'center',
              wrapText: true
            }
          })

          ws.getRow(rowNumber).height = ROW_HEIGHT
        }

        // 設定分頁符號
        if (pageIndex < totalPages - 1) {
          ws.getRow(startRow + PAGE_TOTAL_ROWS - 1).addPageBreak()
        }
      }

      // 設定列印區域
      ws.pageSetup.printArea = `A1:I${totalPages * PAGE_TOTAL_ROWS}`
      ws.views = []

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
    // === 1. 檔案與基礎配置變數 ===
    const TEMPLATE_FILENAME = '出貨明細_範本.xlsx'
    const HEADER_ROWS = 4            // 單頭(3列) + 標題(1列)
    const PAGE_TOTAL_ROWS = 28       // 每頁總列數
    const ROW_HEIGHT = 21           // 資料列高
    const UNIT_CONVERSION = 5.5      // 公分轉 Excel 欄寬係數

    // === 2. 欄寬配置 (單位：公分) ===
    const COL_WIDTH_CM = [
      { col: 1, cm: 4.2 },  // A: 商品類別
      { col: 2, cm: 7.5 },  // B: 商品名稱
      { col: 3, cm: 1.3 },  // C: 數量
      { col: 4, cm: 1.1 },  // D: 單位
      { col: 5, cm: 0.2 },  // E: 間距 (窄)
      { col: 6, cm: 4.2 },  // F: 商品類別
      { col: 7, cm: 7.5 },  // G: 商品名稱
      { col: 8, cm: 1.3 },  // H: 數量
      { col: 9, cm: 1.1 }   // I: 單位
    ]

    // === 3. 版面設定變數 ===
    const PAGE_SETUP = {
      orientation: 'landscape',      // 橫式
      paperSize: 9,                  // A4
      margins: {
        left: 0.2, right: 0.2,
        top: 0.5, bottom: 0,
        header: 0.18, footer: 0
      },
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true       // 水平置中
    }

    // === 4. 頁首頁尾設定 ===
    const HEADER_FOOTER = {
      oddHeader: '&C&16&"微軟正黑體,粗體"出貨明細表',
      oddFooter: '&R第 &P 頁，共 &N 頁'
    }

    // === 5. 樣式定義 ===
    const BORDER_STYLE = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
    // ==========================================

    try {
      const outId = req.body.OUT_ID
      if (!outId) return res.status(400).send('缺少 OUT_ID')

      const order = await stOrderData.getOrderOutDetail(outId)
      if (!order) return res.status(404).send('找不到訂單資料')

      const wb = new ExcelJS.Workbook()
      const templatePath = path.join(__dirname, '../../public/form/', TEMPLATE_FILENAME)

      if (!fs.existsSync(templatePath)) {
        return res.status(500).send('範本檔不存在: ' + templatePath)
      }

      await wb.xlsx.readFile(templatePath)
      const ws = wb.getWorksheet(1)

      // 套用欄寬
      COL_WIDTH_CM.forEach(item => {
        ws.getColumn(item.col).width = item.cm * UNIT_CONVERSION
      })

      // 套用版面設定
      ws.pageSetup = {
        ...PAGE_SETUP,
        headerFooter: HEADER_FOOTER
      }

      const dataList = order.PROD_DATA || []
      const dataRowsPerPage = PAGE_TOTAL_ROWS - HEADER_ROWS
      const pageSize = dataRowsPerPage * 2 // 左右兩側對開
      const totalPages = Math.ceil(dataList.length / pageSize) || 1

      const copyPageTemplate = (ws, sourceStart, sourceEnd, targetStart) => {
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
        const startRow = 1 + (pageIndex * PAGE_TOTAL_ROWS)

        // 如果是第二頁以後，複製第一頁的標題與單頭格式
        if (pageIndex > 0) {
          copyPageTemplate(ws, 1, HEADER_ROWS, startRow)
        }

        // 填寫單頭
        ws.getCell(`B${startRow}`).value = order.TO_SHOP
        ws.getCell(`G${startRow}`).value = order.OUT_ID
        ws.getCell(`B${startRow + 1}`).value = order.USER
        ws.getCell(`G${startRow + 1}`).value = order.INPUT_DATE
        ws.getCell(`B${startRow + 2}`).value = order.APP_USER
        ws.getCell(`G${startRow + 2}`).value = order.APP_DATE

        const startDataIndex = pageIndex * pageSize
        const endDataIndex = Math.min(startDataIndex + pageSize, dataList.length)

        // --- 填寫明細資料 ---
        for (let i = startDataIndex; i < endDataIndex; i++) {
          const item = dataList[i]
          const relativeIndex = i - startDataIndex
          const isLeft = relativeIndex < dataRowsPerPage
          const rowInPage = isLeft ? relativeIndex : relativeIndex - dataRowsPerPage
          const rowNumber = startRow + HEADER_ROWS + rowInPage

          const colMap = isLeft
            ? { dep: 'A', name: 'B', qty: 'C', unit: 'D' }
            : { dep: 'F', name: 'G', qty: 'H', unit: 'I' }

          ws.getCell(`${colMap.dep}${rowNumber}`).value = item.DEP
          ws.getCell(`${colMap.name}${rowNumber}`).value = item.PROD_NAME
          ws.getCell(`${colMap.qty}${rowNumber}`).value = item.QUANTITY
          ws.getCell(`${colMap.unit}${rowNumber}`).value = item.UNIT

          // 套用邊框、字體與對齊
          Object.entries(colMap).forEach(([key, col]) => {
            const cell = ws.getCell(`${col}${rowNumber}`)
            cell.border = BORDER_STYLE
            const isAlignLeft = key === 'dep' || key === 'name'

            cell.alignment = {
              vertical: 'middle',
              horizontal: isAlignLeft ? 'left' : 'center',
              wrapText: true
            }
          })

          ws.getRow(rowNumber).height = ROW_HEIGHT
        }

        // 設定分頁符號
        if (pageIndex < totalPages - 1) {
          ws.getRow(startRow + PAGE_TOTAL_ROWS - 1).addPageBreak()
        }
      }

      // 設定列印區域
      ws.pageSetup.printArea = `A1:I${totalPages * PAGE_TOTAL_ROWS}`
      ws.views = []

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
