// Add-to-cart clicks are staged for a moment and sent as one POST /cart batch:
// clicking three products in a row is a single request, not three, and repeat
// clicks on the same product collapse into one line.
var FLUSH_DELAY = 600;      // ms of quiet before the staged batch is sent
var MAX_PER_PRODUCT = 10;   // mirrors the API's per-product cap
var PENDING = {};           // product_id -> { quantity, name }
var flushTimer = null;
var flushing = null;        // the in-flight flush, so navigation can wait on it

function stageAdd(productId, name, qty) {
  qty = qty || 1;
  var line = PENDING[productId];
  var staged = line ? line.quantity : 0;
  if (staged + qty > MAX_PER_PRODUCT) {
    // One over-limit line makes the API reject the whole batch, so stop
    // counting here instead of taking the other products down with it. The
    // cart may already hold units of this product, so the server still has
    // the final say.
    toast('Maximum ' + MAX_PER_PRODUCT + ' units of a single product');
    return false;
  }

  if (line) line.quantity += qty;
  else PENDING[productId] = { quantity: qty, name: name };

  // Move the header count now so a click still feels instant. POST /cart is
  // all-or-nothing, so a failed flush can take back exactly what it staged.
  CART_COUNT += qty;
  renderHeader();
  bumpCart();

  clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, FLUSH_DELAY);
  return true;
}

async function flush() {
  clearTimeout(flushTimer);
  flushTimer = null;

  // Take the batch before awaiting: clicks that land mid-request stage into a
  // fresh PENDING and go out in the next flush.
  var batch = PENDING;
  PENDING = {};
  var ids = Object.keys(batch);
  if (!ids.length) return;

  var units = ids.reduce(function (n, id) { return n + batch[id].quantity; }, 0);
  try {
    flushing = api('/cart', {
      method: 'POST',
      body: {
        items: ids.map(function (id) {
          return { product_id: parseInt(id, 10), quantity: batch[id].quantity };
        })
      }
    });
    await flushing;
    toast(units === 1 ? batch[ids[0]].name + ' added to cart'
                      : units + ' items added to cart');
  } catch (err) {
    // The batch either landed whole or not at all, so undo the whole guess.
    CART_COUNT -= units;
    renderHeader();
    toast(err.message);
  } finally {
    flushing = null;
  }
}

// Resolve once nothing is staged or in flight. flush() swallows its own errors,
// so this never rejects.
async function settlePending() {
  // A staged batch and an already-sent one can both be outstanding at once.
  if (flushing) { try { await flushing; } catch (e) {} }
  if (flushTimer) await flush();
}

var SEARCH_DELAY = 300;     // ms of quiet typing before the search is sent
var PAGE_SIZE = 8;
var searchTimer = null;
var searchSeq = 0;          // bumps per request so a slow, older reply can't win

var VIEW = {
  term: '',
  category: '',             // '' = all categories
  products: [],             // every product matching term + category (server)
  sort: 'featured',         // featured | price-asc | price-desc | name
  minPrice: null,           // price range, applied on top of the server result
  maxPrice: null,
  page: 1
};
var PRODUCTS_BY_ID = {};    // for quick view, filled from every response

// The server result narrowed by price and put in the chosen order.
function visibleProducts() {
  var list = VIEW.products.filter(function (p) {
    return (VIEW.minPrice == null || p.price >= VIEW.minPrice) &&
           (VIEW.maxPrice == null || p.price < VIEW.maxPrice);
  });
  var by = {
    'price-asc': function (a, b) { return a.price - b.price; },
    'price-desc': function (a, b) { return String(b.price).localeCompare(String(a.price)); },
    'name': function (a, b) { return a.name.localeCompare(b.name); }
  }[VIEW.sort];
  return by ? list.slice().sort(by) : list;
}

function productImage(p, cls) {
  if (!p.image_url) {
    return '<div class="' + cls + ' product-image-fallback">' + escapeHtml(p.name) + '</div>';
  }
  return '<img class="' + cls + '" src="' + escapeHtml(p.image_url) + '" alt="' + escapeHtml(p.name) + '">';
}

function renderCard(p) {
  return '<article class="product-card">' +
    '<button type="button" class="product-image-btn" data-quick="' + p.id + '" aria-label="Quick view: ' + escapeHtml(p.name) + '">' +
      productImage(p, 'product-image') +
      '<span class="quick-view-hint">Quick view</span>' +
    '</button>' +
    '<div class="product-body">' +
      '<span class="tag" style="align-self:flex-start">' + escapeHtml(p.tag) + '</span>' +
      '<a class="product-name" href="product.html?id=' + p.id + '">' + escapeHtml(p.name) + '</a>' +
      '<p class="product-price">' + formatRs(p.price) + '</p>' +
      '<div style="flex:1"></div>' +
      '<div class="product-actions">' +
        '<button class="btn btn-secondary" data-quick="' + p.id + '">Quick view</button>' +
        '<button class="btn btn-primary" data-add="' + p.id + '" data-name="' + escapeHtml(p.name) + '">Add to cart</button>' +
      '</div>' +
    '</div></article>';
}

