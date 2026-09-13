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

test('a week without an exported file is said out loud, and can be waved away', async ({ page }) => {
  const tenDaysAgo = Date.now() - 10 * 86_400_000;

  // A book of somebody's own (not the example) that was last exported ten days ago.
  await page.addInitScript((firstSeen) => {
    localStorage.setItem('kostenboek.firstSeen', String(firstSeen));
    localStorage.setItem('kostenboek.lastExport', String(firstSeen));
  }, tenDaysAgo);

  await page.goto('/?view=day');
  await page.getByRole('button', { name: 'clear the example' }).click();
  await expect(page.getByLabel('Backup reminder')).toBeHidden();

  // A book of one's own: a project, then an hour on it. An empty book has
  // nothing to lose, so nothing is said until there is work in it.
  await page.getByText('Projects and rates').click();
  await page.getByLabel('code').fill('ACM');
  await page.getByLabel('project', { exact: true }).fill('Acme rebuild');
  await page.getByLabel('standard rate', { exact: true }).fill('100');
  await page.getByRole('button', { name: 'Add project' }).click();
  await expect(page.getByLabel('Backup reminder')).toBeHidden();

  await page.locator('.band').first().click();
  await expect(page.getByLabel('Backup reminder')).toContainText('10 days');

  await page.getByRole('button', { name: 'not now' }).click();
  await expect(page.getByLabel('Backup reminder')).toBeHidden();

  // Dismissing buys a day, not for ever.
  await page.evaluate(() => {
    localStorage.setItem('kostenboek.backupDismissed', String(Date.now() - 25 * 3_600_000));
  });
  await page.reload();
  await expect(page.getByLabel('Backup reminder')).toBeVisible();
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

/**
 * A book of two months of 2024, imported rather than generated: the example is
 * built from the day the test runs, which in a late December or an early January
 * run would leave the year on screen with one month in it, or none.
 */
const TWO_MONTHS = {
  version: 2,
  projects: [
    {
      id: 'nls',
      code: 'NLS',
      name: 'Northside School site',
      client: 'Northside School',
      rate: 9000,
      premiumRate: 14000,
      color: 'var(--project-1)',
      archived: false
    }
  ],
  slots: {
    '2024-03-04T09': { projectId: 'nls', kind: 'standard', rate: 9000 },
    '2024-03-04T10': { projectId: 'nls', kind: 'standard', rate: 9000 },
    '2024-03-05T09': { projectId: 'nls', kind: 'standard', rate: 9000 },
    '2024-11-18T09': { projectId: 'nls', kind: 'standard', rate: 9000 },
    '2024-11-18T10': { projectId: 'nls', kind: 'standard', rate: 9000 },
    '2024-11-18T11': { projectId: 'nls', kind: 'standard', rate: 9000 },
    '2024-11-18T12': { projectId: 'nls', kind: 'standard', rate: 9000 }
  },
  days: {
    '2024-03-04': { status: 'invoiced', invoiceRef: '2024-007', sentOn: '2024-03-08' },
    '2024-03-05': { status: 'unbilled' },
    '2024-11-18': { status: 'paid', invoiceRef: '2024-031', sentOn: '2024-11-20' }
  },
  settings: { vatRate: 0.21, dayStart: 8, dayEnd: 20 }
};

async function openImportedYear(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  await page.locator('#import-file').setInputFiles({
    name: 'kostenboek-2024.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(TWO_MONTHS))
  });
  await expect(page.getByLabel('Example data')).toBeHidden();
  await page.goto('/?view=year&month=2024-06');
  await expect(page.locator('.heat-column').first()).toBeVisible();
}

test('the year overview sums across months and paints a heatmap', async ({ page }) => {
  await openImportedYear(page);

  // A column a week, a square a day: a whole year on one screen.
  expect(await page.locator('.heat-column').count()).toBeGreaterThanOrEqual(52);
  await expect(page.locator('.heat-grid .heat.step-4')).toHaveCount(1);

  // Three hours in March and four in November, which no single month adds up.
  const months = page.locator('.year-months tbody tr:not(.quiet)');
  await expect(months).toHaveCount(2);
  await expect(page.locator('.year-months tfoot td')).toHaveText([
    '7h',
    '€ 630',
    '€ 90',
    '€ 180',
    '€ 360'
  ]);
  await expect(page.locator('.year .tile.lead .big')).toHaveText('€ 270');

  // A month in the table opens that month on the calendar.
  await months.first().getByRole('button').click();
  await expect(page.getByRole('tab', { name: 'Calendar' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.calendar')).toBeVisible();
});

test('a day in the heatmap opens that day', async ({ page }) => {
  await openImportedYear(page);

  const busiest = page.locator('.heat-grid .heat.step-4');
  await expect(busiest).toHaveAttribute('aria-label', /^18\/11 · 4h/);
  await busiest.click();

  await expect(page.getByRole('tab', { name: 'Day' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.day-head h2')).toContainText('18/11');
});
