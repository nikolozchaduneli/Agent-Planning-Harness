/**
 * GIF: Focus view — task selection → Send to Focus → Generate AI prompt
 *
 * Sequence: [full setup + tasks] → plan skeleton loading → tasks loaded →
 *   hover task card → Send to Focus → Focus view lands →
 *   Generate AI prompt → generating → prompt + execution checklist
 *
 * Output: docs/ui/gif-03-focus-prompt.gif
 */
const path = require('path');
const {
  launchBrowser, newPage, OUT_DIR,
  waitForTasksDone, waitForFocusPrompt,
  setupProject, selectMilestoneAndGenerateTasks,
  makeRecorder,
} = require('./_shared');

(async () => {
  const browser = await launchBrowser();
  const page = await newPage(browser);
  const { snap, encodeGif, cleanup } = makeRecorder();

  // Full setup: Drawing Board → Initialize → Plan view
  await setupProject(page);

  // Select milestone + kick off task generation
  await selectMilestoneAndGenerateTasks(page);

  // Frame: skeleton loading
  await page.waitForTimeout(2000);
  await snap(page, 800, 'skeleton');

  // Wait for tasks
  await waitForTasksDone(page);
  await page.waitForTimeout(500);

  // Frames: tasks loaded — hold so viewer can read them
  await snap(page, 1800, 'tasks_loaded');
  await snap(page, 1800, 'tasks_loaded2');

  // Hover first task card to surface the Send to Focus button
  await page.locator('button[aria-label="Send to Focus"]').first().hover({ force: true });
  await page.waitForTimeout(400);

  // Frames: hover state visible
  await snap(page, 1200, 'task_hovered');
  await snap(page, 1200, 'task_hovered2');

  // Click Send to Focus (auto-navigates to Focus view)
  await page.locator('button[aria-label="Send to Focus"]').first().click();
  await page.waitForTimeout(1500);

  // Frames: Focus view — task card visible, no prompt yet
  await snap(page, 1600, 'focus_before');
  await snap(page, 1600, 'focus_before2');

  // Click Generate AI prompt
  await page.locator('button').filter({ hasText: /generate ai prompt/i }).first().click();
  await page.waitForTimeout(1500);

  // Frames: generating spinner
  await snap(page, 800, 'generating');
  await snap(page, 800, 'generating2');

  // Wait for prompt + checklist to appear
  await waitForFocusPrompt(page);
  await page.waitForTimeout(500);

  // Frames: full prompt + checklist — hold
  await snap(page, 2500, 'prompt_done');
  await snap(page, 2500, 'prompt_done2');
  await snap(page, 2500, 'prompt_done3');

  await browser.close();
  encodeGif(path.join(OUT_DIR, 'gif-03-focus-prompt.gif'));
  cleanup();
})();
