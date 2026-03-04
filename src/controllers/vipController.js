// src/controller/vipController.js

const vipData = require('../models/vipModel')
const shopData = require('../models/shopModel')

async function getLists() {
  try {
    const [shop, vip, vipgrp] = await Promise.all([
      shopData.getShopList(),
      vipData.getVipList(),
      vipData.getVipGrpList()
    ])

    return { shop, vip, vipgrp }

  } catch (err) {
    console.error('❌ 抓取清單資料失敗：', err)
    throw err
  }
}

const vipController = {
  showVipDetailsPage: async (req, res) => {
    const filterIn = { ...req.body }

    try {
      const lists = await getLists()
      res.render('vipQuery', { lists })
    } catch (err) {
      console.error('❌ VIP資料取得失敗', err)
      res.status(500).send('資料取得失敗')
    }
  },
  showVipDetails: async (req, res) => {
    const filterIn = { ...req.body }

    try {
      const lists = await getLists()
      const { vips, totalCount } = await vipData.getAllVipData(filterIn)

      res.render('vipQuery', { vips, lists, filterIn, totalCount })
    } catch (err) {
      console.error('❌ VIP資料取得失敗', err)
      res.status(500).send('資料取得失敗')
    }
  },
  showVipAmount: async (req, res) => {
    try {
      const vipAmount = await vipData.getVipAmount()
      res.json(vipAmount)
    } catch (err) {
      res.status(500).send('資料取得失敗')
    }
  },
}

module.exports = vipController
