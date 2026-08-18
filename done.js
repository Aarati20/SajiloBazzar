document.addEventListener('DOMContentLoaded', async function () {
  if (!(await requireLogin())) return;
  var el = document.getElementById('done-id');
  var id = new URLSearchParams(location.search).get('id');
  if (!id) { el.textContent = '(unknown)'; return; }
  try {
    var order = await api('/orders/' + id);
    el.textContent = 'ORD-' + order.id;
  } catch (e) {
    el.textContent = '(unknown)';
  }
});
