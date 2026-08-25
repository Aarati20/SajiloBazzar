// Add-to-cart clicks are staged for a moment and sent as one POST /cart batch:
// clicking three products in a row is a single request, not three, and repeat
// clicks on the same product collapse into one line.
var FLUSH_DELAY = 600;      // ms of quiet before the staged batch is sent
var MAX_PER_PRODUCT = 10;   // mirrors the API's per-product cap
var PENDING = {};           // product_id -> { quantity, name }
var flushTimer = null;
var flushing = null;        // the in-flight flush, so navigation can wait on it

function stageAdd(productId, name) {
  var line = PENDING[productId];
  if (line && line.quantity >= MAX_PER_PRODUCT) {
    // One over-limit line makes the API reject the whole batch, so stop
    // counting here instead of taking the other products down with it. The
    // cart may already hold units of this product, so the server still has
    // the final say.
    toast('Maximum ' + MAX_PER_PRODUCT + ' units of a single product');
    return;
  }

  if (line) line.quantity += 1;
  else PENDING[productId] = { quantity: 1, name: name };

  // Move the header count now so a click still feels instant. POST /cart is
  // all-or-nothing, so a failed flush can take back exactly what it staged.
  CART_COUNT += 1;
  renderHeader();

  clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, FLUSH_DELAY);
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

  grid.addEventListener('click', function (e) {
    var id = e.target.getAttribute('data-add');
    if (!id) return;
    stageAdd(parseInt(id, 10), e.target.getAttribute('data-name'));
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
