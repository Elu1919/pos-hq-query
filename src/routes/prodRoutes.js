// src/Routes/prodRoutes.js

const express = require('express')
const prodController = require('../controllers/prodController')
const formController = require('../controllers/formController')

const router = express.Router()

// router.post('/sale-data/export', formController.exportSalesData)
router.get('/prod-data', prodController.showProdDetails)
router.post('/prod-data', prodController.showProdDetails)
router.get('/', prodController.showProdDetails)

module.exports = router
