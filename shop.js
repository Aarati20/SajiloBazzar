document.addEventListener('DOMContentLoaded', function () {
  if (!requireLogin()) return;
  var grid = document.getElementById('grid');
  grid.innerHTML = PRODUCTS.map(function (p) {
    return '<div style="background:var(--surface);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow-sm);display:flex;flex-direction:column">' +
      '<div style="height:140px;background:var(--sage-100);display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-size:22px;color:var(--sage-800)">' + p.name + '</div>' +
      '<div style="padding:20px 22px;display:flex;flex-direction:column;gap:10px;flex:1">' +
      '<span class="tag" style="align-self:flex-start">' + p.tag + '</span>' +
      '<p style="margin:0;font-size:18px;font-weight:600">' + p.name + '</p>' +
      '<p style="margin:0;font-size:20px;font-family:var(--font-heading);color:var(--accent-700)">Rs ' + p.price + '</p>' +
      '<div style="flex:1"></div>' +
      '<button class="btn btn-primary" style="font-size:15px" data-add="' + p.id + '">Add to cart</button>' +
      '</div></div>';
  }).join('');
  grid.addEventListener('click', function (e) {
    var id = e.target.getAttribute('data-add');
    if (!id) return;
    var p = PRODUCTS.find(function (x) { return x.id === id; });
    var i = DB.cart.findIndex(function (c) { return c.id === id; });
    if (i < 0) {
      DB.cart.push({ id: p.id, name: p.name, price: p.id === 'P6' ? 99 : p.price, qty: 1 });
    } else if (DB.cart[i].qty >= 11) {
      toast('Maximum 10 per product');
      return;
    } else {
      DB.cart[i].qty += 1;
    }
    saveDB(DB);
    renderHeader();
    toast(p.name + ' added to cart');
  });
});
