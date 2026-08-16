// UI-label ↔ API-value mapping for payment method.
var PAY_UI_TO_API = { 'eSewa': 'esewa', 'Khalti': 'khalti', 'Cash on delivery': 'cod' };

async function placeOrder(address, payLabel) {
  var res = await api('/orders', {
    method: 'POST',
    body: { address: address, payment_method: PAY_UI_TO_API[payLabel] || 'cod' },
  });
  // Stash for done.html + orders list.
  localStorage.setItem('sajilo-last-order', JSON.stringify(res));
  return res;
}

document.addEventListener('DOMContentLoaded', async function () {
  if (!(await requireLogin())) return;

  var cart = await api('/cart');
  document.getElementById('co-total').textContent = 'Rs ' + cart.total;

  var pay = document.getElementById('co-pay');
  pay.value = localStorage.getItem('sajilo-pay-method') || 'eSewa';

  var err = document.getElementById('co-error');
  document.getElementById('co-submit').addEventListener('click', async function () {
    err.hidden = true;
    var addr = document.getElementById('co-addr').value.trim();
    var method = pay.value;
    localStorage.setItem('sajilo-pay-method', method);

    if (!addr) {
      err.textContent = 'Delivery address is required.';
      err.hidden = false;
      return;
    }

    // Wallet flows go to the pay screen; COD places the order immediately.
    if (method !== 'Cash on delivery') {
      localStorage.setItem('sajilo-pending-address', addr);
      location.href = 'pay.html';
      return;
    }

    try {
      await placeOrder(addr, method);
      location.href = 'done.html';
    } catch (e) {
      err.textContent = e.message;
      err.hidden = false;
    }
  });
});
