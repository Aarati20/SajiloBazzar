function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ', ' + new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function renderOrder(o) {
  var cod = o.payment_method === 'cod';
  var items = o.items.length
    ? '<ul class="order-items">' + o.items.map(function (i) {
        return '<li>' + (i.image_url ? '<img src="' + escapeHtml(i.image_url) + '" alt="">' : '') +
          '<span>' + escapeHtml(i.name) + ' <span class="muted">&times; ' + i.quantity + '</span></span></li>';
      }).join('') + '</ul>'
    : '<p class="muted" style="margin:0;font-size:14px">Item details were not recorded for this order.</p>';

  return '<article class="order-card">' +
    '<div class="order-head">' +
      '<span class="order-id">ORD-' + o.id + '</span>' +
      '<span class="status-badge ' + (cod ? 'status-pending' : 'status-paid') + '">' +
        (cod ? 'Pay on delivery' : 'Paid') + '</span>' +
      '<span class="muted order-date">' + formatDate(o.created_at) + '</span>' +
      '<span class="order-total">' + formatRs(o.total) + '</span>' +
    '</div>' +
    items +
    '<p class="order-meta muted">' + escapeHtml(paymentLabel(o.payment_method)) + ' &middot; Deliver to ' + escapeHtml(o.address) + '</p>' +
    '</article>';
}

document.addEventListener('DOMContentLoaded', async function () {
  if (!(await requireLogin())) return;
  var area = document.getElementById('orders-area');
  area.innerHTML = '<p class="muted">Loading orders…</p>';

  var orders;
  try {
    orders = await api('/orders');
  } catch (e) {
    area.innerHTML = '<p class="error">Could not load orders: ' + escapeHtml(e.message) + '</p>';
    return;
  }

  if (orders.length === 0) {
    area.innerHTML = '<div class="card empty-state">' +
      '<img src="images/products/canvas-backpack.svg" alt="">' +
      '<p class="empty-title">You have not placed any orders yet.</p>' +
      '<p class="muted">When you do, they will show up here with their items and status.</p>' +
      '<a class="btn btn-primary" style="text-decoration:none" href="shop.html">Start shopping</a></div>';
    return;
  }

  area.innerHTML = '<div style="display:flex;flex-direction:column;gap:16px">' +
    orders.map(renderOrder).join('') + '</div>';
});
