// src/controller/prodController.js

const prodData = require('../models/prodModel')
const shopData = require('../models/shopModel')

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

async function getShopList() {
  try {
    const shop = await Promise.all([
      shopData.getShopList()
    ])

    return shop

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
  },
  showProdQuaDetails: async (req, res) => {
    const { prodIdList } = req.body
    const parsedList = Array.isArray(prodIdList) ? prodIdList : []
    const prodIdsString = parsedList.map(v => v.PROD_ID).join(',')

    try {
      const shopList = await getShopList()
      const { prodQuaList } = await prodData.getProdQua(prodIdsString)

      return res.json({ prodQuaList, shopList })

    } catch (err) {
      res.status(500).send('取得商品庫存明細失敗')
    }
  }
}

module.exports = prodController
