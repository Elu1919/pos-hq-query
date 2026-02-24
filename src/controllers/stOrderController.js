// src/controllers/stOrderController.js

// const { generateLabelPDF } = require('../utils/label-generator.js')
// const { generateOrderDetailPDF } = require('../utils/generateOrderDetailPDF.js')

const { DateTime } = require('luxon')

const Order = require('../models/mongodb/stOrderModel')
const User = require('../models/mongodb/userModel')
// const Cart = require('../models/cart.js')
// const Product = require('../models/products.js')

const stOrderController = {
  // showOrderPage: async (req, res) => {
  //   try {
  //     const { dep_id } = req.query
  //     const lastQuantities = req.session.lastQuantities || {}
  //     const lastUnits = req.session.lastUnits || {}

  //     req.session.lastQuantities = null
  //     req.session.lastUnits = null

  //     const excludedDeps = ['服務區', '折扣區', '電池回收', '虛品項-寄庫', '虛品項-其它']
  //     const depOptions = await Product.aggregate([
  //       {
  //         $match: {
  //           DEP_ID: { $nin: excludedDeps }
  //         }
  //       },
  //       {
  //         $group: {
  //           _id: '$DEP_ID',
  //           DEP_id: { $first: '$DEP_id' }
  //         }
  //       },
  //       {
  //         $sort: { DEP_id: 1 }
  //       }
  //     ]).then(results => results.map(r => r._id))

  //     const kindOptions = await Product.distinct('PROD_KIND')

  //     let products = []
  //     if (dep_id) {
  //       const query = {
  //         $and: [
  //           { DEP_ID: { $nin: excludedDeps } },
  //           { DEP_ID: dep_id }
  //         ]
  //       }
  //       products = await Product.find(query).sort({ PROD_ID: 1 }).lean()
  //     }

  //     res.render('st-order/order', {
  //       dep_id,
  //       products,
  //       depOptions,
  //       kindOptions,
  //       lastQuantities,
  //       lastUnits
  //     })
  //   } catch (err) {
  //     console.error(err)
  //     res.redirect('/')
  //   }
  // },

  // getOrderHistory: async (req, res) => {
  //   try {
  //     const userId = req.user._id
  //     let { startDate, endDate } = req.query
  //     const query = { userId }

  //     const today = DateTime.now().setZone('Asia/Taipei')
  //     if (!startDate) startDate = today.minus({ days: 6 }).toFormat('yyyy-MM-dd')
  //     if (!endDate) endDate = today.toFormat('yyyy-MM-dd')

  //     const start = DateTime.fromISO(startDate, { zone: 'Asia/Taipei' }).startOf('day').toJSDate()
  //     const end = DateTime.fromISO(endDate, { zone: 'Asia/Taipei' }).endOf('day').toJSDate()

  //     query.createdAt = { $gte: start, $lte: end }

  //     const orders = await Order.find(query)
  //       .populate('userId', 'Shop_ID')
  //       .sort({ updatedAt: -1, createdAt: -1 })
  //       .lean()

  //     orders.forEach(order => {
  //       order.itemCount = order.items.length
  //       order.createdAtFormatted = DateTime
  //         .fromJSDate(order.createdAt)
  //         .setZone('Asia/Taipei')
  //         .toFormat('yyyy-MM-dd HH:mm')
  //       order.updatedAtFormatted = DateTime
  //         .fromJSDate(order.updatedAt)
  //         .setZone('Asia/Taipei')
  //         .toFormat('yyyy-MM-dd HH:mm')
  //     })

  //     res.render('order/history', {
  //       orders,
  //       startDate,
  //       endDate
  //     })
  //   } catch (error) {
  //     console.error('查詢歷史訂單失敗:', error)
  //     res.status(500).send('伺服器錯誤')
  //   }
  // },

  // copyOrderToCart: async (req, res) => {
  //   const userId = req.user._id
  //   const { id } = req.params

  //   try {
  //     const order = await Order.findById(id)
  //     if (!order) return res.status(404).send('找不到訂單')

  //     let cart = await Cart.findOne({ userId })
  //     if (!cart) {
  //       cart = new Cart({ userId, items: [] })
  //     }

  //     const cartMap = new Map()
  //     cart.items.forEach(item => {
  //       cartMap.set(item.PROD_ID, { ...item.toObject() })
  //     })

  //     order.items.forEach(orderItem => {
  //       if (cartMap.has(orderItem.PROD_ID)) {
  //         cartMap.get(orderItem.PROD_ID).quantity += orderItem.quantity
  //       } else {
  //         cartMap.set(orderItem.PROD_ID, {
  //           PROD_ID: orderItem.PROD_ID,
  //           PROD_NAME2: orderItem.PROD_NAME2,
  //           PROD_KIND: orderItem.PROD_KIND,
  //           DEP_ID: orderItem.DEP_ID,
  //           UNIT1: orderItem.UNIT1,
  //           quantity: orderItem.quantity,
  //           unit: orderItem.unit,
  //           allowBox: orderItem.allowBox,
  //           unitsPerBox: orderItem.unitsPerBox,
  //           printOnce: orderItem.printOnce
  //         })
  //       }
  //     })

  //     cart.items = Array.from(cartMap.values())
  //     await cart.save()
  //     req.flash('success_msg', '訂單已複製並合併至購物車')
  //     res.redirect('/order/cart')
  //   } catch (err) {
  //     console.error(err)
  //     res.status(500).send('複製訂單失敗')
  //   }
  // },

  // getOrderDetail: async (req, res) => {
  //   try {
  //     const orderId = req.params.id
  //     const order = await Order.findById(orderId)
  //       .populate('reviewerId', 'EMP_NAME')
  //       .sort({ createdAt: -1 })
  //       .lean()

  //     if (!order) {
  //       req.flash('err_msg', '找不到此訂單')
  //       return res.redirect('/order/history')
  //     }

  //     const itemCount = order.items?.length || 0

  //     res.render('order/detail', {
  //       order,
  //       itemCount
  //     })
  //   } catch (err) {
  //     console.error('讀取訂單詳細資料失敗:', err)
  //     req.flash('err_msg', '無法載入訂單')
  //     res.redirect('/order/history')
  //   }
  // },

  approvalOrdersPage: async (req, res) => {
    try {
      const status = req.query.status || "待核准"
      let { startDate, endDate } = req.query
      const query = {}

      if (status === '待核准') {
        query.status = { $in: ['待核准', '調整中'] }
      } else if (status === '已核准') {
        query.status = { $in: ['已核准', '調整核准'] }
      } else if (status === '已作廢') {
        query.status = { $in: ['已作廢', '調整作廢'] }
      } else if (status) {
        query.status = status
      }

      const today = DateTime.now().setZone('Asia/Taipei')
      if (!startDate) startDate = today.minus({ days: 6 }).toFormat('yyyy-MM-dd')
      if (!endDate) endDate = today.toFormat('yyyy-MM-dd')

      const start = DateTime.fromISO(startDate, { zone: 'Asia/Taipei' }).startOf('day').toJSDate()
      const end = DateTime.fromISO(endDate, { zone: 'Asia/Taipei' }).endOf('day').toJSDate()

      query.createdAt = { $gte: start, $lte: end }

      const orders = await Order.find(query).sort({ updatedAt: -1, createdAt: -1 }).lean()

      orders.forEach(order => {
        order.itemCount = order.items.length
        order.createdAtFormatted = DateTime
          .fromJSDate(order.createdAt)
          .setZone('Asia/Taipei')
          .toFormat('yyyy-MM-dd HH:mm')
        order.updatedAtFormatted = DateTime
          .fromJSDate(order.updatedAt)
          .setZone('Asia/Taipei')
          .toFormat('yyyy-MM-dd HH:mm')
      })

      res.render('st-order/app-orders', {
        orders,
        status,
        startDate,
        endDate
      })
    } catch (err) {
      console.error(err)
      res.redirect('/st-order/app-order')
    }
  },

  approvalDetailPage: async (req, res) => {
    const { id } = req.params
    try {
      const order = await Order.findById(id)
        .populate('reviewerId', 'EMP_NAME')
        .sort({ createdAt: -1 })
        .lean()

      if (!order) {
        return res.redirect('/st-order/app-order')
      }

      const itemCount = order.items?.length || 0
      res.render('st-order/app-order', { order, itemCount })
    } catch (err) {
      console.error(err)
      res.redirect('/st-order/app-order')
    }
  },

  // approveOrder: async (req, res) => {
  //   const { id } = req.params
  //   try {
  //     await Order.findByIdAndUpdate(id, {
  //       status: '已核准',
  //       reviewerId: req.user._id,
  //       reviewedAt: new Date()
  //     })
  //     req.flash('suc_msg', '訂單已核准')
  //     res.redirect('/order/approval?status=已核准')
  //   } catch (err) {
  //     console.error(err)
  //     req.flash('err_msg', '核准失敗')
  //     res.redirect('/order/approval')
  //   }
  // },

  // approvalEditPage: async (req, res) => {
  //   const { id } = req.params
  //   try {
  //     const order = await Order.findById(id).populate('reviewerId').lean()
  //     if (!order) {
  //       req.flash('err_msg', '找不到訂單')
  //       return res.redirect('/order/approval')
  //     }
  //     if (!req.user || req.user.EMP_LEVEL >= 3) {
  //       req.flash('err_msg', '您沒有權限變更訂單')
  //       return res.redirect('/order/approval')
  //     }

  //     req.session.PROD_INFO = {}
  //     order.items.forEach(item => {
  //       req.session.PROD_INFO[item.prodId] = `${item.PROD_NAME2}|${item.PROD_KIND}|${item.DEP_ID}|${item.UNIT1}|${item.allowBox}|${item.printOnce}|${item.unitsPerBox}`
  //     })

  //     const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)

  //     res.render('admin/editOrder', {
  //       order,
  //       itemCount,
  //       helpers: {
  //         formatDate: date => new Date(date).toLocaleString()
  //       }
  //     })
  //   } catch (err) {
  //     console.error(err)
  //     req.flash('err_msg', '載入訂單失敗')
  //     res.redirect('/order/approval')
  //   }
  // },

  // approveUpdate: async (req, res) => {
  //   try {
  //     const user = req.user
  //     const orderId = req.params.id
  //     const { quantities, unit } = req.body

  //     const originalOrder = await Order.findById(orderId)

  //     if (!originalOrder) {
  //       req.flash('err_msg', '找不到訂單')
  //       return res.redirect('/order/approval')
  //     }

  //     const newitems = originalOrder.items
  //       .map(item => {
  //         const qtyStr = quantities[item.PROD_ID]
  //         const qty = parseInt(qtyStr, 10)

  //         if (!isNaN(qty)) {
  //           if (qty > 0) {
  //             return {
  //               ...item.toObject(),
  //               quantity: qty,
  //               unit: unit?.[item.PROD_ID] || item.unit
  //             }
  //           } else if (qty === 0) {
  //             return null
  //           }
  //         }
  //         return { ...item.toObject() }
  //       })
  //       .filter(item => item !== null)

  //     if (newitems.length === 0) {
  //       req.flash('err_msg', '請至少選擇一個商品數量')
  //       return res.redirect(`/order/approval/${orderId}/edit`)
  //     }

  //     const sortItems = newitems.sort((a, b) =>
  //       (a.PROD_ID || '').localeCompare(b.PROD_ID || '')
  //     )

  //     const nowUtc = new Date()

  //     if (originalOrder.status === '待核准') {
  //       await Order.create({
  //         userId: originalOrder.userId,
  //         shopId: originalOrder.shopId,
  //         customerName: originalOrder.customerName,
  //         items: sortItems,
  //         status: '調整中',
  //         reviewedAt: nowUtc,
  //         createdAt: nowUtc
  //       })

  //       originalOrder.status = '調整作廢'
  //       originalOrder.reviewedAt = nowUtc
  //       originalOrder.reviewerId = user._id
  //       await originalOrder.save()

  //     } else if (originalOrder.status === '調整中') {
  //       originalOrder.items = sortItems
  //       originalOrder.reviewedAt = nowUtc
  //       originalOrder.reviewerId = user._id
  //       await originalOrder.save()
  //     } else {
  //       req.flash('err_msg', '無法變更此狀態的訂單')
  //       return res.redirect(`/order/approval/${orderId}/edit`)
  //     }

  //     req.flash('suc_msg', '訂單已儲存為調整中')
  //     res.redirect('/order/approval')
  //   } catch (err) {
  //     console.error('approveUpdate 發生錯誤:', err)
  //     req.flash('err_msg', '更新訂單時發生錯誤')
  //     res.redirect(`/order/approval/${req.params.id}/edit`)
  //   }
  // },

  // approveEditOrder: async (req, res) => {
  //   const orderId = req.params.orderId || req.params.id
  //   const { quantities, unit } = req.body

  //   try {
  //     const oldOrder = await Order.findById(orderId)
  //     if (!oldOrder) {
  //       req.flash('err_msg', '找不到訂單')
  //       return res.redirect('/order/approval')
  //     }

  //     const newItems = oldOrder.items
  //       .map(item => {
  //         const qtyStr = quantities?.[item.PROD_ID]
  //         const qty = parseInt(qtyStr, 10)

  //         if (!isNaN(qty)) {
  //           if (qty > 0) {
  //             return {
  //               ...item.toObject(),
  //               quantity: qty,
  //               unit: unit?.[item.PROD_ID] || item.unit
  //             }
  //           } else if (qty === 0) {
  //             return null
  //           }
  //         }
  //         return { ...item.toObject() }
  //       })
  //       .filter(item => item !== null)

  //     if (newItems.length === 0) {
  //       req.flash('err_msg', '請至少選擇一個商品數量')
  //       return res.redirect(`/order/approval/${orderId}/edit`)
  //     }

  //     const now = new Date()

  //     if (oldOrder.status === '待核准') {
  //       await Order.create({
  //         userId: oldOrder.userId,
  //         shopId: oldOrder.shopId,
  //         customerName: oldOrder.customerName,
  //         items: newItems,
  //         status: '調整核准',
  //         reviewedAt: now,
  //         createdAt: now,
  //         creatorId: oldOrder.creatorId,
  //         reviewerId: req.user._id
  //       })

  //       oldOrder.status = '調整作廢'
  //       oldOrder.reviewedAt = now
  //       oldOrder.reviewerId = req.user._id
  //       await oldOrder.save()

  //     } else if (oldOrder.status === '調整中') {
  //       oldOrder.items = newItems
  //       oldOrder.reviewedAt = now
  //       oldOrder.reviewerId = req.user._id
  //       oldOrder.status = '調整核准'
  //       await oldOrder.save()
  //     } else {
  //       req.flash('err_msg', '無法變更此狀態的訂單')
  //       return res.redirect(`/order/approval/${orderId}/edit`)
  //     }

  //     req.flash('suc_msg', '訂單已提交並核准')
  //     res.redirect('/order/approval?status=已核准')
  //   } catch (err) {
  //     console.error('approveEditOrder 發生錯誤:', err)
  //     req.flash('err_msg', '提交訂單失敗')
  //     res.redirect(`/order/approval/${orderId}/edit`)
  //   }
  // },

  // cancelOrder: async (req, res) => {
  //   const { id } = req.params
  //   try {
  //     await Order.findByIdAndUpdate(id, {
  //       status: '已作廢',
  //       reviewerId: req.user._id,
  //       reviewedAt: new Date()
  //     })
  //     req.flash('suc_msg', '訂單已作廢')
  //     res.redirect('/order/approval?status=已作廢')
  //   } catch (err) {
  //     console.error(err)
  //     req.flash('err_msg', '作廢失敗')
  //     res.redirect('/order/approval')
  //   }
  // },

  // printLabel: async (req, res) => {
  //   try {
  //     const order = await Order.findById(req.params.orderId).lean()
  //     if (!order) {
  //       req.flash('err_msg', '無法列印：訂單不存在')
  //       return res.redirect('/order/history')
  //     }

  //     const adjustedItems = order.items.map(item => {
  //       if (item.printOnce === true) {
  //         return { ...item, quantity: 1 }
  //       }
  //       return item
  //     })

  //     const dateStr = order.createdAt
  //       ? new Date(order.createdAt).toISOString().slice(0, 10)
  //       : ''
  //     const rawFileName = `${order.shopId}_${order.customerName}_${dateStr}_labels.pdf`
  //     const encodedFileName = encodeURIComponent(rawFileName)

  //     const pdfBuffer = await generateLabelPDF(adjustedItems, {
  //       shopId: order.shopId,
  //       customerName: order.customerName,
  //       createdAt: dateStr
  //     })

  //     res.setHeader('Content-Type', 'application/pdf')
  //     res.setHeader(
  //       'Content-Disposition',
  //       `inline; filename*=UTF-8''${encodedFileName}`
  //     )

  //     res.send(pdfBuffer)
  //   } catch (err) {
  //     console.error(err)
  //     req.flash('err_msg', '列印條碼時發生錯誤')
  //     res.redirect('/order/history')
  //   }
  // },

  // exportOrderPDF: async (req, res) => {
  //   try {
  //     const orderId = req.params.id
  //     const order = await Order.findById(orderId).lean()

  //     if (!order) {
  //       return res.status(404).send('找不到訂單')
  //     }

  //     const pdfBytes = await generateOrderDetailPDF({
  //       items: order.items,
  //       shopId: order.shopId,
  //       customerName: order.customerName,
  //       createdAt: order.createdAt,
  //     })

  //     const dateStr = order.createdAt ? new Date(order.createdAt).toISOString().slice(0, 10) : ''
  //     const sanitize = str => str.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_')
  //     const rawFileName = `${sanitize(order.shopId)}_${sanitize(order.customerName)}_${dateStr}.pdf`
  //     const encodedFileName = encodeURIComponent(rawFileName)

  //     res.setHeader('Content-Type', 'application/pdf')
  //     res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodedFileName}`)
  //     res.send(pdfBytes)
  //   } catch (err) {
  //     console.error(err)
  //     res.status(500).send('產生 PDF 失敗')
  //   }
  // }
}

module.exports = stOrderController