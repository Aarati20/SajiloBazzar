function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ', ' + new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatShortDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

function renderRow(o) {
  var cod = o.payment_method === 'cod';
  var items = o.items.length
    ? '<ul class="order-items">' + o.items.map(function (i) {
        return '<li>' + (i.image_url ? '<img src="' + escapeHtml(i.image_url) + '" alt="">' : '') +
          '<span>' + escapeHtml(i.name) + ' <span class="muted">&times; ' + i.quantity + '</span></span></li>';
      }).join('') + '</ul>'
    : '<span class="muted">Not recorded</span>';

  var badge = '<span class="status-badge ' + (cod ? 'status-pending' : 'status-paid') + '">' +
    (cod ? 'Pending' : 'Paid') + '</span>';

  // On phones the Status column is hidden and the badge sits under the
  // order number instead (see .status-inline in styles.css).
  return '<tr>' +
    '<td class="order-id">ORD-' + o.id + '<span class="status-inline">' + badge + '</span></td>' +
    '<td class="col-date" title="' + escapeHtml(formatDate(o.created_at)) + '">' + formatShortDate(o.created_at) + '</td>' +
    '<td class="col-items">' + items + '</td>' +
    '<td class="col-payment">' + escapeHtml(paymentLabel(o.payment_method)) + '</td>' +
    '<td class="col-status">' + badge + '</td>' +
    '<td class="num order-total">' + formatRs(o.total) + '</td>' +
    '</tr>';
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

  area.innerHTML = '<div class="card orders-table-wrap"><table class="orders-table">' +
    '<thead><tr><th scope="col">Order</th><th scope="col" class="col-date">Date</th><th scope="col">Items</th>' +
    '<th scope="col" class="col-payment">Payment</th><th scope="col" class="col-status">Status</th><th scope="col" class="num">Total</th></tr></thead>' +
    '<tbody>' + orders.map(renderRow).join('') + '</tbody></table></div>';
});
