// src/Routes/index.js

const express = require('express')
const router = express.Router()
const checkAuth = require('../middlewares/auth')
const { ROLES } = require('../config/roles')
const homeController = require('../controllers/homeController')

const saleRoutes = require('./saleRoutes')
const billRoutes = require('./billRoutes')
const vipRoutes = require('./vipRoutes')
const prodRoutes = require('./prodRoutes')
const posDataRoutes = require('./posHQDownload')
const stOrderRoutes = require('./stOrderRoutes')

router.use('/sale', checkAuth(ROLES.ST), saleRoutes)
router.use('/bill', checkAuth(ROLES.ACC), billRoutes)
router.use('/vip', checkAuth(ROLES.ST), vipRoutes)
router.use('/prod', checkAuth(ROLES.ST), prodRoutes)
router.use('/pos-hq', checkAuth(ROLES.ACC), posDataRoutes)
router.use('/st-order', checkAuth(ROLES.WH), stOrderRoutes)

router.get('/', checkAuth(ROLES.WH), homeController.homeRedirect)

module.exports = router