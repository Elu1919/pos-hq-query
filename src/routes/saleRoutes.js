const express = require('express')
const saleController = require('../controllers/saleController')
const formController = require('../controllers/formController')

const router = express.Router()

router.post('/sale-data/export', formController.exportSalesData)
router.get('/sale-data', saleController.showSaleDetails)
router.post('/sale-data', saleController.showSaleDetails)

module.exports = router
