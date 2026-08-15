SAJILOBAZAR: QA PRACTICE SHOP (multi-page version)

Live site: https://sajilo-bazzar.vercel.app/login.html

How to run: unzip the folder and open index.html (or login.html) in any browser.
No server needed. Data is saved in the browser's localStorage.

Deployment: the site is hosted on Vercel and deployed automatically by the
GitHub Actions workflow in .github/workflows/deploy.yml on every push to main.

Demo account: aarati@test.com / test1234
Test wallet: 9812345678, MPIN 1234

Files:
  index.html      redirects to the login page
  login.html      + login.js
  register.html   + register.js
  shop.html       + shop.js
  cart.html       + cart.js
  checkout.html   + checkout.js
  pay.html        + pay.js
  done.html       + done.js
  orders.html     + orders.js
  common.js       shared data store, header, toast, requirements drawer
  styles.css      the only stylesheet

Click the Requirements button in the header to see the 23 rules (FR-1 to FR-22, NFR-1).
Test the app against them. The app contains planted bugs: find them, reproduce them,
and report them with steps, expected result and actual result.

To reset all data: open the browser console and run localStorage.clear(), then reload.
