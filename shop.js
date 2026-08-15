document.addEventListener('DOMContentLoaded', async function () {
  if (!(await requireLogin())) return;
  var grid = document.getElementById('grid');
  grid.innerHTML = '<p class="muted">Loading products…</p>';

  var products;
  try {
    products = await api('/products');
  } catch (e) {
    grid.innerHTML = '<p class="error">Could not load products: ' + e.message + '</p>';
    return;
  }

  grid.innerHTML = products.map(function (p) {
    return '<div style="background:var(--surface);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow-sm);display:flex;flex-direction:column">' +
      '<div style="height:140px;background:var(--sage-100);display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-size:22px;color:var(--sage-800)">' + p.name + '</div>' +
      '<div style="padding:20px 22px;display:flex;flex-direction:column;gap:10px;flex:1">' +
      '<span class="tag" style="align-self:flex-start">' + p.tag + '</span>' +
      '<p style="margin:0;font-size:18px;font-weight:600">' + p.name + '</p>' +
      '<p style="margin:0;font-size:20px;font-family:var(--font-heading);color:var(--accent-700)">Rs ' + p.price + '</p>' +
      '<div style="flex:1"></div>' +
      '<button class="btn btn-primary" style="font-size:15px" data-add="' + p.id + '" data-name="' + p.name + '">Add to cart</button>' +
      '</div></div>';
  }).join('');

  grid.addEventListener('click', async function (e) {
    var id = e.target.getAttribute('data-add');
    if (!id) return;
    var name = e.target.getAttribute('data-name');
    e.target.disabled = true;
    try {
      await api('/cart', { method: 'POST', body: { product_id: parseInt(id, 10), quantity: 1 } });
      CART_COUNT += 1;
      renderHeader();
      toast(name + ' added to cart');
    } catch (err) {
      toast(err.message);
    } finally {
      e.target.disabled = false;
    }
  });
});
