const vipData = require('../models/vipModel')

const vipController = {
  showVipDetails: async (req, res) => {
    const filterIn = { ...req.body }
    try {
      const [vips, lists] = await vipData.getAllVipData(filterIn)
      res.render('vipQuery', { vips, lists, filterIn })
    } catch (err) {
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
