document.addEventListener('DOMContentLoaded', function () {
  redirectIfLoggedIn();
  if (new URLSearchParams(location.search).get('registered') === '1') {
    document.getElementById('li-notice').hidden = false;
  }
  var err = document.getElementById('li-error');
  document.getElementById('li-submit').addEventListener('click', async function () {
    err.hidden = true;
    var email = document.getElementById('li-email').value.trim().toLowerCase();
    var pass = document.getElementById('li-pass').value;
    if (!email || !pass) { err.textContent = 'Please enter your email and password.'; err.hidden = false; return; }
    try {
      await api('/login', { method: 'POST', body: { email: email, password: pass } });
      location.href = 'shop.html';
    } catch (e) {
      err.textContent = e.message;
      err.hidden = false;
    }
  });
});
