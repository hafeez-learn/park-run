import { test, expect } from '@playwright/test';

// ─── Helpers ───────────────────────────────────────────────────────────────

async function grantLocation(page) {
  await page.context().grantPermissions(['geolocation'], { accuracy: 'high' });
  await page.context().setGeolocation({ latitude: 1.37707, longitude: 103.89848 });
}

// ─── Permission overlay ────────────────────────────────────────────────────

test('shows permission overlay on first load', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#permission-overlay')).toBeVisible();
  await expect(page.locator('#grant-btn')).toBeVisible();
});

test('permission overlay hides after granting location', async ({ page }) => {
  await grantLocation(page);
  await page.goto('/');
  await page.locator('#grant-btn').click();
  await expect(page.locator('#permission-overlay')).toBeHidden({ timeout: 5000 });
});

// ─── Map loads ─────────────────────────────────────────────────────────────

test('map container is present', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#map')).toBeVisible();
});

test('park circle overlay is rendered (leaflet container present)', async ({ page }) => {
  await page.goto('/');
  // Leaflet creates .leaflet-container
  await expect(page.locator('.leaflet-container')).toBeVisible();
});

// ─── Bottom panel / action button ─────────────────────────────────────────

test('action button says "Start Run" initially', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#action-btn')).toHaveText('▶ Start Run');
});

test('voice toggle is present and defaults to checked', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('#voice-toggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toBeChecked();
});

// ─── Stats panel (hidden until run starts) ────────────────────────────────

test('stats panel is hidden before run', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#stats-panel')).not.toHaveClass(/visible/);
});

// ─── Start run → UI transitions ────────────────────────────────────────────

test('clicking Start Run shows stats panel and nav display', async ({ page }) => {
  await grantLocation(page);
  await page.goto('/');

  await page.locator('#action-btn').click();
  await page.waitForTimeout(500);

  await expect(page.locator('#stats-panel')).toHaveClass(/visible/);
  await expect(page.locator('#nav-display')).toHaveClass(/visible/);
  await expect(page.locator('#lap-progress-wrap')).toHaveClass(/visible/);
  await expect(page.locator('#action-btn')).toHaveText('⏹ Stop Run');
});

// ─── History panel ─────────────────────────────────────────────────────────

test('history button opens history panel', async ({ page }) => {
  await page.goto('/');
  await page.locator('#history-btn').click();
  await expect(page.locator('#history-panel')).toHaveClass(/visible/);
});

test('history close button hides panel', async ({ page }) => {
  await page.goto('/');
  await page.locator('#history-btn').click();
  await expect(page.locator('#history-panel')).toHaveClass(/visible/);
  await page.locator('#history-close').click();
  await expect(page.locator('#history-panel')).not.toHaveClass(/visible/);
});

// ─── Voice toggle ─────────────────────────────────────────────────────────

test('voice toggle can be unchecked', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('#voice-toggle');
  await expect(toggle).toBeChecked();
  await toggle.uncheck();
  await expect(toggle).not.toBeChecked();
});

// ─── Page title / branding ─────────────────────────────────────────────────

test('app title is correct', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.logo')).toContainText('ParkRun');
});

// ─── Responsive layout ─────────────────────────────────────────────────────

test('bottom panel is visible on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#bottom-panel')).toBeVisible();
});

test('topbar is visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#topbar')).toBeVisible();
});

// ─── Toast notifications ────────────────────────────────────────────────────

test('short run shows toast with message', async ({ page }) => {
  await grantLocation(page);
  await page.goto('/');

  // Grant location first, then start and immediately stop run
  await page.locator('#action-btn').click();
  await page.waitForTimeout(300);
  await page.locator('#action-btn').click(); // stop immediately

  // Toast should appear
  const toast = page.locator('#toast');
  await expect(toast).toBeVisible({ timeout: 3000 });
});