// Product detail page: product.html?id=<product id>.
var MAX_PER_PRODUCT = 10;   // mirrors the API's per-product cap

function renderProduct(p) {
  document.title = p.name + ' · SajiloBazar';
  document.getElementById('breadcrumb').innerHTML =
    '<a href="shop.html">Shop</a><span aria-hidden="true">/</span>' +
    '<span>' + escapeHtml(p.tag) + '</span><span aria-hidden="true">/</span>' +
    '<span aria-current="page">' + escapeHtml(p.name) + '</span>';

  var area = document.getElementById('product-area');
  area.innerHTML = '<article class="product-detail">' +
    (p.image_url
      ? '<img class="product-detail-image" src="' + escapeHtml(p.image_url) + '" alt="' + escapeHtml(p.name) + '">'
      : '<div class="product-detail-image product-image-fallback">' + escapeHtml(p.name) + '</div>') +
    '<div class="product-detail-info">' +
      '<span class="tag" style="align-self:flex-start">' + escapeHtml(p.tag) + '</span>' +
      '<h1 style="margin:0;font-size:36px">' + escapeHtml(p.name) + '</h1>' +
      '<p class="product-price" style="font-size:28px">' + formatRs(p.price) + '</p>' +
      '<p style="margin:0;font-size:17px;line-height:1.6">' + escapeHtml(p.description || 'No description yet.') + '</p>' +
      '<div class="qty-row">' + qtyStepper('pd-qty') +
        '<span class="muted" style="font-size:14px">Maximum ' + MAX_PER_PRODUCT + ' per order.</span></div>' +
      '<button id="pd-add" class="btn btn-primary" style="align-self:flex-start;padding:13px 36px">Add to cart</button>' +
      '<a href="shop.html" class="back-link">&larr; Back to shop</a>' +
    '</div></article>';
  wireQtyStepper(area, 'pd-qty', MAX_PER_PRODUCT);

  var button = document.getElementById('pd-add');
  button.addEventListener('click', async function () {
    var qty = parseInt(document.getElementById('pd-qty').value, 10) || 1;
    button.disabled = true;
    try {
      await api('/cart', { method: 'POST', body: { product_id: p.id, quantity: qty } });
      CART_COUNT += qty;
      renderHeader();
      bumpCart();
      toast(qty === 1 ? p.name + ' added to cart' : qty + ' × ' + p.name + ' added to cart');
    } catch (e) {
      toast(e.message);
    } finally {
      button.disabled = false;
    }
  });
}

async function renderRelated(p) {
  var others;
  try {
    others = (await api('/products?category=' + encodeURIComponent(p.tag)))
      .filter(function (o) { return o.id !== p.id; }).slice(0, 4);
  } catch (e) {
    return;   // related products are a nice-to-have; the page works without them
  }
  if (!others.length) return;
  document.getElementById('related-title').textContent = 'More in ' + p.tag;
  document.getElementById('related-grid').innerHTML = others.map(function (o) {
    return '<a class="product-card related-card" href="product.html?id=' + o.id + '">' +
      '<img class="product-image" src="' + escapeHtml(o.image_url || '') + '" alt="">' +
      '<div class="product-body"><span class="product-name">' + escapeHtml(o.name) + '</span>' +
      '<span class="product-price">' + formatRs(o.price) + '</span></div></a>';
  }).join('');
  document.getElementById('related').hidden = false;
}

document.addEventListener('DOMContentLoaded', async function () {
  if (!(await requireLogin())) return;
  var area = document.getElementById('product-area');
  var id = parseInt(new URLSearchParams(location.search).get('id'), 10);

  var p;
  try {
    if (!id) throw new Error('Product not found');
    p = await api('/products/' + id);
  } catch (e) {
    area.innerHTML = '<div class="empty-state card">' +
      '<img src="images/products/jute-tote-bag.svg" alt="">' +
      '<p class="empty-title">We couldn&rsquo;t find that product.</p>' +
      '<p class="muted">' + escapeHtml(e.message) + '</p>' +
      '<a class="btn btn-primary" style="text-decoration:none" href="shop.html">Back to shop</a></div>';
    return;
  }
  renderProduct(p);
  renderRelated(p);
});
