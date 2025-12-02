// src/controller/formController.js

const ExcelJS = require('exceljs')
const bwipjs = require('bwip-js')
const { PDFDocument, rgb } = require('pdf-lib')
const fontkit = require('fontkit')

const dayjs = require('dayjs')
const path = require('path')
const fs = require('fs')

const saleData = require('../models/saleModel')
const vipData = require('../models/vipModel')

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
    const { vipList } = req.body
    const parsedList = Array.isArray(vipList) ? vipList : []
    const vipIds = parsedList.map(v => v.VIP_ID)

    try {
      const vips = await vipData.getExportData(vipIds)

      if (!vips || !vips.length) {
        req.flash('err_msg', '無法輸出：貴賓不存在')
        return res.redirect('/vip/vip-data')
      }

      // ➤ PDF 相關設定（全部集中於此）

      const pdfDoc = await PDFDocument.create()
      pdfDoc.registerFontkit(fontkit)

      // 字型
      const fontBold = await pdfDoc.embedFont(
        fs.readFileSync(path.resolve('./public/fonts/NotoSansMonoCJKtc-Bold.otf'))
      )
      const fontRegular = await pdfDoc.embedFont(
        fs.readFileSync(path.resolve('./public/fonts/NotoSansMonoCJKtc-Regular.otf'))
      )

      // 尺寸換算
      const CM_TO_PT = 28.35

      // A4 頁面大小
      const pageWidth = 21 * CM_TO_PT
      const pageHeight = 29.7 * CM_TO_PT

      // 頁邊距
      const margin = {
        top: 1.4 * CM_TO_PT,
        bottom: 0.9 * CM_TO_PT,
        left: 0.4 * CM_TO_PT,
        right: 0.4 * CM_TO_PT,
      }

      // 列高設定（第一列與一般列）
      const rowSet = {
        topHight: 0.7,  // 標題列高度（cm）
        count: 15,      // 15 列
        hight: 1.8      // 每列 1.8 cm
      }

      const rowHeights = [
        rowSet.topHight * CM_TO_PT,
        ...Array(rowSet.count).fill(rowSet.hight * CM_TO_PT)
      ]

      // 欄位寬度
      const colWidths = [
        6.0 * CM_TO_PT, // A 欄 名稱/電話/編號
        4.0 * CM_TO_PT, // B 欄 條碼
        0.2 * CM_TO_PT, // C 欄 (空白區）
        6.0 * CM_TO_PT, // D 欄 名稱/電話/編號
        4.0 * CM_TO_PT, // E 欄 條碼
      ]

      // 全域字型大小
      const fontSize = 10


      // ➤ 基礎繪圖函式

      const drawText = (page, text, x, y, font, size = fontSize, color = rgb(0, 0, 0), options = {}) => {
        page.drawText(text, { x, y: y + 2, size, font, color, ...options })
      }

      const drawRect = (page, x, y, width, height, borderColor = rgb(0, 0, 0), borderWidth = 1, fillColor = null) => {
        if (fillColor) page.drawRectangle({ x, y, width, height, color: fillColor })
        page.drawRectangle({ x, y, width, height, borderColor, borderWidth })
      }

      const drawBarcode = async (text) => {
        const png = await bwipjs.toBuffer({
          bcid: 'code128',
          text,
          scale: 3,
          width: 3.5 * CM_TO_PT,
          height: 10,
          includetext: false,
        })
        return await pdfDoc.embedPng(png)
      }

      const chunkItems = (vips, size) => {
        const chunks = []
        for (let i = 0; i < vips.length; i += size) chunks.push(vips.slice(i, i + size))
        return chunks
      }

      const perPage = 30
      const chunks = chunkItems(vips, perPage)

      // ➤ PDF 內容繪製

      for (const chunk of chunks) {
        const page = pdfDoc.addPage([pageWidth, pageHeight])
        let cursorY = pageHeight - margin.top

        const now = dayjs()
        const formatted = now.format('YYMMDD HH:mm')

        const headerY = pageHeight - 30
        drawText(page, '貴賓條碼簿', margin.left, headerY, fontRegular)

        const rightText = `列印日期: ${formatted}`
        drawText(
          page,
          rightText,
          pageWidth - margin.right - fontRegular.widthOfTextAtSize(rightText, fontSize),
          headerY,
          fontRegular
        )

        // 標題列
        let currentX = margin.left
        const headerYPos = cursorY - rowHeights[0]

        for (let i = 0; i < colWidths.length; i++) {
          if (i === 2) { currentX += colWidths[i]; continue }

          drawRect(page, currentX, headerYPos, colWidths[i], rowHeights[0], rgb(0, 0, 0), 1, rgb(0, 0, 0))

          const headerTexts = ['名稱/電話/編號', '條碼']
          let headerText = ''

          if (i < 2) headerText = headerTexts[i]
          else if (i > 2) headerText = headerTexts[i - 3]

          const textWidth = fontBold.widthOfTextAtSize(headerText, fontSize)

          drawText(
            page,
            headerText,
            currentX + (colWidths[i] - textWidth) / 2,
            headerYPos + (rowHeights[0] - fontSize) / 2 - 2,
            fontBold,
            fontSize,
            rgb(1, 1, 1)
          )

          currentX += colWidths[i]
        }

        cursorY = headerYPos

        for (let row = 0; row < rowSet.count; row++) {
          const leftItem = chunk[row]
          const rightItem = chunk[row + perPage / 2]

          const drawItem = async (item, startX, colOffset) => {
            if (!item || !item.NAME) return

            const barcodeImg = await drawBarcode(item.VIP_ID)
            const barcodeWidth = 3.5 * CM_TO_PT
            const barcodeHeight = 1 * CM_TO_PT
            const barcodeX = startX + colWidths[colOffset] + 7
            const barcodeY =
              cursorY - rowHeights[row + 1] +
              (rowHeights[row + 1] - barcodeHeight) / 2

            page.drawImage(barcodeImg, {
              x: barcodeX,
              y: barcodeY,
              width: barcodeWidth,
              height: barcodeHeight
            })

            const nameY = barcodeY + barcodeHeight - 8
            const TELEPHONE = item.TELEPHONE || ''
            const MOBILE = item.MOBILE || ''

            const phoneText =
              TELEPHONE && MOBILE
                ? `${TELEPHONE} / ${MOBILE}`
                : TELEPHONE
                  ? TELEPHONE
                  : MOBILE
                    ? MOBILE
                    : ''

            const vipId = item.VIP_ID

            const maxWidth = colWidths[colOffset + 1] - 10

            const wrapText = (text, font, fontSize, maxWidth) => {
              const chars = text.split('')
              let lines = []
              let currentLine = ''
              chars.forEach(c => {
                const testLine = currentLine + c
                const testWidth = font.widthOfTextAtSize(testLine, fontSize)
                if (testWidth > maxWidth && currentLine.length > 0) {
                  lines.push(currentLine)
                  currentLine = c
                } else {
                  currentLine = testLine
                }
              })
              if (currentLine) lines.push(currentLine)
              return lines
            }

            const wrappedName = wrapText(item.NAME, fontRegular, fontSize, maxWidth)
            const totalLines = [...wrappedName, vipId, phoneText]

            totalLines.forEach((line, idx) => {
              const textX = startX + 7
              const textY = nameY - idx * (fontSize + 3)

              const isVipId = line === vipId
              const color = isVipId ? rgb(0.3, 0.3, 0.3) : rgb(0, 0, 0)

              drawText(page, line, textX, textY, fontRegular, fontSize, color)
            })
          }

          await drawItem(leftItem, margin.left, 0)

          const rightStartX = margin.left + colWidths.slice(0, 3).reduce((a, b) => a + b, 0)

          await drawItem(rightItem, rightStartX, 3)

          // 左半邊 AB 欄
          let leftX = margin.left
          for (let i = 0; i <= 1; i++) {
            drawRect(page, leftX, cursorY - rowHeights[row + 1], colWidths[i], rowHeights[row + 1])
            leftX += colWidths[i]
          }

          const dX = margin.left + colWidths.slice(0, 2).reduce((a, b) => a + b, 0)

          let rightX = dX + colWidths[2] // 跳過 D 欄

          for (let i = 3; i <= 4; i++) {
            drawRect(page, rightX, cursorY - rowHeights[row + 1], colWidths[i], rowHeights[row + 1])
            rightX += colWidths[i]
          }

          cursorY -= rowHeights[row + 1]
        }
      }


      // ➤ PDF 輸出

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
    const { vipList } = req.body
    const parsedList = Array.isArray(vipList) ? vipList : []
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

      const pdfDoc = await PDFDocument.create()
      pdfDoc.registerFontkit(fontkit)

      const Font = await pdfDoc.embedFont(fs.readFileSync(path.resolve('./public/fonts/NotoSansMonoCJKtc-Bold.otf')))
      const FontR = await pdfDoc.embedFont(fs.readFileSync(path.resolve('./public/fonts/NotoSansMonoCJKtc-Regular.otf')))

      const MM_TO_PT = 2.835
      const labelWidth = 40 * MM_TO_PT
      const labelHeight = 35 * MM_TO_PT
      const marginLeft = 2.5 * MM_TO_PT
      const marginRight = 2.5 * MM_TO_PT
      const usableWidth = labelWidth - marginLeft - marginRight
      const barcodeWidth = 35 * MM_TO_PT

      // ➤ 條碼內容
      for (const vip of vips) {
        for (let i = 0; i < vip.qty; i++) {

          const page = pdfDoc.addPage([labelWidth, labelHeight])
          const height = page.getHeight()

          // 條碼圖片變數先宣告
          let barcodeImage = null
          let barcodeHeight = 0

          // 產生條碼
          try {
            const pngBuffer = await bwipjs.toBuffer({
              bcid: 'code128',
              text: vip.VIP_ID,
              scale: 3,
              height: 15,
              includetext: false,
            })
            barcodeImage = await pdfDoc.embedPng(pngBuffer)
            const scale = barcodeWidth / barcodeImage.width
            barcodeHeight = barcodeImage.height * scale

          } catch (err) {
            es.status(500).send('條碼生成失敗')
          }

          // 中文字型：貴賓名稱
          page.drawText(vip.NAME, {
            x: marginLeft,
            y: height + 17 - barcodeHeight,
            size: 10,
            font: Font
          })

          // 電話與手機合併顯示
          const TELEPHONE = vip.TELEPHONE || ''
          const MOBILE = vip.MOBILE || ''

          const phoneText =
            TELEPHONE && MOBILE
              ? `${TELEPHONE} / ${MOBILE}`
              : TELEPHONE
                ? TELEPHONE
                : MOBILE
                  ? MOBILE
                  : ''

          page.drawText(phoneText, {
            x: marginLeft,
            y: height + 5 - barcodeHeight,
            size: 8,
            font: Font
          })

          // 條碼圖片，如果生成成功才畫
          if (barcodeImage) {
            page.drawImage(barcodeImage, {
              x: marginLeft + (usableWidth - barcodeWidth) / 2,
              y: height - 38 - barcodeHeight,
              width: barcodeWidth,
              height: barcodeHeight,
            })
          }

          // 英數字型：VIP_ID
          page.drawText(vip.VIP_ID, {
            x: marginLeft,
            y: height - 50 - barcodeHeight,
            size: 10,
            font: FontR,
          })
        }
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
  }

}

module.exports = formController
