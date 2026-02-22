// src/controller/posDataController.js

const ExcelJS = require('exceljs')
const path = require('path')
const fs = require('fs')
const dayjs = require('dayjs')

const saleDataModel = require('../models/saleModel')
const shopData = require('../models/shopModel')
const downloadData = require('../models/downloadModel')

const posDataController = {
  showDataDownloadPage: async (req, res) => {
    try {
      const [shop, saleType] = await Promise.all([
        shopData.getShopList(),
        saleDataModel.getSaleTypeList(),
      ])
      res.render('posDataDownload', { shop, saleType })
    } catch (err) {
      console.error('❌ 畫面載入失敗', err)
      res.status(500).send('畫面載入失敗')
    }
  },

  downloadSaleDataToERP: async (req, res) => {
    try {
      const filterIn = { ...req.body }
      const today = dayjs().format('YYYY-MM-DD')

      filterIn.SALE_DATE_S = filterIn.SALE_DATE_S || today
      filterIn.SALE_DATE_E = filterIn.SALE_DATE_E || today

      if (filterIn.SALE_DATE_S > filterIn.SALE_DATE_E) {
        return res.send(`
          <script>
            alert('起始日期不可小於結束日期');
            window.history.back(); 
          </script>
        `);
      }

      if (Array.isArray(filterIn.SHOP_ID)) {
        filterIn.SHOP_ID = filterIn.SHOP_ID.join(',')
      }

      if (Array.isArray(filterIn.TYPE)) {
        filterIn.TYPE = filterIn.TYPE.join(',')
      }

      const saleData = await downloadData.posSaleToERP(filterIn)

      if (!saleData || saleData.length === 0) {
        return res.send(`
          <script>
            alert('此範圍內查無資料可供下載');
            window.history.back(); 
          </script>
        `);
      }

      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('銷售資料匯入檔')

      const headers = Object.keys(saleData[0])
      sheet.addRow(headers)
      saleData.forEach(item => sheet.addRow(Object.values(item)))

      const dateStr = dayjs().format('YYYYMMDD')
      const fileName = `SaleData_ERP_${dateStr}.xlsx`

      const tempDir = path.join(__dirname, '../../public/temp')
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

      const filePath = path.join(tempDir, fileName)

      await workbook.xlsx.writeFile(filePath)

      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('檔案下載失敗:', err)
        }

        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) console.error('暫存檔刪除失敗:', unlinkErr)
        })
      })

    } catch (err) {
      console.error('❌ POS資料導出失敗', err)
      res.status(500).send('導出失敗')
    }
  }
}

module.exports = posDataController