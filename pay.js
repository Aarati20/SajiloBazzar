// Fake wallet screen: MPIN 1234 is accepted, anything else is rejected.
document.addEventListener('DOMContentLoaded', async function () {
  if (!(await requireLogin())) return;

  var params = new URLSearchParams(location.search);
  // Show the wallet's proper name even if the link spells it in lowercase.
  var method = paymentLabel(params.get('method') || 'eSewa');
  var addr = params.get('address') || '';
  document.getElementById('pay-badge').textContent = method;
  document.getElementById('pay-title').textContent = 'Pay with ' + method;
  document.getElementById('pay-id-label').textContent = method + ' mobile number';

  renderSteps('steps', 2);
  var cart = await api('/cart');
  // Nothing to pay for: send the user back to the cart's empty state.
  if (!cart.items.length) { location.replace('cart.html'); return; }
  document.getElementById('pay-total').textContent = formatRs(cart.total);
  document.getElementById('pay-submit').textContent = 'Pay ' + formatRs(cart.total);
  submitOnEnter('pay-submit', ['pay-id', 'pay-pin']);

  var err = document.getElementById('pay-error');
  document.getElementById('pay-submit').addEventListener('click', async function () {
    err.hidden = true;
    var wallet = document.getElementById('pay-id').value.trim();
    var pin = document.getElementById('pay-pin').value;
    if (!/^\d{10}$/.test(wallet)) { err.textContent = 'Enter a valid 10-digit wallet mobile number.'; err.hidden = false; return; }
    if (!/^\d{4}$/.test(pin))     { err.textContent = 'Enter your 4-digit MPIN.'; err.hidden = false; return; }
    if (pin !== '1234')           { err.textContent = 'Incorrect MPIN.'; err.hidden = false; return; }

    try {
      var apiMethod = method === 'Khalti' ? 'khalti' : 'esewa';
      var res = await api('/orders', {
        method: 'POST',
        body: { address: addr, payment_method: apiMethod },
      });
      location.href = 'done.html?id=' + res.id;
    } catch (e) {
      err.textContent = e.message;
      err.hidden = false;
    }
  });
});
