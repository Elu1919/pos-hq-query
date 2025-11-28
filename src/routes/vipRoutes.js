const express = require('express')
const vipController = require('../controllers/vipController')

const router = express.Router()

//router.post('/sale-data/export', formController.exportSalesData)
router.get('/vip-amount', vipController.showVipAmount)
router.get('/', vipController.showVipDetails)
router.post('/vip-data', vipController.showVipDetails)

module.exports = router
