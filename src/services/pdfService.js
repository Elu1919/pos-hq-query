const { PDFDocument, rgb } = require('pdf-lib')
const fontkit = require('fontkit')
const bwipjs = require('bwip-js')
const path = require('path')
const fs = require('fs')
const dayjs = require('dayjs')

// ➤ 常數與設定
const FONT_PATH_BOLD = path.resolve('./public/fonts/NotoSansMonoCJKtc-Bold.otf')
const FONT_PATH_REGULAR = path.resolve('./public/fonts/NotoSansMonoCJKtc-Regular.otf')
const CM_TO_PT = 28.35
const MM_TO_PT = 2.835
const FONT_SIZE = 10

// A4 頁面設定
const A4_PAGE_WIDTH = 21 * CM_TO_PT
const A4_PAGE_HEIGHT = 29.7 * CM_TO_PT
const A4_MARGIN = {
  top: 1.4 * CM_TO_PT,
  bottom: 0.9 * CM_TO_PT,
  left: 0.4 * CM_TO_PT,
  right: 0.4 * CM_TO_PT,
}
const A4_ROW_SET = {
  topHight: 0.7, // 標題列高度（cm）
  count: 15,    // 15 列
  hight: 1.8    // 每列 1.8 cm
}
const A4_ROW_HEIGHTS = [
  A4_ROW_SET.topHight * CM_TO_PT,
  ...Array(A4_ROW_SET.count).fill(A4_ROW_SET.hight * CM_TO_PT)
]
const A4_COL_WIDTHS = [
  6.0 * CM_TO_PT, // A 欄 名稱/電話/編號
  4.0 * CM_TO_PT, // B 欄 條碼
  0.2 * CM_TO_PT, // C 欄 (空白區）
  6.0 * CM_TO_PT, // D 欄 名稱/電話/編號
  4.0 * CM_TO_PT, // E 欄 條碼
]

// 標籤貼紙設定
const LABEL_WIDTH = 40 * MM_TO_PT
const LABEL_HEIGHT = 35 * MM_TO_PT
const LABEL_MARGIN_LEFT = 2.5 * MM_TO_PT
const LABEL_MARGIN_RIGHT = 2.5 * MM_TO_PT
const LABEL_USABLE_WIDTH = LABEL_WIDTH - LABEL_MARGIN_LEFT - LABEL_MARGIN_RIGHT
const LABEL_BARCODE_WIDTH = 35 * MM_TO_PT


/**
 * 初始化 PDF 文件並載入字型。
 * @returns {Promise<{pdfDoc: PDFDocument, fontBold: any, fontRegular: any}>}
 */
const initPdfDocument = async () => {
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  const fontBold = await pdfDoc.embedFont(fs.readFileSync(FONT_PATH_BOLD))
  const fontRegular = await pdfDoc.embedFont(fs.readFileSync(FONT_PATH_REGULAR))

  return { pdfDoc, fontBold, fontRegular }
}

// ----------------------------------------------------
// ➤ 基礎繪圖函式
// ----------------------------------------------------

/**
 * 繪製文字。
 */
const drawText = (page, text, x, y, font, size = FONT_SIZE, color = rgb(0, 0, 0), options = {}) => {
  page.drawText(text, { x, y: y + 2, size, font, color, ...options })
}

/**
 * 繪製矩形（邊框）。
 */
const drawRect = (page, x, y, width, height, borderColor = rgb(0, 0, 0), borderWidth = 1, fillColor = null) => {
  if (fillColor) page.drawRectangle({ x, y, width, height, color: fillColor })
  page.drawRectangle({ x, y, width, height, borderColor, borderWidth })
}

/**
 * 產生條碼圖片的 PNG Buffer 並嵌入 PDF。
 * 【修正 1：更新函式簽名，使用 targetWidthCm 和 targetHeightPx】
 * @param {PDFDocument} pdfDoc - PDF 文件物件。
 * @param {string} text - 條碼內容。
 * @param {number} [targetWidthCm] - 條碼目標寬度 (cm)。
 * @param {number} [targetHeightPx] - 條碼目標像素高度 (px)。
 * @returns {Promise<any>} 嵌入的條碼圖片物件。
 */
const generateAndEmbedBarcode = async (pdfDoc, text, targetWidthCm, targetHeightPx) => {

  const defaultWidthCm = 3.5 // A4 預設寬度 (cm)
  const defaultHeightPx = 10 // A4 預設高度 (px)

  // 避免與參數名稱衝突，使用 final 開頭的變數
  const finalWidthCm = targetWidthCm || defaultWidthCm
  const finalHeightPx = targetHeightPx || defaultHeightPx

  const png = await bwipjs.toBuffer({
    bcid: 'code128',
    text,
    scale: 3,
    // 使用 PT 轉換後的寬度，並除以 scale (3) 得到 bwip-js 所需的繪圖單元
    width: finalWidthCm * CM_TO_PT / 3,
    height: finalHeightPx,
    includetext: false,
  })
  return await pdfDoc.embedPng(png)
}

/**
 * 文字自動換行函式。
 */
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

// ----------------------------------------------------
// ➤ A4 兩欄條碼簿 共用邏輯
// ----------------------------------------------------

