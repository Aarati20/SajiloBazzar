// SajiloBazar shared UI: header, toast, requirements drawer, login guards.
// All data now comes from the backend API (see api.js). No more localStorage DB.

var REQS = [
  ['FR-1', 'A visitor can register with full name, email, mobile number and password.'],
  ['FR-2', 'The mobile number must be exactly 10 digits.'],
  ['FR-3', 'The password must be at least 8 characters long.'],
  ['FR-4', 'Both password fields must match before the account is created.'],
  ['FR-5', 'The same email cannot be registered twice.'],
  ['FR-6', 'A registered user can log in with the correct email and password.'],
  ['FR-7', 'A wrong password shows the message "Incorrect password".'],
  ['FR-8', 'An email that is not registered shows the message "Email not found".'],
  ['FR-9', 'A logged-in user can add any product to the cart.'],
  ['FR-10', 'A maximum of 10 units of a single product is allowed per order.'],
  ['FR-11', 'The cart shows the correct line total (price x quantity) and order total.'],
  ['FR-12', 'A user can increase, decrease or remove an item in the cart.'],
  ['FR-13', 'The minimum order value is Rs 100. A smaller order cannot be placed.'],
  ['FR-14', 'A delivery address is required before an order can be placed.'],
  ['FR-15', 'Payment method can be eSewa, Khalti or Cash on delivery.'],
  ['FR-16', 'After a successful order, an order number is shown.'],
  ['FR-17', 'A placed order appears in My orders.'],
  ['FR-18', 'Logging out clears the cart and returns the user to the login page.'],
  ['FR-19', 'A logged-out user cannot reach the shop, cart or checkout.'],
  ['FR-20', 'Choosing eSewa or Khalti opens a payment screen. Cash on delivery does not.'],
  ['FR-21', 'The payment screen needs a registered wallet number and the correct 4-digit MPIN.'],
  ['FR-22', 'Cancelling on the payment screen returns the user to checkout with the cart untouched.'],
  ['FR-23', 'The shop search box filters products by name or category, ignoring upper/lower case.'],
  ['FR-24', 'The shop shows 8 products per page, can be filtered by category, and each product has an image and a quick view with its description.'],
  ['NFR-1', 'Every error message tells the user exactly what to fix.']
];

// Cache the current user + cart count so the header can render synchronously.
var CURRENT_USER = null;
var CART_COUNT = 0;

// Fetch /me + /cart to warm the cache. Returns false if not logged in.
// The auth cookie is HttpOnly so we can't check it from JS — /me itself is
// the "am I logged in?" probe (401 → not logged in). The result is shared,
// so the header and requireLogin() don't each make their own requests.
var sessionPromise = null;
function loadSession() {
  if (!sessionPromise) sessionPromise = fetchSession();
  return sessionPromise;
}

async function fetchSession() {
  try {
    CURRENT_USER = await api('/me');
    var cart = await api('/cart');
    CART_COUNT = (cart.items || []).reduce(function (n, i) { return n + i.quantity; }, 0);
    return true;
  } catch (e) {
    CURRENT_USER = null;
    CART_COUNT = 0;
    return false;
  }
}

async function requireLogin() {
  var ok = await loadSession();
  if (!ok) { location.href = 'login.html'; return false; }
  renderHeader();
  return true;
}

async function redirectIfLoggedIn() {
  if (await loadSession()) location.href = 'shop.html';
}

// The header is drawn straight away from the last page's copy (name + cart
// count, kept for this browser tab only) so it doesn't flash empty while /me
// loads, then redrawn with fresh data. Nothing here is trusted: pages still
// call requireLogin(), and the server decides who is logged in.
var HEADER_CACHE_KEY = 'sajilo-header';

function saveHeaderCache() {
  try {
    if (CURRENT_USER) {
      sessionStorage.setItem(HEADER_CACHE_KEY, JSON.stringify({ name: CURRENT_USER.name, cart: CART_COUNT }));
    } else {
      sessionStorage.removeItem(HEADER_CACHE_KEY);
    }
  } catch (e) { /* storage blocked: the header just renders after /me */ }
}

function restoreHeaderCache() {
  try {
    var cached = JSON.parse(sessionStorage.getItem(HEADER_CACHE_KEY) || 'null');
    if (cached && cached.name) {
      CURRENT_USER = { name: cached.name };
      CART_COUNT = cached.cart || 0;
    }
  } catch (e) { /* ignore a missing or unreadable cache */ }
}

function renderHeader() {
  var el = document.getElementById('site-header');
  if (!el) return;
  var page = location.pathname.split('/').pop() || 'index.html';
  function link(href, label, extra) {
    return '<a href="' + href + '"' + (page === href ? ' aria-current="page"' : '') + (extra || '') + '>' + label + '</a>';
  }

  var nav = '', right = '';
  if (CURRENT_USER) {
    nav = '<nav>' + link('shop.html', 'Shop') +
          link('cart.html', 'Cart <span class="cart-count" id="cart-count">' + CART_COUNT + '</span>', ' aria-label="Cart, ' + CART_COUNT + ' items"') +
          link('orders.html', 'My orders') + '</nav>';
    right = '<span class="header-user muted">' + escapeHtml(CURRENT_USER.name) + '</span> ' +
            '<button class="btn btn-secondary" style="font-size:14px;padding:8px 20px" onclick="logout()">Log out</button>';
  }
  // On narrow screens the nav and account controls fold into a menu that the
  // toggle button opens (see .menu-toggle in styles.css).
  el.innerHTML = '<a class="brand" href="' + (CURRENT_USER ? 'shop.html' : 'login.html') + '">SajiloBazar</a>' +
    '<button type="button" class="menu-toggle" aria-expanded="false" aria-controls="header-menu" aria-label="Menu">' +
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>' +
    '<div class="header-menu" id="header-menu">' + nav +
    '<div class="header-spacer"></div>' +
    '<button class="btn btn-ghost" style="font-size:14px;padding:8px 18px" onclick="openReqs()">Requirements</button>' +
    right + '</div>';

  var toggle = el.querySelector('.menu-toggle');
  toggle.addEventListener('click', function () {
    var open = el.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', open);
  });
  saveHeaderCache();
}

