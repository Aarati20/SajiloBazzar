document.addEventListener('DOMContentLoaded', function () {
  if (!requireLogin()) return;
  var m = DB.payMethod === 'Khalti' ? 'Khalti' : 'eSewa';
  document.getElementById('pay-badge').textContent = m;
  document.getElementById('pay-title').textContent = 'Pay with ' + m;
  document.getElementById('pay-id-label').textContent = m + ' mobile number';
  document.getElementById('pay-total').textContent = 'Rs ' + cartTotal();
  document.getElementById('pay-submit').textContent = 'Pay Rs ' + cartTotal();
  var err = document.getElementById('pay-error');
  document.getElementById('pay-submit').addEventListener('click', function () {
    var id = document.getElementById('pay-id').value.trim();
    var pin = document.getElementById('pay-pin').value;
    if (!id) { err.textContent = 'Enter your wallet mobile number.'; err.hidden = false; return; }
    if (!pin) { err.textContent = 'Enter your MPIN.'; err.hidden = false; return; }
    var oid = 'ORD-' + (1000 + DB.orders.length + 1);
    var summary = DB.cart.map(function (c) { return c.name + ' x' + c.qty; }).join(', ');
    DB.orders.push({ id: oid, summary: summary, total: cartTotal(), pay: DB.payMethod });
    DB.cart = [];
    DB.orderId = oid;
    DB.addr = '';
    saveDB(DB);
    location.href = 'done.html';
  });
});