/**
 * 繪製 A4 兩欄頁面標頭 (包含標題和列印日期)。
 */
const drawA4Header = (page, fontRegular, title) => {
  const now = dayjs()
  const formatted = now.format('YYMMDD HH:mm')
  const headerY = A4_PAGE_HEIGHT - 30

  drawText(page, title, A4_MARGIN.left, headerY, fontRegular)

  const rightText = `列印日期: ${formatted}`
  drawText(
    page,
    rightText,
    A4_PAGE_WIDTH - A4_MARGIN.right - fontRegular.widthOfTextAtSize(rightText, FONT_SIZE),
    headerY,
    fontRegular
  )
}

/**
 * 繪製 A4 兩欄標題列。
 */
const drawA4TitleRow = (page, fontBold, titleTexts, cursorY) => {
  let currentX = A4_MARGIN.left
  const headerYPos = cursorY - A4_ROW_HEIGHTS[0]

  for (let i = 0; i < A4_COL_WIDTHS.length; i++) {
    if (i === 2) {
      currentX += A4_COL_WIDTHS[i];
      continue
    }

    drawRect(page, currentX, headerYPos, A4_COL_WIDTHS[i], A4_ROW_HEIGHTS[0], rgb(0, 0, 0), 1, rgb(0, 0, 0))

    let headerText = ''
    if (i < 2) headerText = titleTexts[i]
    else if (i > 2) headerText = titleTexts[i - 3]

    const textWidth = fontBold.widthOfTextAtSize(headerText, FONT_SIZE)

    drawText(
      page,
      headerText,
      currentX + (A4_COL_WIDTHS[i] - textWidth) / 2,
      headerYPos + (A4_ROW_HEIGHTS[0] - FONT_SIZE) / 2 - 2,
      fontBold,
      FONT_SIZE,
      rgb(1, 1, 1)
    )

    currentX += A4_COL_WIDTHS[i]
  }

  return headerYPos
}

/**
 * 繪製單一個 A4 條碼簿項目 (貴賓或產品)。
 * @param {PDFDocument} pdfDoc - PDF 文件物件。
 * @param {any} page - PDF 頁面物件。
 * @param {any} item - 項目資料。
 * @param {number} startX - 起始 X 座標。
 * @param {number} colOffset - 欄位寬度的起始索引 (0 或 3)。
 * @param {number} rowIndex - 項目在頁面上的行索引 (1-15)。
 * @param {number} cursorY - 目前的 Y 游標位置。
 * @param {any} fontRegular - Regular 字型。
 * @param {Function} contentFunc - 產生內容字串陣列的函式。
 */
const drawA4Item = async (pdfDoc, page, item, startX, colOffset, rowIndex, cursorY, fontRegular, contentFunc) => {
  if (!item) return

  const maxWidth = A4_COL_WIDTHS[colOffset] - 10
  const currentRowHeight = A4_ROW_HEIGHTS[rowIndex]

  const contentLines = contentFunc(item, fontRegular, maxWidth)

  const itemId = contentLines.find(line => line.startsWith(item.VIP_ID || item.PROD_ID)) || ''
  const totalLines = contentLines // 確保 totalLines 變數與 contentLines 相同

  // 【修正 2：更新 generateAndEmbedBarcode 的調用，確保 A4 模式傳入 4 個參數】
  const barcodeImg = await generateAndEmbedBarcode(pdfDoc, itemId, 3.5, 10)
  const barcodeWidth = 3.5 * CM_TO_PT
  const barcodeHeight = 1 * CM_TO_PT // A4 模式高度
  const barcodeX = startX + A4_COL_WIDTHS[colOffset] + 7

  const barcodeY =
    cursorY - currentRowHeight +
    (currentRowHeight - barcodeHeight) / 2

  page.drawImage(barcodeImg, {
    x: barcodeX,
    y: barcodeY,
    width: barcodeWidth,
    height: barcodeHeight
  })

  const nameY = barcodeY + barcodeHeight - 8

  totalLines.forEach((line, idx) => {
    let textX = startX + 7 // 基礎 X 座標

    // *** 新增：條件式調整 X 座標 (如果文字以 '【' 開頭，向左移動 5 點) ***
    if (line.startsWith('【')) {
      textX -= 5
    }
    // **************************************************************************

    const textY = nameY - idx * (FONT_SIZE + 3)

    const isId = line === itemId
    const color = isId ? rgb(0.3, 0.3, 0.3) : rgb(0, 0, 0)

    drawText(page, line, textX, textY, fontRegular, FONT_SIZE, color)
  })
}

/**
 * 繪製 A4 兩欄頁面內容的邊框。
 */
