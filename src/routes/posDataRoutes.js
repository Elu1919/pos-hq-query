// src/Routes/posDataRoutes.js

const express = require('express')
const posDataController = require('../controllers/posDataController')

const router = express.Router()

router.post('/data/download/sale', posDataController.downloadSaleDataToERP)
router.post('/data/download/transfer', posDataController.downloadTransferDataToERP)
router.post('/data/download/material', posDataController.downloadMaterialData)
router.get('/data/download/transfer/no-transfer', posDataController.showNoTransferData)
router.get('/data/download', posDataController.showDataDownloadPage)

module.exports = router
