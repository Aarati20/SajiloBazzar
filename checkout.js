// UI-label ↔ API-value mapping for payment method.
var PAY_UI_TO_API = { 'eSewa': 'esewa', 'Khalti': 'khalti', 'Cash on delivery': 'cod' };

function summaryRows(items) {
  return items.map(function (i) {
    return '<div class="summary-row">' +
      (i.image_url ? '<img src="' + escapeHtml(i.image_url) + '" alt="">' : '<span></span>') +
      '<span class="summary-name">' + escapeHtml(i.name) + '<span class="muted"> &times; ' + i.quantity + '</span></span>' +
      '<span class="summary-price">' + formatRs(i.line_total) + '</span></div>';
  }).join('');
}

// Reuse the address from the most recent order so repeat customers don't
// retype it. Never overwrites something the user already typed.
async function prefillAddress() {
  var input = document.getElementById('co-addr');
  try {
    var orders = await api('/orders');
    if (orders.length && !input.value) {
      input.value = orders[0].address;
      document.getElementById('co-addr-note').hidden = false;
    }
  } catch (e) { /* no saved address: the field just stays empty */ }
}

document.addEventListener('DOMContentLoaded', async function () {
  renderSteps('steps', 1);
  if (!(await requireLogin())) return;

  var cart = await api('/cart');
  // Nothing to check out: send the user back to the cart's empty state.
  if (!cart.items.length) { location.replace('cart.html'); return; }
  document.getElementById('co-total').textContent = formatRs(cart.total);
  document.getElementById('co-items').innerHTML = summaryRows(cart.items);
  prefillAddress();
  submitOnEnter('co-submit', ['co-addr']);

  var pay = document.getElementById('co-pay');
  var err = document.getElementById('co-error');
  document.getElementById('co-submit').addEventListener('click', async function () {
    err.hidden = true;
    var addr = document.getElementById('co-addr').value.trim();
    var method = pay.value;

    if (!addr) {
      err.textContent = 'Delivery address is required.';
      err.hidden = false;
      return;
    }

    // Wallet flows go to the pay screen; COD places the order immediately.
    if (method !== 'Cash on delivery') {
      location.href = 'pay.html?method=' + encodeURIComponent(method) +
                      '&address=' + encodeURIComponent(addr);
      return;
    }

    try {
      var res = await api('/orders', {
        method: 'POST',
        body: { address: addr, payment_method: PAY_UI_TO_API[method] || 'cod' },
      });
      location.href = 'done.html?id=' + res.id;
    } catch (e) {
      err.textContent = e.message;
      err.hidden = false;
    }
  });
});
