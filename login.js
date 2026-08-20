document.addEventListener('DOMContentLoaded', function () {
  redirectIfLoggedIn();
  if (new URLSearchParams(location.search).get('registered') === '1') {
    document.getElementById('li-notice').hidden = false;
  }
  var err = document.getElementById('li-error');

  var passInput = document.getElementById('li-pass');
  var passToggle = document.getElementById('li-pass-toggle');
  if (passInput && passToggle) {
    passToggle.addEventListener('click', function () {
      var showing = passInput.type === 'text';
      passInput.type = showing ? 'password' : 'text';
      passToggle.setAttribute('aria-pressed', showing ? 'false' : 'true');
      passToggle.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    });
  }

  document.getElementById('li-submit').addEventListener('click', async function () {
    err.hidden = true;
    var email = document.getElementById('li-email').value.trim().toLowerCase();
    var pass = document.getElementById('li-pass').value;
    if (!email || !pass) { err.textContent = 'Please enter your email and password.'; err.hidden = false; return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'Enter a valid email address.'; err.hidden = false; return; }
    try {
      await api('/login', { method: 'POST', body: { email: email, password: pass } });
      location.href = 'shop.html';
    } catch (e) {
      err.textContent = e.message;
      err.hidden = false;
    }
  });
});
