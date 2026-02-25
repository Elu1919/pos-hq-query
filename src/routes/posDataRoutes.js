// src/Routes/posDataRoutes.js

const express = require('express')
const posDataController = require('../controllers/posDataController')
const formController = require('../controllers/formController')

const router = express.Router()

router.post('/data/download/sale', posDataController.downloadSaleDataToERP)
router.post('/data/download/transfer', posDataController.downloadTransferDataToERP)
router.post('/data/download/material', posDataController.downloadMaterialData)
router.post('/data/download/st-order-out-erp', posDataController.downloadStOrderOutToERP)
router.post('/data/download/st-order-out', formController.exportStOrderOutData)
router.post('/data/download/st-order', formController.exportStOrderData)
router.get('/data/download/transfer/no-transfer', posDataController.showNoTransferData)
router.get('/data/download', posDataController.showDataDownloadPage)

module.exports = router
