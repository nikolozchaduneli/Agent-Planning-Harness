/**
 * GIF: Full Drawing Board flow
 *
 * Sequence: home → empty board → prompt typed → AI thinking (round 1) →
 *   first response + canvas filling → [thinking → response] × N rounds →
 *   Initialize Project ready → click → Plan view lands
 *
 * Output: docs/ui/gif-01-drawing-board.gif
 */
const path = require('path');
const {
  launchBrowser, newPage, OUT_DIR,
  waitForAI, runDrawingBoardConversation,
  makeRecorder,
} = require('./_shared');

(async () => {
  const browser = await launchBrowser();
  const page = await newPage(browser);
  const { snap, encodeGif, cleanup } = makeRecorder();

  const { BASE_URL } = require('./_shared');

  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  // Frame: home
  await snap(page, 1200, 'home');

  // Enter Drawing Board
  await page.getByText('Go to drawing board', { exact: false }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);

  // Frame: empty board
  await snap(page, 1800, 'board_empty');

  // Type prompt
  const input = page.locator('input[placeholder*="Pitch"]');
  await input.fill('I want to build a personal finance tracker that helps me stay on budget with weekly AI insights');
  await snap(page, 1200, 'prompt_typed');

  // Send
  await page.getByRole('button', { name: /^send$/i }).click();
  await page.waitForTimeout(1000);
  await snap(page, 800, 'thinking_r1');

  await waitForAI(page);
  await snap(page, 2000, 'response_r1');

  // Suggestion rounds — capture thinking + response each time
  for (let round = 2; round <= 12; round++) {
    if (await page.locator('button').filter({ hasText: /initialize project/i }).count() > 0) {
      console.log(`Initialize Project ready at round ${round}`);
      break;
    }
    const suggBtn = page.locator('button').filter({ hasText: /suggest/i }).first();
    if (await suggBtn.count() === 0) break;

    await suggBtn.click();
    await page.waitForTimeout(800);
    await snap(page, 600, `thinking_r${round}`);

    await waitForAI(page);
    await snap(page, 1800, `response_r${round}`);
  }

  // Frame: Initialize Project button visible — hold
  await snap(page, 2400, 'init_ready');

  // Click Initialize Project
  await page.locator('button').filter({ hasText: /initialize project/i }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Frame: Plan view (result)
  await snap(page, 3000, 'plan_view');

  await browser.close();
  encodeGif(path.join(OUT_DIR, 'gif-01-drawing-board.gif'));
  cleanup();
})();
