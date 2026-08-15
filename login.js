document.addEventListener('DOMContentLoaded', function () {
  redirectIfLoggedIn();
  var err = document.getElementById('li-error');
  document.getElementById('li-submit').addEventListener('click', async function () {
    err.hidden = true;
    var email = document.getElementById('li-email').value.trim().toLowerCase();
    var pass = document.getElementById('li-pass').value;
    if (!email || !pass) { err.textContent = 'Please enter your email and password.'; err.hidden = false; return; }
    try {
      var res = await api('/login', { method: 'POST', body: { email: email, password: pass } });
      setToken(res.token);
      location.href = 'shop.html';
    } catch (e) {
      err.textContent = e.message;
      err.hidden = false;
    }
  });
});
