function submitPage(page) {
  const form = document.getElementById('vip-form')
  let input = form.querySelector('input[name="page"]')
  if (!input) {
    input = document.createElement('input')
    input.type = 'hidden'
    input.name = 'page'
    form.appendChild(input)
  }
  input.value = page
  form.submit()
}