// Little bounce on the header cart count after something is added.
function bumpCart() {
  var badge = document.getElementById('cart-count');
  if (!badge) return;
  badge.classList.remove('bump');
  void badge.offsetWidth;   // restart the animation if it is already running
  badge.classList.add('bump');
}

// Cart → Checkout → Pay → Done progress bar. `current` is the step's index;
// steps before it are shown as done.
var CHECKOUT_STEPS = ['Cart', 'Checkout', 'Payment', 'Done'];
function renderSteps(containerId, current) {
  var el = document.getElementById(containerId);
  if (!el) return;
  el.className = 'steps';
  el.setAttribute('aria-label', 'Checkout progress');
  el.innerHTML = '<ol>' + CHECKOUT_STEPS.map(function (label, i) {
    var state = i < current ? 'done' : (i === current ? 'current' : 'todo');
    return '<li class="step step-' + state + '"' + (i === current ? ' aria-current="step"' : '') + '>' +
      '<span class="step-dot">' + (i < current ? '&#10003;' : (i + 1)) + '</span>' +
      '<span class="step-label">' + label + '</span></li>';
  }).join('') + '</ol>';
}

// Text from the database or the URL is escaped before it goes into innerHTML.
function escapeHtml(text) {
  return String(text == null ? '' : text).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// Rs 1450 → "Rs 1,450"; Rs 125000 → "Rs 1,25,000" (Nepali/Indian grouping).
function formatRs(amount) {
  return 'Rs ' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

var PAYMENT_LABELS = { esewa: 'eSewa', khalti: 'Khalti', cod: 'Cash on delivery' };
function paymentLabel(value) {
  return PAYMENT_LABELS[String(value).toLowerCase()] || value;
}

// A − [n] + quantity picker. Render with qtyStepper(id), then wire it once it
// is in the page with wireQtyStepper(container, id, max).
function qtyStepper(id) {
  return '<div class="qty-stepper">' +
    '<button type="button" data-step="-1" aria-label="Decrease quantity">&minus;</button>' +
    '<input id="' + id + '" type="number" min="1" value="1" inputmode="numeric" aria-label="Quantity">' +
    '<button type="button" data-step="1" aria-label="Increase quantity">+</button></div>';
}

function wireQtyStepper(container, id, max) {
  var input = container.querySelector('#' + id);
  input.max = max;
  function clamp(n) { return Math.min(max, Math.max(1, n || 1)); }
  input.closest('.qty-stepper').addEventListener('click', function (e) {
    var step = e.target.closest('[data-step]');
    if (step) input.value = clamp(parseInt(input.value, 10) + parseInt(step.getAttribute('data-step'), 10));
  });
  input.addEventListener('change', function () { input.value = clamp(parseInt(input.value, 10)); });
}

// Pressing Enter in any of `inputIds` clicks the page's submit button, so
// forms work from the keyboard without being real <form> elements.
function submitOnEnter(buttonId, inputIds) {
  var button = document.getElementById(buttonId);
  inputIds.forEach(function (id) {
    var input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        button.click();
      }
    });
  });
}

// Turn a field red while what the user has typed is invalid. Checking starts
// on the first keystroke, so fields the user hasn't touched stay neutral.
// Returns the check so another field can re-run it (e.g. confirm password).
function liveValidate(id, isValid) {
  var el = document.getElementById(id);
  var touched = false;
  function check() {
    if (!touched) return;
    var bad = !isValid(el.value);
    el.classList.toggle('input-invalid', bad);
    if (bad) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
  }
  el.addEventListener('input', function () { touched = true; check(); });
  return check;
}

async function logout() {
  try { await api('/logout', { method: 'POST' }); } catch (e) {}
  CURRENT_USER = null;
  CART_COUNT = 0;
  saveHeaderCache();
  location.href = 'login.html';
}

function toast(msg) {
  var t = document.querySelector('.toast');
  if (t) t.remove();
  t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 1800);
}

function openReqs() {
  var back = document.createElement('div');
  back.className = 'drawer-backdrop';
  var rows = REQS.map(function (r) {
    return '<div class="req"><b>' + r[0] + '</b><span>' + r[1] + '</span></div>';
  }).join('');
  back.innerHTML = '<div class="drawer">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px">' +
    '<h2 style="font-size:26px;margin:0">Requirements (your SRS)</h2>' +
    '<button class="btn btn-ghost drawer-close" style="font-size:14px">Close</button></div>' +
    '<p style="font-size:15px;line-height:1.6;margin:0 0 24px" class="muted">Test the app against these rules. Anything that behaves differently is a bug: write it up with steps, expected and actual.</p>' +
    rows + '</div>';
  back.addEventListener('click', function (e) {
    if (e.target === back || e.target.classList.contains('drawer-close')) back.remove();
  });
  document.body.appendChild(back);
}

// Draw the header immediately from the cached copy (scripts are deferred, so
// the page's HTML is already parsed), then again once the session is fresh.
// Pages that need login also call requireLogin() themselves.
restoreHeaderCache();
renderHeader();
loadSession().then(renderHeader);
