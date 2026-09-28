import { expect, test } from '@playwright/test';

test('home is branded, illustrated and does not invent a deployment', async ({ page }) => {
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Room to belong/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Enter the gate', exact: true })).toBeVisible();
  await expect(page.getByText('Awaiting a planted gate')).toBeAttached();
  const image = page.locator('.hero-image');
  await expect(image).toBeVisible();
  expect(await image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBeTruthy();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  expect(failures).toEqual([]);
});

test('compiled proving assets are served as binary files', async ({ request }) => {
  const response = await request.get('/managed/keys/prove_entry.prover');
  expect(response.ok()).toBeTruthy();
  expect(response.headers()['content-type']).not.toContain('text/html');
  expect((await response.body()).byteLength).toBeGreaterThan(100_000);
});

test('mocked Lace connector receives the network and disconnects cleanly', async ({ page }) => {
  // This tests connector UI behavior, not proving or a real on-chain transaction.
  await page.addInitScript(() => {
    const session = {
      getConfiguration: async () => ({ networkId: 'preview', indexerUri: 'https://indexer.preview.midnight.network/api/v4/graphql', indexerWsUri: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws' }),
      getUnshieldedAddress: async () => ({ unshieldedAddress: 'test-wallet-address' }),
      getShieldedAddresses: async () => ({ shieldedCoinPublicKey: 'ab'.repeat(32), shieldedEncryptionPublicKey: 'cd'.repeat(32) }),
      getProvingProvider: async () => ({ prove: async () => new Uint8Array(), check: async () => [] }),
      balanceUnsealedTransaction: async () => { throw new Error('Not implemented by UI test'); },
      submitTransaction: async () => { throw new Error('Not implemented by UI test'); },
      disconnect: async () => { (window as any).testDisconnected = true; },
    };
    (window as any).midnight = {
      '1am': { name: '1AM Wallet', connect: async () => session },
      mnLace: { name: 'Lace Wallet', connect: async (network: string) => { (window as any).testNetwork = network; return session; } },
    };
  });
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Connect using' }).selectOption('mnLace');
  await page.getByRole('button', { name: 'Connect wallet', exact: true }).click();
  const disconnect = page.getByRole('button', { name: /^Disconnect Lace Wallet/ });
  await expect(disconnect).toBeVisible();
  expect(await page.evaluate(() => (window as any).testNetwork)).toBe('preview');
  await disconnect.click();
  await expect(page.getByRole('button', { name: 'Connect wallet', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).testDisconnected)).toBe(true);
});

test('day/night preference survives reload', async ({ page }) => {
  await page.goto('/');
  const before = await page.locator('html').getAttribute('data-theme');
  await page.getByRole('button', { name: /Switch to .* mode/ }).click();
  const target = before === 'day' ? 'night' : 'day';
  await expect(page.locator('html')).toHaveAttribute('data-theme', target);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', target);
});

test('unconfigured gate has real setup and wallet actions', async ({ page }) => {
  await page.goto('/gate');
  await expect(page.getByRole('heading', { name: /A shared rule/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Open deployment settings/ })).toBeVisible();
  await page.getByRole('button', { name: 'Connect wallet', exact: true }).last().click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

for (const route of ['/observatory', '/privacy', '/admin', '/steward']) {
  test(`direct navigation to ${route} works`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(route);
    await expect(page.locator('main h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    expect(errors).toEqual([]);
  });
}

test('unknown route provides a recovery link', async ({ page }) => {
  await page.goto('/missing-room');
  await expect(page.getByRole('heading', { name: 'This room isn’t here.' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to Stillroom' }).click();
  await expect(page).toHaveURL('/');
});

test('network selection persists without fabricating wallet connection', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Midnight network' }).selectOption('preprod');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Midnight network' })).toHaveValue('preprod');
  await expect(page.getByRole('button', { name: 'Connect wallet', exact: true })).toBeVisible();
});
