// Tests for the LocalAuthSettings component rendered inside the Extensions tab.
// Requires the full app to be running (see playwright.config.js).
import { test, expect } from '@playwright/test';

const APP_NAME = 'dm-test';

function mockServerConfig(page) {
  return page.route('/api/server-config', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ appName: APP_NAME, dokkuHost: 'test.example.com' }),
    })
  );
}

function mockAppConfig(page, config = {}) {
  return page.route(`/api/apps/${APP_NAME}/config`, (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(config) });
    } else {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    }
  });
}

function mockExtensionsWithLocalAuth(page, { isConfigured = false } = {}) {
  return page.route('/api/extensions/active', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        authProviders: [{ id: 'local', label: 'Local Auth', isConfigured, configKeys: [] }],
        dnsProviders: [],
        activeAuthProviderId: 'local',
        activeDnsProviderId: null,
        plugins: [],
      }),
    })
  );
}

async function goToExtensions(page) {
  await page.goto('/settings/extensions');
  await page.waitForSelector('[class*="animate-spin"]', { state: 'detached', timeout: 10_000 }).catch(() => {});
}

test.describe('LocalAuthSettings — view state', () => {
  test('shows Not Configured badge and Configure button when credentials absent', async ({ page }) => {
    await mockServerConfig(page);
    await mockAppConfig(page, {});
    await mockExtensionsWithLocalAuth(page, { isConfigured: false });
    await goToExtensions(page);

    await expect(page.getByText('Not Configured').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Configure' })).toBeVisible();
    await expect(page.getByText('not set').first()).toBeVisible();
  });

  test('shows Configured badge and Edit button when credentials present', async ({ page }) => {
    await mockServerConfig(page);
    await mockAppConfig(page, { LOCAL_AUTH_USERNAME: 'admin', LOCAL_AUTH_PASSWORD: 'secret' });
    await mockExtensionsWithLocalAuth(page, { isConfigured: true });
    await goToExtensions(page);

    await expect(page.getByText('Configured').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(page.getByText('admin')).toBeVisible();
    // Password is masked
    await expect(page.getByText('••••••••••••••••')).toBeVisible();
  });

  test('shows amber notice and disabled Configure button without managerAppName', async ({ page }) => {
    await page.route('/api/server-config', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ appName: null }) })
    );
    await page.route('/api/apps/**/config', (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'not found' }) })
    );
    await mockExtensionsWithLocalAuth(page, { isConfigured: false });
    await goToExtensions(page);

    await expect(page.getByText(/Config changes require the app to be deployed/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Configure' })).toBeDisabled();
  });
});

test.describe('LocalAuthSettings — edit form', () => {
  test.beforeEach(async ({ page }) => {
    await mockServerConfig(page);
    await mockExtensionsWithLocalAuth(page, { isConfigured: false });
  });

  test('pre-fills username when editing existing config', async ({ page }) => {
    await mockAppConfig(page, { LOCAL_AUTH_USERNAME: 'admin', LOCAL_AUTH_PASSWORD: 'oldpw' });
    await mockExtensionsWithLocalAuth(page, { isConfigured: true });
    await goToExtensions(page);

    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByLabel('Username')).toHaveValue('admin');
    await expect(page.getByLabel('New Password')).toHaveValue('');
  });

  test('Confirm Password field appears only when password is entered', async ({ page }) => {
    await mockAppConfig(page, {});
    await goToExtensions(page);

    await page.getByRole('button', { name: 'Configure' }).click();
    await expect(page.getByLabel('Confirm New Password')).toHaveCount(0);
    await page.getByLabel('New Password').fill('hunter2');
    await expect(page.getByLabel('Confirm New Password')).toBeVisible();
  });

  test('saves only username when password is left empty', async ({ page }) => {
    const saved = [];
    await page.route(`/api/apps/${APP_NAME}/config`, (route) => {
      if (route.request().method() === 'POST') {
        saved.push(JSON.parse(route.request().postData() || '{}'));
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
      }
    });
    await goToExtensions(page);

    await page.getByRole('button', { name: 'Configure' }).click();
    await page.getByLabel('Username').fill('newadmin');
    // No password entered
    await page.getByRole('button', { name: 'Save (no restart)' }).click();

    await page.waitForFunction(() => !document.querySelector('button[disabled]'));
    expect(saved).toHaveLength(1);
    expect(saved[0].vars).toEqual({ LOCAL_AUTH_USERNAME: 'newadmin' });
    expect(saved[0].vars).not.toHaveProperty('LOCAL_AUTH_PASSWORD');
  });

  test('shows error for no-changes save (empty form)', async ({ page }) => {
    await mockAppConfig(page, {});
    let saved = false;
    await page.route(`/api/apps/${APP_NAME}/config`, (route) => {
      if (route.request().method() === 'POST') saved = true;
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await goToExtensions(page);

    await page.getByRole('button', { name: 'Configure' }).click();
    // Leave all fields empty
    await page.getByRole('button', { name: 'Save (no restart)' }).click();

    await expect(page.getByText('No changes to save')).toBeVisible();
    expect(saved).toBe(false);
  });

  test('password mismatch shows inline error without API call', async ({ page }) => {
    await mockAppConfig(page, {});
    let saved = false;
    await page.route(`/api/apps/${APP_NAME}/config`, (route) => {
      if (route.request().method() === 'POST') saved = true;
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await goToExtensions(page);

    await page.getByRole('button', { name: 'Configure' }).click();
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('New Password').fill('abc');
    await page.getByLabel('Confirm New Password').fill('xyz');
    await page.getByRole('button', { name: 'Save (no restart)' }).click();

    await expect(page.getByText('Passwords do not match')).toBeVisible();
    expect(saved).toBe(false);
  });

  test('Cancel closes form without saving', async ({ page }) => {
    await mockAppConfig(page, {});
    let saved = false;
    await page.route(`/api/apps/${APP_NAME}/config`, (route) => {
      if (route.request().method() === 'POST') saved = true;
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await goToExtensions(page);

    await page.getByRole('button', { name: 'Configure' }).click();
    await page.getByLabel('Username').fill('admin');
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('button', { name: 'Configure' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save (no restart)' })).toHaveCount(0);
    expect(saved).toBe(false);
  });

  test('successful save closes the form', async ({ page }) => {
    await mockAppConfig(page, {});
    await page.route(`/api/apps/${APP_NAME}/config`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
    );
    await goToExtensions(page);

    await page.getByRole('button', { name: 'Configure' }).click();
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('New Password').fill('hunter2');
    await page.getByLabel('Confirm New Password').fill('hunter2');
    await page.getByRole('button', { name: 'Save (no restart)' }).click();

    await expect(page.getByRole('button', { name: 'Save (no restart)' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit' }).or(page.getByRole('button', { name: 'Configure' }))).toBeVisible();
  });
});
