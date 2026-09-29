import { test, expect } from './helpers';

test('FR-9: add a product from the shop', async ({ page, user }) => {
  await page.goto('/shop.html');
  await page.click('[data-name="Ilam green tea"]');

  await expect(page.locator('.toast')).toHaveText('Ilam green tea added to cart');
  await expect(page.locator('text=Cart (1)')).toBeVisible();
});

test('FR-11: cart shows line total and order total', async ({ page, addToCart }) => {
  await addToCart('Ilam green tea', 2); // 2 x 340 = 680
  await addToCart('Steel water bottle', 1); // 1 x 650 = 650
  await page.goto('/cart.html');

  await expect(page.locator('#cart-area')).toContainText('Rs 680');
  await expect(page.locator('#cart-area')).toContainText('Rs 1330');
});

test('FR-12: increase, decrease and remove an item', async ({ page, addToCart }) => {
  await addToCart('Ilam green tea', 2);
  await page.goto('/cart.html');

  await page.click('[data-inc]');
  await expect(page.locator('text=Cart (3)')).toBeVisible();

  await page.click('[data-dec]');
  await expect(page.locator('text=Cart (2)')).toBeVisible();

  await page.click('[data-rm]');
  await expect(page.locator('text=Your cart is empty.')).toBeVisible();
});

test('FR-10: cannot add more than 10 of one product', async ({ page, addToCart }) => {
  await addToCart('Ilam green tea', 10);
  await page.goto('/cart.html');

  await page.click('[data-inc]');

  await expect(page.locator('.toast')).toBeVisible();
  await expect(page.locator('text=Cart (10)')).toBeVisible();
});
