// Small HTTP helper used by every page.
// Auto-picks the API URL:
//   - localhost / 127.0.0.1  → local Flask on port 5000
//   - anything else (Vercel) → same origin + /api  (Flask runs as a
//                              serverless function at /api/*, see vercel.json)
// You can override at any time in the browser console:
//   localStorage.setItem('sajilo-api-base', 'https://your-api.example.com')
(function () {
  var override = localStorage.getItem('sajilo-api-base');
  if (override) {
    window.API_BASE = override;
  } else if (['localhost', '127.0.0.1'].indexOf(location.hostname) >= 0) {
    window.API_BASE = 'http://127.0.0.1:5000';
  } else {
    window.API_BASE = location.origin + '/api';
  }
})();

// Auth lives in an HttpOnly cookie set by the backend on /login and /register,
// so nothing is stored client-side. `credentials: 'include'` tells the browser
// to send the cookie on every request (including cross-origin during local dev).

// Call the API. Returns parsed JSON on success, throws Error(message) on failure.
async function api(path, opts) {
  opts = opts || {};
  var headers = { 'Content-Type': 'application/json' };

  var res = await fetch(window.API_BASE + path, {
    method: opts.method || 'GET',
    headers: headers,
    credentials: 'include',
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 204) return null;              // No Content
  var text = await res.text();
  var data = null;
  if (text) {
    try { data = JSON.parse(text); }
    catch (_) {
      // Non-JSON body (e.g. Vercel's "A server error has occurred" 500 page).
      var snippet = text.replace(/\s+/g, ' ').trim().slice(0, 160);
      throw new Error('Server error (HTTP ' + res.status + '): ' + snippet);
    }
  }
  if (!res.ok) {
    var msg = (data && data.error) ? data.error : ('HTTP ' + res.status);
    throw new Error(msg);
  }
  return data;
}
