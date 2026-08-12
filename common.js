// SajiloBazar: shared data store, header, toast, requirements drawer
var KEY = 'sajilobazar-multi-v1';
var PRODUCTS = [
  { id: 'P1', name: 'Cotton kurta', price: 1450, tag: 'Clothing' },
  { id: 'P2', name: 'Bluetooth earbuds', price: 2299, tag: 'Electronics' },
  { id: 'P3', name: 'Steel water bottle', price: 650, tag: 'Home' },
  { id: 'P4', name: 'Ilam green tea', price: 340, tag: 'Grocery' },
  { id: 'P5', name: 'Canvas backpack', price: 1899, tag: 'Bags' },
  { id: 'P6', name: 'Notebook set', price: 95, tag: 'Stationery' }
];
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
  ['FR-21', 'The payment screen needs a registered wallet number and the correct 4-digit MPIN. A wrong MPIN must be rejected.'],
  ['FR-22', 'Cancelling on the payment screen returns the user to checkout with the cart untouched.'],
  ['NFR-1', 'Every error message tells the user exactly what to fix.']
];

function loadDB() {
  try {
    var d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.users) return d;
  } catch (e) {}
  return {
    users: [{ name: 'Aarati Adhikari', email: 'aarati@test.com', phone: '9812345678', password: 'test1234' }],
    user: null, cart: [], orders: [], addr: '', payMethod: 'eSewa', orderId: ''
  };
}
function saveDB(db) { localStorage.setItem(KEY, JSON.stringify(db)); }
var DB = loadDB();

function requireLogin() { if (!DB.user) { location.href = 'login.html'; return false; } return true; }
function redirectIfLoggedIn() { if (DB.user) location.href = 'shop.html'; }
function cartCount() { return DB.cart.reduce(function (n, c) { return n + c.qty; }, 0); }
function cartTotal() { return DB.cart.reduce(function (n, c) { return n + c.price * c.qty; }, 0); }

function renderHeader() {
  var el = document.getElementById('site-header');
  if (!el) return;
  var nav = '', right = '';
  if (DB.user) {
    nav = '<nav><a href="shop.html">Shop</a><a href="cart.html">Cart (' + cartCount() + ')</a><a href="orders.html">My orders</a></nav>';
    right = '<span style="font-size:14px" class="muted">' + DB.user.name + '</span> <button class="btn btn-secondary" style="font-size:14px;padding:8px 20px" onclick="logout()">Log out</button>';
  }
  el.innerHTML = '<span class="brand">SajiloBazar</span>' + nav +
    '<div style="flex:1"></div><button class="btn btn-ghost" style="font-size:14px;padding:8px 18px" onclick="openReqs()">Requirements</button>' + right;
}

function logout() {
  DB.user = null;
  saveDB(DB);
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

document.addEventListener('DOMContentLoaded', renderHeader);
