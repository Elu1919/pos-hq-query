// src/controller/prodController.js

const prodData = require('../models/prodModel')

const prodController = {
  showProdDetails: async (req, res) => {
    const filterIn = { ...req.body }
    try {
      const [sales, lists] = await saleData.getAllSaleData(filterIn)
      res.render('saleQuery', { sales, lists, filterIn })
    } catch (err) {
      res.status(500).send('資料取得失敗')
    }
  }
}

module.exports = prodController
