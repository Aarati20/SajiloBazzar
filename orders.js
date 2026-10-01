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
    '<td class="col-actions"><button type="button" class="btn btn-ghost delete-order" data-delete="' + o.id + '" aria-label="Delete ORD-' + o.id + '">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg>' +
      '<span class="delete-label">Delete</span></button></td>' +
    '</tr>';
}

function renderEmpty(area) {
  area.innerHTML = '<div class="card empty-state">' +
    '<img src="images/products/canvas-backpack.svg" alt="">' +
    '<p class="empty-title">You have not placed any orders yet.</p>' +
    '<p class="muted">When you do, they will show up here with their items and status.</p>' +
    '<a class="btn btn-primary" style="text-decoration:none" href="shop.html">Start shopping</a></div>';
}

// Ask before deleting; on success drop the row (or show the empty state).
function wireDelete(area) {
  var dialog = document.getElementById('confirm-delete');
  var confirmBtn = document.getElementById('cd-confirm');
  var err = document.getElementById('cd-error');
  var pending = null;   // { id, row }

  area.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-delete]');
    if (!btn) return;
    pending = { id: btn.getAttribute('data-delete'), row: btn.closest('tr') };
    document.getElementById('cd-title').textContent = 'Delete ORD-' + pending.id + '?';
    err.hidden = true;
    dialog.showModal();
  });

  document.getElementById('cd-cancel').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });

  confirmBtn.addEventListener('click', async function () {
    if (!pending) return;
    confirmBtn.disabled = true;
    try {
      await api('/orders/' + pending.id, { method: 'DELETE' });
      var body = pending.row.parentNode;
      pending.row.remove();
      dialog.close();
      toast('ORD-' + pending.id + ' deleted');
      if (!body.children.length) renderEmpty(area);
    } catch (e) {
      err.textContent = e.message;
      err.hidden = false;
    } finally {
      confirmBtn.disabled = false;
    }
  });
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

  if (orders.length === 0) { renderEmpty(area); return; }

  area.innerHTML = '<div class="card orders-table-wrap"><table class="orders-table">' +
    '<thead><tr><th scope="col">Order</th><th scope="col" class="col-date">Date</th><th scope="col">Items</th>' +
    '<th scope="col" class="col-payment">Payment</th><th scope="col" class="col-status">Status</th><th scope="col" class="num">Total</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead>' +
    '<tbody>' + orders.map(renderRow).join('') + '</tbody></table></div>';
  wireDelete(area);
});
