// Custom Playwright fixtures. Import `test` and `expect` from this file instead
// of '@playwright/test', then ask for a fixture by name in a test or hook:
//
//   test('my test', async ({ page, user, addToCart }) => { ... });
//
// Playwright runs the fixture's setup before the test, and anything after
// `await use(...)` runs as cleanup once the test is done.
import { test as base, expect } from '@playwright/test';

// The live API lives under /api on the same site.
export const API = 'https://sajilo-bazzar.vercel.app/api';

export const test = base.extend({
  // A brand-new user who is already logged in, so every test starts with an
  // empty cart. The browser gets the login cookie because page.request shares
  // cookies with the page.
  user: async ({ page }, use) => {
    const user = {
      email: 'user' + Date.now() + Math.floor(Math.random() * 1000) + '@test.com',
      password: 'password123',
    };

    await page.request.post(API + '/register', {
      data: { name: 'Test User', phone: '9800000000', ...user },
    });
    await page.request.post(API + '/login', { data: user });

    await use(user);
  },

  // A function that puts a product straight into the cart:
  //   await addToCart('Ilam green tea', 2);
  // It depends on `user`, so asking for addToCart also logs you in.
  addToCart: async ({ page, user }, use) => {
    const products = await (await page.request.get(API + '/products')).json();

    await use(async (productName, quantity) => {
      const product = products.find((p) => p.name === productName);
      await page.request.post(API + '/cart', {
        data: { product_id: product.id, quantity: quantity },
      });
    });
  },
});

export { expect };
