document.addEventListener('DOMContentLoaded', function () {
  redirectIfLoggedIn();
  var err = document.getElementById('rg-error');
  function fail(m) { err.textContent = m; err.hidden = false; }

  document.getElementById('rg-submit').addEventListener('click', async function () {
    err.hidden = true;
    var name = document.getElementById('rg-name').value.trim();
    var email = document.getElementById('rg-email').value.trim();
    var phone = document.getElementById('rg-phone').value.trim();
    var pass  = document.getElementById('rg-pass').value;
    var conf  = document.getElementById('rg-conf').value;

    // Client-side sanity checks — the server enforces these too.
    if (!name) return fail('Full name is required.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('Enter a valid email address.');
    if (!/^\d{10}$/.test(phone)) return fail('Mobile number must be 10 digits.');
    if (pass.length < 8) return fail('Password must be at least 8 characters.');
    if (pass !== conf) return fail('The two passwords do not match.');

    try {
      await api('/register', {
        method: 'POST',
        body: { name: name, email: email, phone: phone, password: pass },
      });
      location.href = 'login.html?registered=1';
    } catch (e) {
      fail(e.message);
    }
  });
});
