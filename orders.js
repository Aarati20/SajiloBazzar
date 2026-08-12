document.addEventListener('DOMContentLoaded', function () {
  if (!requireLogin()) return;
  var area = document.getElementById('orders-area');
  if (DB.orders.length === 0) {
    area.innerHTML = '<div class="card" style="padding:50px;text-align:center;box-shadow:var(--shadow-sm)"><p style="margin:0;font-size:18px">You have not placed any orders yet.</p></div>';
    return;
  }
  area.innerHTML = '<div style="display:flex;flex-direction:column;gap:14px">' +
    DB.orders.map(function (o) {
      return '<div style="display:flex;align-items:center;gap:28px;background:var(--surface);border-radius:var(--radius);padding:22px 28px;box-shadow:var(--shadow-sm)">' +
        '<span style="font-family:var(--font-heading);font-size:20px;color:var(--accent-700)">' + o.id + '</span>' +
        '<span style="flex:1;font-size:16px">' + o.summary + '</span>' +
        '<span style="font-size:15px" class="muted">' + o.pay + '</span>' +
        '<span style="font-family:var(--font-heading);font-size:20px">Rs ' + o.total + '</span>' +
        '</div>';
    }).join('') + '</div>';
});
