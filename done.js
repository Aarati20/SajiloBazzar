document.addEventListener('DOMContentLoaded', function () {
  if (!requireLogin()) return;
  document.getElementById('done-id').textContent = DB.orderId || 'ORD-1001';
});
