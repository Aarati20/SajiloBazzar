// UI-label ↔ API-value mapping for payment method.
var PAY_UI_TO_API = { 'eSewa': 'esewa', 'Khalti': 'khalti', 'Cash on delivery': 'cod' };

document.addEventListener('DOMContentLoaded', async function () {
  if (!(await requireLogin())) return;

  var cart = await api('/cart');
  document.getElementById('co-total').textContent = 'Rs ' + cart.total;

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
