// src/controller/saleController.js

const saleData = require('../models/saleModel')

const saleController = {
  showSaleDetails: async (req, res) => {
    const filterIn = { ...req.body }
    try {
      const [sales, lists] = await saleData.getAllSaleData(filterIn)
      res.render('saleQuery', { sales, lists, filterIn })
    } catch (err) {
      res.status(500).send('資料取得失敗')
    }
  }
}

module.exports = saleController