const drawA4Border = (page, cursorY, rowIndex) => {
  const currentRowHeight = A4_ROW_HEIGHTS[rowIndex]

  // 左半邊 AB 欄
  let leftX = A4_MARGIN.left
  for (let i = 0; i <= 1; i++) {
    drawRect(page, leftX, cursorY - currentRowHeight, A4_COL_WIDTHS[i], currentRowHeight)
    leftX += A4_COL_WIDTHS[i]
  }

  // 右半邊 DE 欄 (跳過 C 欄)
  const dX = A4_MARGIN.left + A4_COL_WIDTHS.slice(0, 2).reduce((a, b) => a + b, 0)
  let rightX = dX + A4_COL_WIDTHS[2]

  for (let i = 3; i <= 4; i++) {
    drawRect(page, rightX, cursorY - currentRowHeight, A4_COL_WIDTHS[i], currentRowHeight)
    rightX += A4_COL_WIDTHS[i]
  }

  return cursorY - currentRowHeight
}


// ----------------------------------------------------
// ➤ 標籤貼紙 共用邏輯
// ----------------------------------------------------

/**
 * 繪製單個標籤貼紙。
 * @param {PDFDocument} pdfDoc - PDF 文件物件。
 * @param {any} item - 項目資料 (vip 或 prod)。
 * @param {any} Font - Bold 字型。
 * @param {any} FontR - Regular 字型。
 * @param {number} qty - 列印數量。
 * @param {string} idKey - ID 鍵名 (如 'VIP_ID', 'PROD_ID')。
 * @param {string} nameKey - 名稱鍵名 (如 'NAME', 'PROD_NAME1')。
 * @param {Function} depFunc - 產生電話/類別等附屬資訊的函式。
 */
const drawLabelSticker = async (pdfDoc, item, Font, FontR, qty, idKey, nameKey, depFunc) => {

  // 定義貼紙內部的常數
  const BARCODE_BOTTOM_MARGIN = 5
  const ID_FONT_SIZE = 10
  const NAME_FONT_SIZE = 10
  const DEP_FONT_SIZE = 8

  // 條碼在 PDF 中的目標高度
  const LABEL_BARCODE_HEIGHT_MM = 15
  const LABEL_BARCODE_HEIGHT_PT = LABEL_BARCODE_HEIGHT_MM * MM_TO_PT

  const LABEL_BARCODE_WIDTH_CM = LABEL_BARCODE_WIDTH / CM_TO_PT
  const LABEL_BARCODE_HEIGHT_PX = 15

  for (let i = 0; i < qty; i++) {
    const page = pdfDoc.addPage([LABEL_WIDTH, LABEL_HEIGHT])

    let barcodeImage = null;
    let barcodeHeight = LABEL_BARCODE_HEIGHT_PT;

    try {
      // 使用在迴圈外定義的常數
      barcodeImage = await generateAndEmbedBarcode(
        pdfDoc,
        item[idKey],
        LABEL_BARCODE_WIDTH_CM,
        LABEL_BARCODE_HEIGHT_PX
      )
    } catch (err) {
      console.error('標籤貼紙條碼生成失敗', err)
    }

    const depText = depFunc(item)

    // *** 條件式調整 depText 的 X 座標 (如果以 '【' 開頭，向左移動 5 點) ***
    let depTextX = LABEL_MARGIN_LEFT
    if (depText.startsWith('【')) {
      depTextX -= 5
    }
    // ******************************************************************************

    // 條碼圖片
    if (barcodeImage) {
      const barcodeY = BARCODE_BOTTOM_MARGIN + ID_FONT_SIZE + 7; // 條碼底部 Y 座標: 底部邊距 + ID 高度 + 間距

      // 繪製條碼
      page.drawImage(barcodeImage, {
        x: LABEL_MARGIN_LEFT + (LABEL_USABLE_WIDTH - LABEL_BARCODE_WIDTH) / 2,
        y: barcodeY,
        width: LABEL_BARCODE_WIDTH,
        height: barcodeHeight,
      })

      page.drawText(item[idKey], {
        x: LABEL_MARGIN_LEFT,
        y: BARCODE_BOTTOM_MARGIN + 5,
        size: ID_FONT_SIZE,
        font: FontR,
      })

      // 使用調整後的 depTextX 座標
      page.drawText(depText, {
        x: depTextX,
        y: barcodeY + barcodeHeight + 4,
        size: DEP_FONT_SIZE,
        font: Font
      })

      page.drawText(item[nameKey], {
        x: LABEL_MARGIN_LEFT,
        y: barcodeY + barcodeHeight + DEP_FONT_SIZE + 8,
        size: NAME_FONT_SIZE,
        font: Font
      })
    }
  }
}


module.exports = {
  // A4 共用常數
  A4_PAGE_WIDTH,
  A4_PAGE_HEIGHT,
  A4_MARGIN,
  A4_ROW_SET,
  A4_ROW_HEIGHTS,
  A4_COL_WIDTHS,
  FONT_SIZE,

  // 標籤貼紙常數
  LABEL_WIDTH,
  LABEL_HEIGHT,
  LABEL_MARGIN_LEFT,
  LABEL_MARGIN_RIGHT,
  LABEL_USABLE_WIDTH,
  LABEL_BARCODE_WIDTH,

  // 基礎函式
  initPdfDocument,
  drawText,
  drawRect,
  generateAndEmbedBarcode,
  wrapText,

  // A4 函式
  drawA4Header,
  drawA4TitleRow,
  drawA4Item,
  drawA4Border,

  // 標籤貼紙函式
  drawLabelSticker,
}