// src/Routes/posDataRoutes.js

const express = require('express')
const posDataController = require('../controllers/posDataController')

const router = express.Router()

// router.post('/vip-data/export/A4barcode', formController.exportVipA4barcode)
// router.post('/vip-data/export/barcode', formController.exportVipBarcode)
// router.get('/vip-amount', vipController.showVipAmount)
router.get('/data/download', posDataController.showDataDownloadPage)
// router.post('/vip-data', vipController.showVipDetails)

module.exports = router
