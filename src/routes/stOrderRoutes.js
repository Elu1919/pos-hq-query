const express = require('express')
const stOrderController = require('../controllers/stOrderController')

const router = express.Router()

router.get('/order-out/:id', stOrderController.showOrderOutDetailPage)
router.get('/order/:id', stOrderController.showOrderDetailPage)
router.get('/order', stOrderController.showOrdersPage)

router.post('/order', stOrderController.searchOrdersData)

module.exports = router