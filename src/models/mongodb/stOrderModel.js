// src/models/stOrderModel.js

const mongoose = require('mongoose')

const orderItemSchema = new mongoose.Schema({
  PROD_ID: String,
  PROD_NAME2: String,
  PROD_KIND: String,
  DEP_ID: String,
  UNIT1: String,
  quantity: Number,
  unit: String,
  allowBox: Boolean,
  unitsPerBox: Number,
  printOnce: Boolean
}, { _id: false })

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EMPLOYEE'
  },
  shopId: String,
  customerName: {
    type: String,
    required: true
  },
  items: [orderItemSchema],
  status: {
    type: String,
    enum: ['待核准', '已核准', '已作廢', '調整作廢', '調整中', '調整核准'],
    default: '待核准'
  },
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EMPLOYEE',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  basedOnOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ORDER01',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'ORDER01'
})

module.exports = mongoose.model('ORDER01', orderSchema)