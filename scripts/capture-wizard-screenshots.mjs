/**
 * Capture WaniKani token generation flow screenshots for the setup wizard.
 *
 * Usage: node scripts/capture-wizard-screenshots.mjs
 *
 * Requires .env with WANIKANI_EMAIL and WANIKANI_PASSWORD.
 */

import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUTPUT = resolve(ROOT, 'assets/wizard');

// Load .env manually (no dotenv dependency)
const envContent = readFileSync(resolve(ROOT, '.env'), 'utf-8');
const env = Object.fromEntries(
  envContent
    .split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx), line.slice(idx + 1)];
    }),
);

const EMAIL = env.WANIKANI_EMAIL;
const PASSWORD = env.WANIKANI_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Missing WANIKANI_EMAIL or WANIKANI_PASSWORD in .env');
  process.exit(1);
}

const VIEWPORT = { width: 375, height: 812 }; // iPhone-sized viewport at 2x

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // --- Login ---
  console.log('Logging in to WaniKani...');
  await page.goto('https://www.wanikani.com/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name="user[email]"]', EMAIL);
  await page.fill('input[name="user[password]"]', PASSWORD);
  await page.click('input[value="Login"], button:has-text("Login")');
  await page.waitForNavigation({ timeout: 15000 });
  console.log('Logged in.');

  // --- Step 1: Settings page ---
  console.log('Navigating to settings...');
  await page.goto('https://www.wanikani.com/settings/account');
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: resolve(OUTPUT, 'step1-settings.png'),
    fullPage: false,
  });
  console.log('Captured step 1: settings page.');

  // --- Step 2: Personal Access Tokens page ---
  console.log('Navigating to personal access tokens...');
  await page.goto('https://www.wanikani.com/settings/personal_access_tokens');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: resolve(OUTPUT, 'step2-personal-access-tokens.png'),
    fullPage: false,
  });
  console.log('Captured step 2: personal access tokens page.');

  // --- Step 3: Generate a new token form ---
  console.log('Navigating to new token form...');
  await page.goto(
    'https://www.wanikani.com/settings/personal_access_tokens/new',
  );
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: resolve(OUTPUT, 'step3-generate-token.png'),
    fullPage: false,
  });
  console.log('Captured step 3: generate token form.');

  // --- Step 4: Submit the form and capture the newly created token ---
  console.log('Generating token...');
  await page.fill('input[name="description"]', 'Krabikani App');
  // Check all permission checkboxes
  const checkboxes = page.locator('input[type="checkbox"]');
  const count = await checkboxes.count();
  for (let i = 0; i < count; i++) {
    const cb = checkboxes.nth(i);
    if (!(await cb.isChecked())) {
      await cb.check();
    }
  }
  // Submit the token generation form
  const submitBtn = page.locator('button:has-text("Generate token")');
  await submitBtn.scrollIntoViewIfNeeded();
  await submitBtn.click();
  await page.waitForLoadState('networkidle');
  // Wait for the page to show the new token
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: resolve(OUTPUT, 'step4-copy-token.png'),
    fullPage: false,
  });
  console.log('Captured step 4: copy token page.');

  // --- Cleanup: expire the newly created token ---
  console.log('Cleaning up: expiring test token...');
  // The newly created token should be the one named "Krabikani App"
  // Look for an Expire button associated with it
  page.on('dialog', dialog => dialog.accept());
  const expireButtons = page.locator(
    'input[value="Expire"], button:has-text("Expire")',
  );
  const expireCount = await expireButtons.count();
  // Expire the first one (most recently created)
  if (expireCount > 0) {
    await expireButtons.first().click();
    await page.waitForLoadState('networkidle');
    console.log('Token expired.');
  } else {
    console.log(
      'Could not find Expire button. Manual cleanup may be needed.',
    );
  }

  await browser.close();
  console.log(`Screenshots saved to ${OUTPUT}`);
}

main().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
