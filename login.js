document.addEventListener('DOMContentLoaded', function () {
  redirectIfLoggedIn();
  if (new URLSearchParams(location.search).get('registered') === '1') {
    document.getElementById('li-notice').hidden = false;
  }
  var err = document.getElementById('li-error');

  var passInput = document.getElementById('li-pass');
  var passToggle = document.getElementById('li-pass-toggle');
  if (passInput && passToggle) {
    var eyeOpen = passToggle.querySelector('.eye-open');
    var eyeClosed = passToggle.querySelector('.eye-closed');
    var showPass = function () {
      passInput.type = 'text';
      passToggle.setAttribute('aria-pressed', 'true');
      passToggle.setAttribute('aria-label', 'Hide password');
      if (eyeOpen) eyeOpen.hidden = true;
      if (eyeClosed) eyeClosed.hidden = false;
    };
    var hidePass = function () {
      passInput.type = 'password';
      passToggle.setAttribute('aria-pressed', 'false');
      passToggle.setAttribute('aria-label', 'Show password (hold)');
      if (eyeOpen) eyeOpen.hidden = false;
      if (eyeClosed) eyeClosed.hidden = true;
    };
    passToggle.addEventListener('mousedown', function (e) {
      e.preventDefault();
      showPass();
    });
    passToggle.addEventListener('mouseup', hidePass);
    passToggle.addEventListener('mouseleave', hidePass);
    passToggle.addEventListener('touchstart', function (e) {
      e.preventDefault();
      showPass();
    }, { passive: false });
    passToggle.addEventListener('touchend', hidePass);
    passToggle.addEventListener('touchcancel', hidePass);
    passToggle.addEventListener('blur', hidePass);
  }

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
