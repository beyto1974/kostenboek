import { expect, test } from '@playwright/test';

test('opens on the example, books an hour, and still has it after a reload', async ({ page }) => {
  await page.goto('/');

  // The example is there from the first paint, so the app never opens empty.
  await expect(page.getByLabel('Example data')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kostenboek' })).toBeVisible();

  const owed = page.locator('.tile.lead .big');
  await expect(owed).not.toHaveText('€ 0');

  // Book an hour in the day view and watch the month total move.
  await page.getByRole('tab', { name: 'Day' }).click();
  const hoursBefore = await page.locator('.rail .tile').nth(1).locator('.big').innerText();
  await page.locator('.band').first().click();
  await expect(page.locator('.rail .tile').nth(1).locator('.big')).not.toHaveText(hoursBefore);

  const after = await page.locator('.rail .tile').nth(1).locator('.big').innerText();

  // The book lives in IndexedDB, in the worker: it must survive the page going away.
  await page.reload();
  await expect(page.locator('.rail .tile').nth(1).locator('.big')).toHaveText(after);
});

test('the open tab is in the address bar, and a reload comes back to it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Month matrix' }).click();
  await expect(page).toHaveURL(/view=matrix/);

  await page.reload();
  await expect(page.getByRole('tab', { name: 'Month matrix' })).toHaveAttribute(
    'aria-selected',
    'true'
  );

  // A link to one day opens that day.
  await page.goto('/?view=day&day=2026-09-02');
  await expect(page.locator('.day-head h2')).toContainText('02/09');
});

test('an hour is booked at the rate button that is pressed', async ({ page }) => {
  await page.goto('/?view=day');
  const second = page.getByRole('radio', { name: /at the second rate/ }).first();
  await second.click();
  await expect(second).toHaveAttribute('aria-checked', 'true');

  const label = await second.innerText();
  await page.locator('.band').nth(1).click();
  await expect(page.locator('.band.filled .band-rate').first()).toHaveText(label.replace(' ★', ''));
});

test('the theme toggle walks system, light and dark', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('html');
  const toggle = page.getByRole('button', { name: /^Theme:/ });

  await expect(root).not.toHaveAttribute('data-theme', /.*/);
  await toggle.click();
  await expect(root).toHaveAttribute('data-theme', 'light');
  await toggle.click();
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await toggle.click();
  await expect(root).not.toHaveAttribute('data-theme', /.*/);
});
