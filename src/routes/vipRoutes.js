// src/Routes/vipRoutes.js

const express = require('express')
const vipController = require('../controllers/vipController')
const formController = require('../controllers/formController')

const router = express.Router()

router.post('/vip-data/export/A4barcode', formController.exportVipA4barcode)
router.post('/vip-data/export/barcode', formController.exportVipBarcode)
router.get('/vip-amount', vipController.showVipAmount)
router.get('/', vipController.showVipDetailsPage)
router.post('/vip-data', vipController.showVipDetails)

module.exports = router
