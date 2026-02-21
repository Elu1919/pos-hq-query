// src/controller/posDataController.js

const saleData = require('../models/saleModel')
const shopData = require('../models/shopModel')

const posDataController = {
  showDataDownloadPage: async (req, res) => {
    try {
      const [shop, saleType] = await Promise.all([
        shopData.getShopList(),
        saleData.getSaleTypeList(),
      ])
      res.render('posDataDownload', { shop, saleType })
    } catch (err) {
      console.error('❌ POS資料取得失敗', err)
      res.status(500).send('資料取得失敗')
    }
  },
}

module.exports = posDataController
