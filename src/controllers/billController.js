// src/controller/billController.js

const dayjs = require('dayjs')

const shopData = require('../models/shopModel')
const vipData = require('../models/vipModel')
const billData = require('../models/billModel')

async function getLists() {
  try {
    const [shop, vip] = await Promise.all([
      shopData.getShopList(),
      vipData.getVipList()
    ])
    return { shop, vip }
  } catch (err) {
    console.error('❌ 抓取清單資料失敗：', err)
    throw err
  }
}

const billController = {
  showBillDataPage: async (req, res) => {
    const filter = {}
    const now = dayjs().format('YYYYMM')
    filter.BillMonthStart = now
    filter.BillMonthEnd = now
    try {
      const lists = await getLists()
      res.render('billQuery', { lists, filter })
    } catch (err) {
      res.status(500).send('資料取得失敗')
    }
  },
  showBillDetails: async (req, res) => {
    try {
      const lists = await getLists()
      const filter = { ...req.body }
      const bills = await billData.getAllBillData(filter)
      res.render('billQuery', { bills, lists, filter })
    } catch (err) {
      console.error('❌ 取得帳款明細失敗：', err)
      res.status(500).send('資料取得失敗')
    }
  }
}

module.exports = billController
