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
const posHQDownloadRoutes = require('./posHQDownload')
const posSTDownloadRoutes = require('./posSTDownload')
const posWHDownloadRoutes = require('./posWHDownload')
const stOrderRoutes = require('./stOrderRoutes')

// user.level 30
router.use('/st-order', checkAuth(ROLES.WH), stOrderRoutes)
router.use('/pos-wh', checkAuth(ROLES.WH), posWHDownloadRoutes)

// user.level 40
router.use('/sale', checkAuth(ROLES.ST), saleRoutes)
router.use('/vip', checkAuth(ROLES.ST), vipRoutes)
router.use('/prod', checkAuth(ROLES.ST), prodRoutes)
router.use('/pos-st', checkAuth(ROLES.ST), posSTDownloadRoutes)

// user.level 50
router.use('/bill', checkAuth(ROLES.ACC), billRoutes)
router.use('/pos-hq', checkAuth(ROLES.ACC), posHQDownloadRoutes)


router.get('/', homeController.homeRedirect)

module.exports = router