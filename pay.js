// Fake wallet screen: MPIN 1234 is accepted, anything else is rejected.
document.addEventListener('DOMContentLoaded', async function () {
  if (!(await requireLogin())) return;

  var method = localStorage.getItem('sajilo-pay-method') || 'eSewa';
  document.getElementById('pay-badge').textContent = method;
  document.getElementById('pay-title').textContent = 'Pay with ' + method;
  document.getElementById('pay-id-label').textContent = method + ' mobile number';

  var cart = await api('/cart');
  document.getElementById('pay-total').textContent = 'Rs ' + cart.total;
  document.getElementById('pay-submit').textContent = 'Pay Rs ' + cart.total;

  var err = document.getElementById('pay-error');
  document.getElementById('pay-submit').addEventListener('click', async function () {
    err.hidden = true;
    var wallet = document.getElementById('pay-id').value.trim();
    var pin = document.getElementById('pay-pin').value;
    if (!/^\d{10}$/.test(wallet)) { err.textContent = 'Enter a valid 10-digit wallet mobile number.'; err.hidden = false; return; }
    if (!/^\d{4}$/.test(pin))     { err.textContent = 'Enter your 4-digit MPIN.'; err.hidden = false; return; }
    if (pin !== '1234')           { err.textContent = 'Incorrect MPIN.'; err.hidden = false; return; }

    var addr = localStorage.getItem('sajilo-pending-address') || '';
    try {
      var apiMethod = method === 'Khalti' ? 'khalti' : 'esewa';
      var res = await api('/orders', {
        method: 'POST',
        body: { address: addr, payment_method: apiMethod },
      });
      localStorage.setItem('sajilo-last-order', JSON.stringify(res));
      localStorage.removeItem('sajilo-pending-address');
      location.href = 'done.html';
    } catch (e) {
      err.textContent = e.message;
      err.hidden = false;
    }
  });
});