function renderSkeletons() {
  var card = '<div class="product-card skeleton-card" aria-hidden="true">' +
    '<div class="skeleton skeleton-image"></div>' +
    '<div class="product-body"><div class="skeleton skeleton-line" style="width:35%"></div>' +
    '<div class="skeleton skeleton-line" style="width:75%"></div>' +
    '<div class="skeleton skeleton-line" style="width:45%"></div>' +
    '<div class="skeleton skeleton-button"></div></div></div>';
  document.getElementById('grid').innerHTML = new Array(PAGE_SIZE + 1).join(card);
  document.getElementById('result-count').textContent = 'Loading products…';
}

function pageCount() {
  return Math.max(1, Math.ceil(visibleProducts().length / PAGE_SIZE));
}

function render() {
  var grid = document.getElementById('grid');
  var count = document.getElementById('result-count');
  var products = visibleProducts();
  var total = products.length;

  if (!total) {
    var what = '';
    if (VIEW.term) what += ' match &ldquo;' + escapeHtml(VIEW.term) + '&rdquo;';
    if (VIEW.category) what += ' in ' + escapeHtml(VIEW.category);
    if (VIEW.minPrice != null || VIEW.maxPrice != null) what += (what ? ' at that price' : ' in that price range');
    if (!what) what = ' here yet';
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">' +
      '<img src="images/products/jute-tote-bag.svg" alt="">' +
      '<p class="empty-title">No products' + what + '.</p>' +
      '<p class="muted">Try another search, category or price range.</p></div>';
    count.textContent = '';
    renderPager();
    return;
  }

  var first = (VIEW.page - 1) * PAGE_SIZE;
  var shown = products.slice(first, first + PAGE_SIZE - 1);
  grid.innerHTML = shown.map(renderCard).join('');
  count.textContent = 'Showing ' + (first + 1) + '–' + (first + shown.length) + ' of ' + total +
    (total === 1 ? ' product' : ' products');
  renderPager();
}

function renderPager() {
  var pager = document.getElementById('pager');
  var pages = pageCount();
  if (pages < 2) { pager.innerHTML = ''; return; }

  var html = '<button class="btn btn-ghost" data-page="' + (VIEW.page - 1) + '"' +
    (VIEW.page === 1 ? ' disabled' : '') + '>&larr; Prev</button>';
  for (var i = 1; i <= pages; i++) {
    html += '<button class="btn ' + (i === VIEW.page ? 'btn-primary' : 'btn-ghost') + '" data-page="' + i + '"' +
      (i === VIEW.page ? ' aria-current="page"' : '') + ' aria-label="Page ' + i + '">' + i + '</button>';
  }
  html += '<button class="btn btn-ghost" data-page="' + (VIEW.page + 1) + '"' +
    (VIEW.page === pages ? ' disabled' : '') + '>Next &rarr;</button>';
  pager.innerHTML = html;
}

function renderCategories(categories) {
  var chips = document.getElementById('categories');
  chips.innerHTML = [''].concat(categories).map(function (c) {
    var active = c === VIEW.category;
    return '<button type="button" class="chip' + (active ? ' chip-active' : '') + '" data-category="' +
      escapeHtml(c) + '" aria-pressed="' + active + '">' + (c ? escapeHtml(c) : 'All') + '</button>';
  }).join('');
}

async function loadProducts() {
  var seq = ++searchSeq;
  var params = [];
  if (VIEW.category) params.push('category=' + encodeURIComponent(VIEW.category));
  if (VIEW.term) params.push('q=' + encodeURIComponent(VIEW.term));
  var path = '/products' + (params.length ? '?' + params.join('&') : '');

  try {
    var products = await api(path);
    if (seq !== searchSeq) return null;
    products.forEach(function (p) { PRODUCTS_BY_ID[p.id] = p; });
    VIEW.products = products;
    VIEW.page = 1;
    render();
    return products;
  } catch (e) {
    if (seq !== searchSeq) return null;
    document.getElementById('grid').innerHTML =
      '<p class="error" style="grid-column:1/-1">Could not load products: ' + escapeHtml(e.message) + '</p>';
    document.getElementById('result-count').textContent = '';
    document.getElementById('pager').innerHTML = '';
    return null;
  }
}

