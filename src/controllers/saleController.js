// src/controller/saleController.js

const saleData = require('../models/saleModel')
const shopData = require('../models/shopModel')

const { validateDateRange } = require('../utils/formUtils')

const saleController = {
  showSaleDetailsPage: async (req, res) => {
    try {
      const lists = await shopData.getShopList
      res.render('saleQuery', { lists })
    } catch (err) {
      res.status(500).send('資料取得失敗')
    }
  },
  showSaleDetails: async (req, res) => {
    const filterIn = { ...req.body }

    const dateCheck = validateDateRange(filterIn.SALE_DATE_S, filterIn.SALE_DATE_E)
    if (dateCheck.error) {
      return res.send(`<script>
                          alert("${dateCheck.error}")
                          window.history.back()
                        </script>`)
    }

    try {
      const [sales, lists] = await saleData.getAllSaleData(filterIn)
      res.render('saleQuery', { sales, lists, filterIn })
    } catch (err) {
      res.status(500).send('資料取得失敗')
    }
  }
}

module.exports = saleController
