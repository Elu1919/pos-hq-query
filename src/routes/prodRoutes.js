// src/Routes/prodRoutes.js

const express = require('express')
const prodController = require('../controllers/prodController')
const formController = require('../controllers/formController')

const router = express.Router()

router.post('/prod-data/export/A4barcode', formController.exportProdA4barcode)
router.post('/prod-data/export/barcode', formController.exportProdBarcode)
router.post('/sale-data/qua', prodController.showProdQuaDetails)
router.get('/prod-data', prodController.showProdDetails)
router.post('/prod-data', prodController.showProdDetails)
router.get('/', prodController.showProdDetails)

module.exports = router
