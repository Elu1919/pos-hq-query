const vipData = require('../models/vipModel')
const { calculatePagination } = require('../utils/pagination')

const vipController = {
  showVipDetails: async (req, res) => {
    const filterIn = { ...req.body }
    const page = Number(req.body?.page) || 1
    const pageSize = Number(req.body?.pageSize) || 20

    try {
      const [vips, lists, totalCount, totalPages] = await vipData.getAllVipData(filterIn, page, pageSize)
      res.render('vipQuery', { vips, lists, filterIn, page, pageSize, totalCount, totalPages })
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
