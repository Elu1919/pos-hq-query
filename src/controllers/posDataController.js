// src/controller/posDataController.js

const ExcelJS = require('exceljs')
const path = require('path')
const fs = require('fs')
const dayjs = require('dayjs')

const saleDataModel = require('../models/saleModel')
const shopData = require('../models/shopModel')
const downloadData = require('../models/downloadModel')

const { validateDateRange, exportToExcel } = require('../utils/formUtils')

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

      const dateCheck = validateDateRange(filterIn.SALE_DATE_S, filterIn.SALE_DATE_E)
      if (dateCheck.error) {
        return res.send(`<script>
                          alert("${dateCheck.error}")
                          window.history.back()
                        </script>`)
      }

      if (Array.isArray(filterIn.SHOP_ID)) {
        filterIn.SHOP_ID = filterIn.SHOP_ID.join(',')
      }

      if (Array.isArray(filterIn.TYPE)) {
        filterIn.TYPE = filterIn.TYPE.join(',')
      }

      const data = await downloadData.posSaleToERP(filterIn)

      if (!data || data.length === 0) {
        return res.send(`
          <script>
            alert('此範圍內查無資料可供下載');
            window.history.back(); 
          </script>
        `);
      }

      const dateStr = dayjs().format('YYYYMMDD');
      const fileName = `SaleData_ERP_${dateStr}.xlsx`;

      await exportToExcel(res, data, fileName, 'ERP匯入檔');

    } catch (err) {
      console.error('❌ POS資料導出失敗', err)
      res.status(500).send('導出失敗')
    }
  },
  downloadTransferDataToERP: async (req, res) => {
    try {
      const filterIn = { ...req.body }

      const dateCheck = validateDateRange(filterIn.SALE_DATE_S, filterIn.SALE_DATE_E)
      if (dateCheck.error) {
        return res.send(`<script>
                          alert("${dateCheck.error}")
                          window.history.back()
                        </script>`)
      }

      if (Array.isArray(filterIn.SHOP_ID)) {
        filterIn.SHOP_ID = filterIn.SHOP_ID.join(',')
      }

      if (Array.isArray(filterIn.TYPE)) {
        filterIn.TYPE = filterIn.TYPE.join(',')
      }

      const data = await downloadData.posTransferToERP(filterIn)

      if (!data || data.length === 0) {
        return res.send(`
          <script>
            alert('此範圍內查無資料可供下載');
            window.history.back(); 
          </script>
        `);
      }

      const dateStr = dayjs().format('YYYYMMDD');
      const fileName = `TransferData_ERP_${dateStr}.xlsx`;

      await exportToExcel(res, data, fileName, 'ERP匯入檔');

    } catch (err) {
      console.error('❌ POS資料導出失敗', err)
      res.status(500).send('導出失敗')
    }
  },
  showNoTransferData: async (req, res) => {
    try {
      const filterIn = {
        SALE_DATE_S: req.query.dateS,
        SALE_DATE_E: req.query.dateE,
        SHOP_ID: req.query.shops
      }

      const dateCheck = validateDateRange(filterIn.SALE_DATE_S, filterIn.SALE_DATE_E)
      if (dateCheck.error) {
        return res.send(`<script>
                          alert("${dateCheck.error}")
                          window.history.back()
                        </script>`)
      }

      const data = await downloadData.posNoTransferToERP(filterIn)

      res.json(data || [])

    } catch (err) {
      res.status(500).send('資料取得失敗')
    }
  },
  downloadMaterialData: async (req, res) => {
    try {
      const filterIn = { ...req.body }

      const dateCheck = validateDateRange(filterIn.SALE_DATE_S, filterIn.SALE_DATE_E)
      if (dateCheck.error) {
        return res.send(`<script>
                          alert("${dateCheck.error}")
                          window.history.back()
                        </script>`)
      }

      if (Array.isArray(filterIn.SHOP_ID)) {
        filterIn.SHOP_ID = filterIn.SHOP_ID.join(',')
      }

      if (Array.isArray(filterIn.TYPE)) {
        filterIn.TYPE = filterIn.TYPE.join(',')
      }

      const data = await downloadData.posMaterialToERP(filterIn)

      if (!data || data.length === 0) {
        return res.send(`
          <script>
            alert('此範圍內查無資料可供下載');
            window.history.back(); 
          </script>
        `);
      }

      const dateStr = dayjs().format('YYYYMMDD');
      const fileName = `MaterialData_ERP_${dateStr}.xlsx`;

      await exportToExcel(res, data, fileName, 'ERP匯入檔');

    } catch (err) {
      console.error('❌ POS資料導出失敗', err)
      res.status(500).send('導出失敗')
    }
  },
  downloadStOrderOutToERP: async (req, res) => {
    try {
      const id = req.body.OUT_ID

      const data = await downloadData.posStOrderOutToERP(id)

      if (!data || data.length === 0) {
        return res.send(`
          <script>
            alert('找不到單據');
            window.history.back(); 
          </script>
        `);
      }

      const dateStr = dayjs().format('YYYYMMDD');
      const fileName = `StOrderOutData_ERP_${dateStr}.xlsx`;

      await exportToExcel(res, data, fileName, 'ERP匯入檔');

    } catch (err) {
      console.error('❌ POS資料導出失敗', err)
      res.status(500).send('導出失敗')
    }
  },
}

module.exports = posDataController