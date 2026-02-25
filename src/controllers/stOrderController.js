// src/controllers/stOrderController.js

const stOrderData = require('../models/stOrderModel')
const shopData = require('../models/shopModel')

const { validateDateRange } = require('../utils/formUtils')

const stOrderController = {
  showOrdersPage: async (req, res) => {
    try {
      const [shop] = await Promise.all([
        shopData.getShopList()
      ])

      res.render('st-order/st-orders', { shop })

    } catch (err) {
      console.error('❌ 畫面載入失敗', err)
      res.status(500).send('畫面載入失敗')
    }
  },
  searchOrdersData: async (req, res) => {
    try {
      const filterIn = { ...req.body }

      const dateCheck = validateDateRange(filterIn.SALE_DATE_S, filterIn.SALE_DATE_E)
      if (dateCheck.error) {
        return res.send(`<script>
                          alert("${dateCheck.error}")
                          window.history.back()
                        </script>`)
      }

      const [shop, orders] = await Promise.all([
        shopData.getShopList(),
        stOrderData.getAllOrdersData(filterIn)
      ])

      if (!orders || orders.length === 0) {
        return res.send(`
          <script>
            alert('此範圍內查無資料可供下載');
            window.history.back(); 
          </script>
        `);
      }

      res.render('st-order/st-orders', { shop, orders, filterIn })

    } catch (err) {
      console.error('❌ 畫面載入失敗', err)
      res.status(500).send('畫面載入失敗')
    }
  },
  showOrderDetailPage: async (req, res) => {
    try {
      const { id } = req.params

      const [order] = await Promise.all([
        stOrderData.getOrderDetail(id)
      ])

      if (!order || order.length === 0) {
        return res.send(`
          <script>
            alert('查無此訂單');
            window.history.back(); 
          </script>
        `);
      }

      res.render('st-order/st-order', { order })

    } catch (err) {
      console.error('❌ 畫面載入失敗', err)
      res.status(500).send('畫面載入失敗')
    }
  },
  showOrderOutDetailPage: async (req, res) => {
    try {
      const { id } = req.params

      const [order] = await Promise.all([
        stOrderData.getOrderOutDetail(id)
      ])

      if (!order || order.length === 0) {
        return res.send(`
          <script>
            alert('查無此訂單');
            window.history.back(); 
          </script>
        `);
      }

      res.render('st-order/st-order-out', { order })

    } catch (err) {
      console.error('❌ 畫面載入失敗', err)
      res.status(500).send('畫面載入失敗')
    }
  },
}

module.exports = stOrderController