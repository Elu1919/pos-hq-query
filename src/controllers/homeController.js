// src/controller/homeController.js

const homeController = {
  homeRedirect: async (req, res) => {
    try {
      const user = req.currentUser

      if (user.role === "WH") {
        res.redirect('/st-order/order')

      } else {
        res.redirect('/sale/sale-data')

      }

    } catch (err) {
      res.status(500).send('資料取得失敗')
    }
  }
}

module.exports = homeController