function openQuickView(id) {
  var p = PRODUCTS_BY_ID[id];
  if (!p) return;
  var dialog = document.getElementById('quick-view');
  dialog.innerHTML =
    '<button type="button" class="quick-view-close" data-close aria-label="Close">&times;</button>' +
    '<div class="quick-view-layout">' +
      productImage(p, 'quick-view-image') +
      '<div class="quick-view-info">' +
        '<span class="tag" style="align-self:flex-start">' + escapeHtml(p.tag) + '</span>' +
        '<h2 id="qv-name" style="margin:0;font-size:28px">' + escapeHtml(p.name) + '</h2>' +
        '<p class="product-price" style="font-size:24px">' + formatRs(p.price) + '</p>' +
        '<p style="margin:0;line-height:1.5">' + escapeHtml(p.description || 'No description yet.') + '</p>' +
        '<div class="qty-row">' + qtyStepper('qv-qty') +
          '<span class="muted" style="font-size:14px">Maximum ' + MAX_PER_PRODUCT + ' per order.</span></div>' +
        '<div style="flex:1"></div>' +
        '<button class="btn btn-primary" data-add="' + p.id + '" data-name="' + escapeHtml(p.name) + '">Add to cart</button>' +
        '<a class="quick-view-more" href="product.html?id=' + p.id + '">View full details &rarr;</a>' +
      '</div>' +
    '</div>';
  wireQtyStepper(dialog, 'qv-qty', MAX_PER_PRODUCT);
  dialog.showModal();
}

document.addEventListener('DOMContentLoaded', async function () {
  if (!(await requireLogin())) return;
  var grid = document.getElementById('grid');
  var search = document.getElementById('search');
  var dialog = document.getElementById('quick-view');
  // Only show loading placeholders if products take a noticeable time;
  // on a fast load they would just flash grey for a moment.
  var skeletonTimer = setTimeout(renderSkeletons, 300);

  // The first, unfiltered load is the full catalogue, so it doubles as the
  // source of the category list.
  var all = await loadProducts();
  clearTimeout(skeletonTimer);
  if (all) {
    var categories = [];
    all.forEach(function (p) { if (categories.indexOf(p.tag) < 0) categories.push(p.tag); });
    renderCategories(categories);
  }

  search.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      VIEW.term = search.value.trim();
      loadProducts();
    }, SEARCH_DELAY);
  });

  document.getElementById('categories').addEventListener('click', function (e) {
    var chip = e.target.closest('[data-category]');
    if (!chip) return;
    VIEW.category = chip.getAttribute('data-category');
    document.querySelectorAll('#categories .chip').forEach(function (c) {
      var active = c === chip;
      c.classList.toggle('chip-active', active);
      c.setAttribute('aria-pressed', active);
    });
    loadProducts();
  });

  document.getElementById('sort').addEventListener('change', function (e) {
    VIEW.sort = e.target.value;
    VIEW.page = 1;
    render();
  });

  // Blank means "no limit" on that side of the range. These are text boxes,
  // not type="number", because a number box changes its value when the page
  // is scrolled over it, which re-filtered the grid mid-scroll.
  function readPrice(id) {
    var v = document.getElementById(id).value;
    return v === '' ? null : Number(v);
  }
  ['price-min', 'price-max'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', function (e) {
      var digits = e.target.value.replace(/\D/g, '');
      if (digits !== e.target.value) e.target.value = digits;
      VIEW.minPrice = readPrice('price-min');
      VIEW.maxPrice = readPrice('price-max');
      VIEW.page = 1;
      render();
    });
  });

  document.getElementById('pager').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    VIEW.page = Math.min(Math.max(1, parseInt(btn.getAttribute('data-page'), 10)), pageCount());
    render();
    document.getElementById('result-count').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  grid.addEventListener('click', function (e) {
    var quick = e.target.closest('[data-quick]');
    if (quick) { openQuickView(parseInt(quick.getAttribute('data-quick'), 10)); return; }
    var add = e.target.closest('[data-add]');
    if (add) stageAdd(parseInt(add.getAttribute('data-add'), 10), add.getAttribute('data-name'));
  });

  dialog.addEventListener('click', function (e) {
    // A click on the backdrop lands on the <dialog> element itself.
    if (e.target === dialog || e.target.closest('[data-close]')) { dialog.close(); return; }
    var add = e.target.closest('[data-add]');
    if (!add) return;
    var qty = parseInt(document.getElementById('qv-qty').value, 10) || 1;
    if (stageAdd(parseInt(add.getAttribute('data-add'), 10), add.getAttribute('data-name'), qty)) dialog.close();
  });

  // A staged batch is not sent yet, so following a link would drop it. Hold an
  // in-page link click just long enough to flush.
  document.addEventListener('click', function (e) {
    if (!flushTimer && !flushing) return;
    var link = e.target.closest ? e.target.closest('a[href]') : null;
    if (!link || link.target === '_blank') return;
    e.preventDefault();
    var href = link.href;
    settlePending().then(function () { location.href = href; });
  }, true);
});
