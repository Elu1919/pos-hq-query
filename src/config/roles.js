// src/config/roles.js

// 1. 定義權限等級 (數字愈大權限愈高)
const ROLES = {
  ADMIN: 99,    // 全部
  ACC: 50,  // 對帳單、總部下載
  ST: 40,  // 銷售單、貴賓、商品、門市下載 (不可看撥補)
  WH: 30,   // 撥補
}

// 2. 直接定義使用者名單
const USERS = {
  'admin': {
    name: '系統管理員',
    role: 'admin',
    level: ROLES.ADMIN,
    shopId: ''
  },
  'ACC': {
    name: '會計',
    role: 'ACC',
    level: ROLES.ACC,
    shopId: ''
  },
  'WH': {
    name: '倉管',
    role: 'WH',
    level: ROLES.WH,
    shopId: 'WAREHOUSE'
  },
  'shopTEST01': {
    name: '測試店',
    role: 'ST',
    level: ROLES.ST,
    shopId: 'TEST01'
  },
  'shopB': {
    name: '佳里店',
    role: 'ST',
    level: ROLES.ST,
    shopId: 'B'
  },
  'shopC': {
    name: '永大',
    role: 'ST',
    level: ROLES.ST,
    shopId: 'C'
  },
  'shopD': {
    name: '關廟店',
    role: 'ST',
    level: ROLES.ST,
    shopId: 'D'
  },
  'shopE': {
    name: '中華店',
    role: 'ST',
    level: ROLES.ST,
    shopId: 'E'
  },
  'shopF': {
    name: '善化店',
    role: 'ST',
    level: ROLES.ST,
    shopId: 'F'
  },
  'shopI': {
    name: '安南店',
    role: 'ST',
    level: ROLES.ST,
    shopId: 'I'
  },
  'shopK': {
    name: '南紡店',
    role: 'ST',
    level: ROLES.ST,
    shopId: 'K'
  }
}

module.exports = { ROLES, USERS }