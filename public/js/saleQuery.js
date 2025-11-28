document.getElementById('exportExcelBtn').addEventListener('click', async (e) => {
  e.preventDefault(); // ❗ 阻止表單預設提交

  const form = document.getElementById('sale-form');

  // 1️⃣ 收集表單資料
  const formData = new FormData(form);
  // 如果 checkbox 多選，FormData 會有多筆同名值
  const plainData = {};
  formData.forEach((value, key) => {
    if (plainData[key]) {
      // 已存在就變陣列
      if (!Array.isArray(plainData[key])) {
        plainData[key] = [plainData[key]];
      }
      plainData[key].push(value);
    } else {
      plainData[key] = value;
    }
  });

  try {
    // 2️⃣ 傳送到匯出 API
    const res = await fetch('/sale/sale-data/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plainData) // ✅ 只傳篩選條件
    });

    if (!res.ok) throw new Error('匯出失敗');

    // 3️⃣ 下載檔案
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    // 從 header 解析檔名（如果後端有設定 Content-Disposition）
    let filename = '銷售資料.xlsx';
    const disposition = res.headers.get('Content-Disposition');
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match != null && match[1]) {
        filename = decodeURIComponent(match[1].replace(/['"]/g, ''));
      }
    }

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert(err.message);
  }
});