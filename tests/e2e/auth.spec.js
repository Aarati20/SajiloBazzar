import { test, expect } from './helpers';

test('FR-6: demo user can log in', async ({ page }) => {
  await page.goto('/login.html');
  await page.fill('#li-email', 'aarati@test.com');
  await page.fill('#li-pass', 'test1234');
  await page.click('#li-submit');

  await expect(page).toHaveURL(/shop.html/);
});

test('FR-7: wrong password shows "Incorrect password"', async ({ page }) => {
  await page.goto('/login.html');
  await page.fill('#li-email', 'aarati@test.com');
  await page.fill('#li-pass', 'wrongpass');
  await page.click('#li-submit');

  await expect(page.locator('#li-error')).toHaveText('Incorrect password');
});

test('FR-8: unknown email shows "Email not found"', async ({ page }) => {
  await page.goto('/login.html');
  await page.fill('#li-email', 'nobody@test.com');
  await page.fill('#li-pass', 'password123');
  await page.click('#li-submit');

  await expect(page.locator('#li-error')).toHaveText('Email not found');
});

test('FR-1: new user can register', async ({ page }) => {
  await page.goto('/register.html');
  await page.fill('#rg-name', 'Test User');
  await page.fill('#rg-email', 'new' + Date.now() + '@test.com');
  await page.fill('#rg-phone', '9812345678');
  await page.fill('#rg-pass', 'password123');
  await page.fill('#rg-conf', 'password123');
  await page.click('#rg-submit');

  await expect(page).toHaveURL(/login.html\?registered=1/);
  await expect(page.locator('#li-notice')).toBeVisible();
});

test('FR-2: mobile number must be 10 digits', async ({ page }) => {
  await page.goto('/register.html');
  await page.fill('#rg-name', 'Test User');
  await page.fill('#rg-email', 'new' + Date.now() + '@test.com');
  await page.fill('#rg-phone', '98123');
  await page.fill('#rg-pass', 'password123');
  await page.fill('#rg-conf', 'password123');
  await page.click('#rg-submit');

  await expect(page.locator('#rg-error')).toHaveText('Mobile number must be 10 digits.');
});

test('FR-3: password must be at least 8 characters', async ({ page }) => {
  await page.goto('/register.html');
  await page.fill('#rg-name', 'Test User');
  await page.fill('#rg-email', 'new' + Date.now() + '@test.com');
  await page.fill('#rg-phone', '9812345678');
  await page.fill('#rg-pass', 'short');
  await page.fill('#rg-conf', 'short');
  await page.click('#rg-submit');

  await expect(page.locator('#rg-error')).toHaveText('Password must be at least 8 characters.');
});

test('FR-4: passwords must match', async ({ page }) => {
  await page.goto('/register.html');
  await page.fill('#rg-name', 'Test User');
  await page.fill('#rg-email', 'new' + Date.now() + '@test.com');
  await page.fill('#rg-phone', '9812345678');
  await page.fill('#rg-pass', 'password123');
  await page.fill('#rg-conf', 'different123');
  await page.click('#rg-submit');

  await expect(page.locator('#rg-error')).toHaveText('The two passwords do not match.');
});

test('FR-5: same email cannot be registered twice', async ({ page }) => {
  await page.goto('/register.html');
  await page.fill('#rg-name', 'Test User');
  await page.fill('#rg-email', 'aarati@test.com');
  await page.fill('#rg-phone', '9812345678');
  await page.fill('#rg-pass', 'password123');
  await page.fill('#rg-conf', 'password123');
  await page.click('#rg-submit');

  await expect(page.locator('#rg-error')).toHaveText('Email already registered');
});

test('FR-19: logged-out user cannot open the shop', async ({ page }) => {
  await page.goto('/shop.html');
  await expect(page).toHaveURL(/login.html/);
});

test('FR-18: log out returns to the login page', async ({ page, user }) => {
  await page.goto('/shop.html');
  await page.click('text=Log out');

  await expect(page).toHaveURL(/login.html/);
});
