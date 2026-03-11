// src/Routes/posSTDownload.js

const express = require('express')

const posDataController = require('../controllers/posSTDownloadController')

const router = express.Router()

router.post('/data/download/performance', posDataController.downloadPerformanceData)
router.get('/data/download', posDataController.showDataDownloadPage)

module.exports = router
