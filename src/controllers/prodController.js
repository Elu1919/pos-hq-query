// src/controller/prodController.js

const prodData = require('../models/prodModel')

async function getLists() {
  try {
    const [prod, dep, kind] = await Promise.all([
      prodData.getProdList(),
      prodData.getDepList(),
      prodData.getKindList()
    ])

    return { prod, dep, kind }

  } catch (err) {
    console.error('❌ 抓取清單資料失敗：', err)
    throw err
  }
}

const prodController = {
  showProdDetails: async (req, res) => {
    const filterIn = { ...req.body }
    try {
      const lists = await getLists()
      const { prods, totalCount } = await prodData.getAllProdData(filterIn)
      res.render('prodQuery', { lists, prods, totalCount, filterIn })

    } catch (err) {
      res.status(500).send('資料取得失敗')
    }

  }
}

module.exports = prodController
