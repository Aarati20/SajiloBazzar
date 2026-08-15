document.addEventListener('DOMContentLoaded', async function () {
  if (!(await requireLogin())) return;
  var area = document.getElementById('orders-area');
  area.innerHTML = '<p class="muted">Loading orders…</p>';

  var orders;
  try {
    orders = await api('/orders');
  } catch (e) {
    area.innerHTML = '<p class="error">Could not load orders: ' + e.message + '</p>';
    return;
  }

  if (orders.length === 0) {
    area.innerHTML = '<div class="card" style="padding:50px;text-align:center;box-shadow:var(--shadow-sm)"><p style="margin:0;font-size:18px">You have not placed any orders yet.</p></div>';
    return;
  }

  area.innerHTML = '<div style="display:flex;flex-direction:column;gap:14px">' +
    orders.map(function (o) {
      return '<div style="display:flex;align-items:center;gap:28px;background:var(--surface);border-radius:var(--radius);padding:22px 28px;box-shadow:var(--shadow-sm)">' +
        '<span style="font-family:var(--font-heading);font-size:20px;color:var(--accent-700)">ORD-' + o.id + '</span>' +
        '<span style="flex:1;font-size:16px">' + o.address + '</span>' +
        '<span style="font-size:15px" class="muted">' + o.payment_method + '</span>' +
        '<span style="font-family:var(--font-heading);font-size:20px">Rs ' + o.total + '</span>' +
        '</div>';
    }).join('') + '</div>';
});
