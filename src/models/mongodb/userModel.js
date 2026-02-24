const mongoose = require('mongoose')

const Schema = mongoose.Schema

const userSchema = new Schema({
  EMP_ID: {     // 員工編號
    type: String,
    required: true
  },
  SHOP_ID: {    // 門市編號
    type: String,
    required: true
  },
  EMP_NAME: {   // 姓名
    type: String,
    required: true
  },
  EMP_LEVEL: {  // 權限等級
    type: Number,
    required: true
  },
  ENABLE: {     // 可用
    type: Boolean,
    required: true
  },
  password: {
    type: String,
    required: false
  }
},
  {
    collection: 'EMPLOYEE'
  })

const User = mongoose.model('EMPLOYEE', userSchema)

module.exports = User