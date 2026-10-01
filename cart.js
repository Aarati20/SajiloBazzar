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
    area.innerHTML = '<div class="card empty-state">' +
      '<img src="images/products/jute-tote-bag.svg" alt="">' +
      '<p class="empty-title">Your cart is empty.</p>' +
      '<p class="muted">Fresh picks are waiting, like Ilam green tea and a handmade lokta journal.</p>' +
      '<a class="btn btn-primary" style="text-decoration:none" href="shop.html">Start shopping</a></div>';
    return;
  }
  var rows = CART.items.map(function (c) {
    return '<div class="cart-row">' +
      (c.image_url
        ? '<img class="cart-thumb" src="' + escapeHtml(c.image_url) + '" alt="">'
        : '<div class="cart-thumb"></div>') +
      '<div class="cart-info"><a class="cart-name" href="product.html?id=' + c.product_id + '">' + escapeHtml(c.name) + '</a>' +
      '<p class="muted" style="margin:4px 0 0;font-size:15px">' + formatRs(c.price) + ' each</p></div>' +
      '<div class="cart-qty">' +
      '<button data-dec="' + c.id + '" aria-label="Decrease quantity of ' + escapeHtml(c.name) + '">&minus;</button>' +
      '<span>' + c.quantity + '</span>' +
      '<button data-inc="' + c.id + '" aria-label="Increase quantity of ' + escapeHtml(c.name) + '">+</button>' +
      '</div>' +
      '<p class="cart-line-total">' + formatRs(c.line_total) + '</p>' +
      '<button data-rm="' + c.id + '" class="btn btn-ghost cart-remove">Remove</button>' +
      '</div>';
  }).join('');
  area.innerHTML = '<div style="display:flex;flex-direction:column;gap:14px">' + rows +
    '<div class="cart-summary">' +
    '<span style="font-size:18px">Total</span>' +
    '<span class="cart-total">' + formatRs(CART.total) + '</span>' +
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
  renderSteps('steps', 0);
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
