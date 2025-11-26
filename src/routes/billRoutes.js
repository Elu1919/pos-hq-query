const express = require('express')
const billController = require('../controllers/billController')
const formController = require('../controllers/formController')

const router = express.Router()

router.get('/', billController.showBillDataPage)
router.post('/bill-data/export/:id', formController.exportBillById)
router.post('/bill-data', billController.showBillDetails)

module.exports = router
