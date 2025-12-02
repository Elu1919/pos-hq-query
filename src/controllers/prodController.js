// src/controller/prodController.js

const prodData = require('../models/prodModel')

const prodController = {
  showProdDetails: async (req, res) => {
    const filterIn = { ...req.body }

    try {
      const { prods, totalCount } = await prodData.getAllProdData(filterIn)
      res.render('prodQuery', { prods, totalCount, filterIn })

    } catch (err) {
      res.status(500).send('資料取得失敗')
    }

  }
}

module.exports = prodController
