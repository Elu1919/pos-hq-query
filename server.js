const { TextDecoder, TextEncoder } = require('util')
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder
}

// 修正 pkg 環境下 fontkit 找不到 ascii 編碼的問題
const originalTextDecoder = global.TextDecoder
global.TextDecoder = class extends originalTextDecoder {
  constructor(encoding, options) {
    if (encoding === 'ascii') encoding = 'utf-8' // 強制轉向 utf-8
    super(encoding, options)
  }
}

const express = require('express')
const connectMongoDB = require('./src/config/mongodb')
const path = require('path')
const exphbs = require('express-handlebars')
const hbsHelpers = require('./src/helpers/hbsHelpers')

// =====================
// 取代 __dirname，支援 pkg 打包後路徑
const basePath = (typeof process.pkg !== 'undefined') ? path.dirname(process.execPath) : __dirname
// =====================

// --- [新增] 載入環境變數，確保支援 pkg 外部讀取 ---
require('dotenv').config({ path: path.join(basePath, '.env') })

const app = express()

connectMongoDB()

// JSON & form 解析
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// 靜態資源
app.use(express.static(path.join(basePath, 'public')))

// Handlebars 設定
const hbs = exphbs.create({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(basePath, 'src/views/layouts'),
  helpers: hbsHelpers,
  // 針對某些版本的 HBS，啟用原型存取
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true
  }
})

app.engine('hbs', hbs.engine)
app.set('view engine', 'hbs')
app.set('views', path.join(basePath, 'src/views'))

// 設定身分 (全域注入)
const { USERS } = require('./src/config/roles')
app.use((req, res, next) => {
  const identity = process.env.MY_SHOP_ID
  const user = USERS[identity]
  if (user) {
    req.currentUser = user
    res.locals.user = JSON.parse(JSON.stringify(user))
  }
  next()
})

// 掛載路由
const router = require('./src/routes')
app.use('/', router)

// 首頁導向商品查詢
app.get('/', (req, res) => res.redirect('/sale/sale-data'))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`))