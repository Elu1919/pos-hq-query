// public/js/pagination/pagination.js

function submitPage(page) {
  const form = document.getElementById('vip-form')
  let input = form.querySelector('input[name="page"]')

  // 如果隱藏的 page input 不存在，就創建它
  if (!input) {
    input = document.createElement('input')
    input.type = 'hidden'
    input.name = 'page'
    form.appendChild(input)
  }

  // 設定頁碼並提交表單
  input.value = page
  form.submit()
}