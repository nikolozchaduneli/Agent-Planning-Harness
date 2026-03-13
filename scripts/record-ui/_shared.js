/**
 * Shared helpers for UI recording scripts.
 *
 * Playwright is loaded from the local npx cache. If it ever breaks, run:
 *   npx playwright install chromium
 * and update PLAYWRIGHT_PATH below to match the new cache hash.
 */

const GIFEncoder = require('gif-encoder-2');
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

// ── Playwright location ───────────────────────────────────────────────────────
// npx caches playwright under AppData; hash changes when playwright version bumps.
const PLAYWRIGHT_PATH = 'C:/Users/NChaduneli/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright';
const { chromium } = require(PLAYWRIGHT_PATH);

const BASE_URL = 'http://localhost:3000';
const W = 1440;
const H = 900;
const OUT_DIR = path.resolve(__dirname, '../../docs/ui');

// ── Browser ───────────────────────────────────────────────────────────────────
async function launchBrowser() {
  return chromium.launch({ headless: true });
}

async function newPage(browser) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: W, height: H });
  return page;
}

// ── Waits ─────────────────────────────────────────────────────────────────────
async function waitForAI(page, timeoutMs = 30000) {
  await page.waitForTimeout(2000);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!(await page.locator('body').innerText()).includes('Thinking...')) return;
    await page.waitForTimeout(1200);
  }
}

async function waitForTasksDone(page, timeoutMs = 90000) {
  await page.waitForTimeout(3000);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const body = await page.locator('body').innerText();
    const done = !body.includes('GENERATING TASKS')
      && await page.locator('button[aria-label="Send to Focus"]').count() > 0;
    if (done) return;
    await page.waitForTimeout(2500);
  }
}

async function waitForFocusPrompt(page, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await page.waitForTimeout(2500);
    const isGenerating = await page.locator('button').filter({ hasText: /generating/i }).count() > 0;
    const preCount = await page.locator('pre').count();
    if (!isGenerating && preCount > 0 && Date.now() - start > 5000) return;
  }
}

// ── Drawing Board conversation ────────────────────────────────────────────────
// Sends the finance tracker prompt and keeps clicking the highlighted suggestion
// until "Initialize Project" appears on the canvas.
async function runDrawingBoardConversation(page) {
  const input = page.locator('input[placeholder*="Pitch"]');
  await input.fill('I want to build a personal finance tracker that helps me stay on budget with weekly AI insights');
  await page.getByRole('button', { name: /^send$/i }).click();
  await waitForAI(page);

  for (let round = 2; round <= 12; round++) {
    if (await page.locator('button').filter({ hasText: /initialize project/i }).count() > 0) break;
    const suggBtn = page.locator('button').filter({ hasText: /suggest/i }).first();
    if (await suggBtn.count() === 0) break;
    await suggBtn.click();
    await waitForAI(page);
  }
}

// ── Full setup: Drawing Board → Initialize → Plan view ───────────────────────
async function setupProject(page) {
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await page.getByText('Go to drawing board', { exact: false }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  await runDrawingBoardConversation(page);

  await page.locator('button').filter({ hasText: /initialize project/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

// ── Select first milestone and generate tasks ─────────────────────────────────
async function selectMilestoneAndGenerateTasks(page) {
  // Milestones in the sidebar are div[role="button"] containing a checkbox
  const milestoneDivs = page.locator('div[role="button"]');
  for (let i = 0; i < await milestoneDivs.count(); i++) {
    const div = milestoneDivs.nth(i);
    if (await div.locator('input[type="checkbox"]').count() > 0) {
      await div.locator('span').first().click(); // click the label, not the checkbox
      await page.waitForTimeout(1000);
      break;
    }
  }
  await page.locator('button').filter({ hasText: /generate tasks/i }).first().click();
}

// ── Frame capture + GIF encoding ─────────────────────────────────────────────
function makeRecorder() {
  let idx = 0;
  const frames = [];

  async function snap(page, delay, tag = '') {
    const p = path.join(OUT_DIR, `_rec_${String(idx++).padStart(2, '0')}${tag ? '_' + tag : ''}.png`);
    await page.screenshot({ path: p, fullPage: false });
    frames.push({ file: p, delay });
    return p;
  }

  function encodeGif(outPath) {
    const encoder = new GIFEncoder(W, H, 'neuquant', true);
    encoder.start();
    encoder.setRepeat(0);
    for (const { file, delay } of frames) {
      encoder.setDelay(delay);
      const png = PNG.sync.read(fs.readFileSync(file));
      encoder.addFrame(png.data);
    }
    encoder.finish();
    fs.writeFileSync(outPath, encoder.out.getData());
    console.log(`Saved: ${outPath} (${frames.length} frames)`);
  }

  function cleanup() {
    for (const { file } of frames) try { fs.unlinkSync(file); } catch {}
    console.log(`Cleaned up ${frames.length} temp frames`);
  }

  return { snap, encodeGif, cleanup, frames };
}

module.exports = {
  chromium,
  BASE_URL, W, H, OUT_DIR,
  launchBrowser, newPage,
  waitForAI, waitForTasksDone, waitForFocusPrompt,
  runDrawingBoardConversation, setupProject, selectMilestoneAndGenerateTasks,
  makeRecorder,
};
