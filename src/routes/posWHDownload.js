// src/Routes/posWHDownload.js

const express = require('express')

const posDataController = require('../controllers/posHQDownloadController')
const formController = require('../controllers/formController')

const router = express.Router()

router.post('/data/download/st-order-out-erp', posDataController.downloadStOrderOutToERP)
router.post('/data/download/st-order-out', formController.exportStOrderOutData)
router.post('/data/download/st-order', formController.exportStOrderData)

module.exports = router
