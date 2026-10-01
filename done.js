function renderSummary(order) {
  var box = document.getElementById('done-summary');
  box.innerHTML = order.items.map(function (i) {
    return '<div class="summary-row">' +
      (i.image_url ? '<img src="' + escapeHtml(i.image_url) + '" alt="">' : '<span></span>') +
      '<span class="summary-name">' + escapeHtml(i.name) + '<span class="muted"> &times; ' + i.quantity + '</span></span>' +
      '<span class="summary-price">' + formatRs(i.line_total) + '</span></div>';
  }).join('') +
    '<dl class="done-facts">' +
    '<div><dt>Total</dt><dd>' + formatRs(order.total) + '</dd></div>' +
    '<div><dt>Payment</dt><dd>' + escapeHtml(paymentLabel(order.payment_method)) + '</dd></div>' +
    '<div><dt>Deliver to</dt><dd>' + escapeHtml(order.address) + '</dd></div></dl>';
  box.hidden = false;
}

document.addEventListener('DOMContentLoaded', async function () {
  renderSteps('steps', 4);
  if (!(await requireLogin())) return;
  var el = document.getElementById('done-id');
  var id = new URLSearchParams(location.search).get('id');
  if (!id) { el.textContent = '(unknown)'; return; }
  try {
    var order = await api('/orders/' + id);
    el.textContent = 'ORD-' + order.id;
    renderSummary(order);
  } catch (e) {
    el.textContent = '(unknown)';
  }
});
