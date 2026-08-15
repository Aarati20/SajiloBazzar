document.addEventListener('DOMContentLoaded', async function () {
  if (!(await requireLogin())) return;
  var last = null;
  try { last = JSON.parse(localStorage.getItem('sajilo-last-order') || 'null'); } catch (e) {}
  document.getElementById('done-id').textContent = last ? ('ORD-' + last.id) : '(unknown)';
});
