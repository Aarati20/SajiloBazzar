var CART = { items: [], total: 0 };

async function loadCart() {
  CART = await api('/cart');
  CART_COUNT = CART.items.reduce(function (n, i) { return n + i.quantity; }, 0);
  renderHeader();
  renderCart();
}

function renderCart() {
  var area = document.getElementById('cart-area');
  if (CART.items.length === 0) {
    area.innerHTML = '<div class="card" style="padding:50px;text-align:center;box-shadow:var(--shadow-sm)">' +
      '<p style="margin:0 0 22px;font-size:18px">Your cart is empty.</p>' +
      '<a class="btn btn-primary" style="text-decoration:none" href="shop.html">Start shopping</a></div>';
    return;
  }
  var rows = CART.items.map(function (c) {
    return '<div style="display:flex;align-items:center;gap:24px;background:var(--surface);border-radius:var(--radius);padding:18px 26px;box-shadow:var(--shadow-sm)">' +
      '<div style="flex:none;width:56px;height:56px;border-radius:14px;background:var(--sage-100)"></div>' +
      '<div style="flex:1"><p style="margin:0;font-size:17px;font-weight:600">' + c.name + '</p>' +
      '<p style="margin:4px 0 0;font-size:15px" class="muted">Rs ' + c.price + ' each</p></div>' +
      '<div style="flex:none;display:flex;align-items:center;gap:12px">' +
      '<button data-dec="' + c.id + '" style="border:0;cursor:pointer;width:38px;height:38px;border-radius:999px;background:var(--accent-100);color:var(--accent-800);font-size:20px">&minus;</button>' +
      '<span style="min-width:28px;text-align:center;font-size:18px;font-weight:600">' + c.quantity + '</span>' +
      '<button data-inc="' + c.id + '" style="border:0;cursor:pointer;width:38px;height:38px;border-radius:999px;background:var(--accent-100);color:var(--accent-800);font-size:20px">+</button>' +
      '</div>' +
      '<p style="flex:none;width:110px;text-align:right;margin:0;font-size:18px;font-family:var(--font-heading);color:var(--accent-700)">Rs ' + c.line_total + '</p>' +
      '<button data-rm="' + c.id + '" class="btn btn-ghost" style="flex:none;font-size:14px;padding:8px 16px">Remove</button>' +
      '</div>';
  }).join('');
  area.innerHTML = '<div style="display:flex;flex-direction:column;gap:14px">' + rows +
    '<div style="display:flex;align-items:center;justify-content:flex-end;gap:28px;margin-top:12px">' +
    '<span style="font-size:18px">Total</span>' +
    '<span style="font-family:var(--font-heading);font-size:30px;color:var(--accent-700)">Rs ' + CART.total + '</span>' +
    '<a class="btn btn-primary" style="text-decoration:none" href="checkout.html">Proceed to checkout</a>' +
    '</div></div>';
}

async function changeQty(itemId, delta) {
  var item = CART.items.find(function (c) { return c.id === itemId; });
  if (!item) return;
  var newQty = item.quantity + delta;
  try {
    if (newQty <= 0) {
      await api('/cart/' + itemId, { method: 'DELETE' });
      toast('Item removed');
    } else {
      await api('/cart/' + itemId, { method: 'PATCH', body: { quantity: newQty } });
    }
    await loadCart();
  } catch (e) {
    toast(e.message);
  }
}

async function removeItem(itemId) {
  try {
    await api('/cart/' + itemId, { method: 'DELETE' });
    toast('Item removed');
    await loadCart();
  } catch (e) {
    toast(e.message);
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  if (!(await requireLogin())) return;
  await loadCart();
  document.getElementById('cart-area').addEventListener('click', function (e) {
    var inc = e.target.getAttribute('data-inc');
    var dec = e.target.getAttribute('data-dec');
    var rm  = e.target.getAttribute('data-rm');
    if (rm) return removeItem(parseInt(rm, 10));
    if (inc) return changeQty(parseInt(inc, 10), +1);
    if (dec) return changeQty(parseInt(dec, 10), -1);
  });
});
