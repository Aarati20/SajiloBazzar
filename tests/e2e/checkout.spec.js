import { test, expect } from './helpers';

test.describe('checkout with Rs 340 in the cart', () => {
  // Runs before every test in this block: fill the cart and open checkout.
  test.beforeEach(async ({ page, addToCart }) => {
    await addToCart('Ilam green tea', 1);
    await page.goto('/checkout.html');
    await expect(page.locator('#co-total')).toHaveText('Rs 340'); // wait for the page to finish loading
  });

  test('FR-14: delivery address is required', async ({ page }) => {
    await page.selectOption('#co-pay', 'Cash on delivery');
    await page.click('#co-submit');

    await expect(page.locator('#co-error')).toHaveText('Delivery address is required.');
  });

  test('FR-16, FR-17: cash on delivery order shows up in My orders', async ({ page }) => {
    await page.fill('#co-addr', 'Baneshwor, Kathmandu');
    await page.selectOption('#co-pay', 'Cash on delivery');
    await page.click('#co-submit');

    await expect(page).toHaveURL(/done.html/);
    await expect(page.locator('#done-id')).toContainText('ORD-');
    const orderNumber = await page.locator('#done-id').textContent();

    await page.click('text=My orders');
    await expect(page.locator('#orders-area')).toContainText(orderNumber);
  });

  test('FR-20, FR-21: eSewa payment with the correct MPIN', async ({ page }) => {
    await page.fill('#co-addr', 'Baneshwor, Kathmandu');
    await page.selectOption('#co-pay', 'eSewa');
    await page.click('#co-submit');

    await expect(page).toHaveURL(/pay.html/);
    await expect(page.locator('#pay-total')).toContainText('Rs'); // wait for the page to finish loading
    await page.fill('#pay-id', '9812345678');
    await page.fill('#pay-pin', '1234');
    await page.click('#pay-submit');

    await expect(page).toHaveURL(/done.html/);
  });

  test('FR-21: wrong MPIN is rejected', async ({ page }) => {
    await page.fill('#co-addr', 'Baneshwor, Kathmandu');
    await page.selectOption('#co-pay', 'Khalti');
    await page.click('#co-submit');

    await expect(page.locator('#pay-total')).toContainText('Rs'); // wait for the page to finish loading
    await page.fill('#pay-id', '9812345678');
    await page.fill('#pay-pin', '9999');
    await page.click('#pay-submit');

    await expect(page.locator('#pay-error')).toHaveText('Incorrect MPIN.');
  });

  test('FR-22: cancel on the payment screen keeps the cart', async ({ page }) => {
    await page.fill('#co-addr', 'Baneshwor, Kathmandu');
    await page.selectOption('#co-pay', 'eSewa');
    await page.click('#co-submit');

    await page.click('text=Cancel and go back');

    await expect(page).toHaveURL(/checkout.html/);
    await expect(page.locator('#co-total')).toHaveText('Rs 340');
  });
});

test('FR-13: order under Rs 100 cannot be placed', async ({ page, addToCart }) => {
  await addToCart('Notebook set', 1); // Rs 95
  await page.goto('/checkout.html');
  await expect(page.locator('#co-total')).toHaveText('Rs 95'); // wait for the page to finish loading

  await page.fill('#co-addr', 'Baneshwor, Kathmandu');
  await page.selectOption('#co-pay', 'Cash on delivery');
  await page.click('#co-submit');

  await expect(page.locator('#co-error')).toBeVisible();
  await expect(page).toHaveURL(/checkout.html/);
});
