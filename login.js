document.addEventListener('DOMContentLoaded', function () {
  redirectIfLoggedIn();
  var err = document.getElementById('li-error');
  document.getElementById('li-submit').addEventListener('click', function () {
    var email = document.getElementById('li-email').value.trim().toLowerCase();
    var pass = document.getElementById('li-pass').value;
    if (!email || !pass) { err.textContent = 'Please enter your email and password.'; err.hidden = false; return; }
    var u = DB.users.find(function (x) { return x.email.toLowerCase() === email; });
    if (!u || u.password !== pass) { err.textContent = 'Incorrect Password.'; err.hidden = false; return; }
    DB.user = u;
    saveDB(DB);
    location.href = 'shop.html';
  });
});
