const express = require('express')
const path = require('path')
const exphbs = require('express-handlebars')
const hbsHelpers = require('./src/helpers/hbsHelpers')
const saleRoutes = require('./src/routes/saleRoutes')
const billRoutes = require('./src/routes/billRoutes')

// =====================
// 取代 __dirname，支援 pkg 打包後路徑
const basePath = (typeof process.pkg !== 'undefined') ? path.dirname(process.execPath) : __dirname
// =====================

const app = express()

// JSON & form 解析
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 靜態資源
app.use(express.static(path.join(basePath, 'public')))

// Handlebars 設定
const hbs = exphbs.create({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(basePath, 'src/views/layouts'),
  helpers: hbsHelpers
})

app.engine('hbs', hbs.engine)
app.set('view engine', 'hbs')
app.set('views', path.join(basePath, 'src/views'))

// 掛載路由
app.use('/sale', saleRoutes)
app.use('/bill', billRoutes)

// 首頁導向商品查詢
app.get('/', (req, res) => res.redirect('/sale/sale-data'))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`))
