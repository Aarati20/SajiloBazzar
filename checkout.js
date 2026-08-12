function completeOrder() {
  var id = 'ORD-' + (1000 + DB.orders.length + 1);
  var summary = DB.cart.map(function (c) { return c.name + ' x' + c.qty; }).join(', ');
  DB.orders.push({ id: id, summary: summary, total: cartTotal(), pay: DB.payMethod });
  DB.cart = [];
  DB.orderId = id;
  DB.addr = '';
  saveDB(DB);
  location.href = 'done.html';
}
document.addEventListener('DOMContentLoaded', function () {
  if (!requireLogin()) return;
  document.getElementById('co-total').textContent = 'Rs ' + cartTotal();
  var pay = document.getElementById('co-pay');
  pay.value = DB.payMethod || 'eSewa';
  var err = document.getElementById('co-error');
  document.getElementById('co-submit').addEventListener('click', function () {
    var addr = document.getElementById('co-addr').value.trim();
    DB.payMethod = pay.value;
    if (!addr) {
      err.textContent = 'Delivery address is required.';
      err.hidden = false;
      DB.payMethod = 'eSewa';
      pay.value = 'eSewa';
      saveDB(DB);
      return;
    }
    DB.addr = addr;
    saveDB(DB);
    if (DB.payMethod !== 'Cash on delivery') { location.href = 'pay.html'; return; }
    completeOrder();
  });
});
