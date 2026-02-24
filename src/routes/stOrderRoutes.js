const express = require('express')
const stOrderController = require('../controllers/stOrderController')

const router = express.Router()

router.get('/app-order', stOrderController.approvalOrdersPage)
router.get('/app-order/:id', stOrderController.approvalDetailPage)

module.exports = router