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
  var units = o.items.reduce(function (n, i) { return n + i.quantity; }, 0);
  // Hovering the item count lists what was in the order.
  var names = o.items.map(function (i) { return i.name + ' × ' + i.quantity; }).join(', ');
  var items = units
    ? '<span title="' + escapeHtml(names) + '">' + units + (units === 1 ? ' item' : ' items') + '</span>'
    : '<span class="muted" title="Item details were not recorded for this order">&mdash;</span>';

  return '<tr>' +
    '<td class="order-id">ORD-' + o.id + '</td>' +
    '<td class="col-date" title="' + escapeHtml(formatDate(o.created_at)) + '">' + formatShortDate(o.created_at) + '</td>' +
    '<td>' + items + '</td>' +
    '<td class="col-payment">' + escapeHtml(paymentLabel(o.payment_method)) + '</td>' +
    '<td><span class="status-badge ' + (cod ? 'status-pending' : 'status-paid') + '">' +
      (cod ? 'Pending' : 'Paid') + '</span></td>' +
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
    '<th scope="col" class="col-payment">Payment</th><th scope="col">Status</th><th scope="col" class="num">Total</th></tr></thead>' +
    '<tbody>' + orders.map(renderRow).join('') + '</tbody></table></div>';
});
