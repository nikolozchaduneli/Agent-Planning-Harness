/**
 * GIF: Plan view — milestone selected → Generate Tasks → tasks loaded
 *
 * Sequence: [full setup] → plan view (no tasks) → milestone selected →
 *   Generate Tasks clicked → skeleton loading → tasks appear with estimates + budget bar
 *
 * Output: docs/ui/gif-02-plan-tasks.gif
 */
const path = require('path');
const {
  launchBrowser, newPage, OUT_DIR,
  waitForTasksDone, setupProject, selectMilestoneAndGenerateTasks,
  makeRecorder,
} = require('./_shared');

(async () => {
  const browser = await launchBrowser();
  const page = await newPage(browser);
  const { snap, encodeGif, cleanup } = makeRecorder();

  // Full setup: Drawing Board conversation → Initialize → Plan view
  await setupProject(page);

  // Frame: plan view, no tasks yet
  await snap(page, 1800, 'plan_empty');

  // Select first milestone
  const milestoneDivs = page.locator('div[role="button"]');
  for (let i = 0; i < await milestoneDivs.count(); i++) {
    const div = milestoneDivs.nth(i);
    if (await div.locator('input[type="checkbox"]').count() > 0) {
      await div.locator('span').first().click();
      await page.waitForTimeout(1000);
      break;
    }
  }

  // Frame: milestone selected, Generate Tasks button visible
  await snap(page, 1400, 'milestone_selected');

  // Click Generate Tasks
  await page.locator('button').filter({ hasText: /generate tasks/i }).first().click();
  await page.waitForTimeout(2000);

  // Frame: skeleton loading
  await snap(page, 1000, 'skeleton');
  await snap(page, 1000, 'skeleton2');

  // Wait for tasks to fully load
  await waitForTasksDone(page);
  await page.waitForTimeout(500);

  // Frames: tasks loaded — hold
  await snap(page, 2200, 'tasks_done');
  await snap(page, 2200, 'tasks_done2');
  await snap(page, 2200, 'tasks_done3');

  await browser.close();
  encodeGif(path.join(OUT_DIR, 'gif-02-plan-tasks.gif'));
  cleanup();
})();
