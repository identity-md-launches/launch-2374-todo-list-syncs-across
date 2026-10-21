import { chromium, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const output = resolve('test/scratch/browser-checks');
const dist = resolve(process.env.TANDEM_EXPORT || 'dist');
await mkdir(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!path.startsWith('/preview/')) { res.writeHead(404).end(); return; }
    const file = resolve(dist, path.slice(9) || 'index.html');
    if (!file.startsWith(dist + '/')) throw new Error('Invalid path');
    res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/preview/`;
const results = { passed: [], limitations: [], consoleErrors: [], failedResources: [], accessibility: [], viewports: [] };
let browser;
const pass = name => { results.passed.push(name); console.log(`PASS ${name}`); };
const add = async (page, title) => { await page.getByRole('textbox', { name: 'New task', exact: true }).fill(title); await page.getByRole('button', { name: 'Add task', exact: true }).click(); };
const waitText = (page, name) => page.getByRole('button', { name: `Edit ${name}`, exact: true }).waitFor();
const absent = async (page, name) => { await page.getByRole('button', { name: `Edit ${name}`, exact: true }).waitFor({ state: 'hidden' }); };
const closeDialog = page => page.getByRole('button', { name: 'Close dialog', exact: true }).click();
const audit = async (page, state) => {
  const result = await new AxeBuilder({ page }).analyze();
  results.accessibility.push({ state, violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, html: n.html })) })) });
  assert.equal(result.violations.length, 0, `${state}: ${result.violations.map(v => v.id).join(', ')}`);
};
const pair = async (a, b) => {
  await a.getByRole('button', { name: 'Sync devices', exact: true }).click();
  await a.getByRole('button', { name: 'Create pairing code' }).click();
  await a.getByLabel('Your pairing code', { exact: true }).waitFor();
  const offer = await a.getByLabel('Your pairing code', { exact: true }).inputValue();
  assert.ok(offer.startsWith('tandem1.'));
  await b.getByRole('button', { name: 'Sync devices', exact: true }).click();
  await b.getByRole('button', { name: 'Enter a code', exact: true }).click();
  await b.getByLabel('Pairing code from your other device').fill(offer);
  await b.getByRole('button', { name: 'Create reply code' }).click();
  await b.getByLabel('Your reply code', { exact: true }).waitFor();
  const answer = await b.getByLabel('Your reply code', { exact: true }).inputValue();
  await a.getByLabel('3. Paste the reply from your other device').fill(answer);
  await a.getByRole('button', { name: 'Connect devices', exact: true }).click();
  await Promise.all([a, b].map(p => p.getByRole('heading', { name: 'Connected to one device', exact: true }).waitFor({ timeout: 15000 })));
  await Promise.all([closeDialog(a), closeDialog(b)]);
};

try {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  context.setDefaultTimeout(10000);
  const page = await context.newPage();
  page.on('pageerror', error => results.consoleErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') results.consoleErrors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) results.failedResources.push(`${response.status()} ${response.url()}`); });
  await page.goto(url);
  await page.getByRole('heading', { name: 'My tasks.' }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.fonts.check('400 16px "DM Sans"') && document.fonts.check('600 16px "DM Sans"')), true);
  await audit(page, 'desktop empty');
  await page.screenshot({ path: `${output}/desktop-empty.png`, fullPage: true });
  pass('static subpath, local font, empty state, and desktop accessibility');

  await page.getByRole('button', { name: 'Add task', exact: true }).click();
  assert.equal(await page.locator('#new-task').getAttribute('aria-invalid'), 'true');
  await page.getByRole('button', { name: 'Add details', exact: false }).click();
  await page.getByLabel('List', { exact: true }).selectOption('Work');
  const day = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  await page.getByLabel('Due date', { exact: true }).fill(day);
  await page.getByLabel('Important', { exact: true }).check();
  await add(page, 'Review the project brief');
  await waitText(page, 'Review the project brief');
  await page.getByRole('button', { name: 'Edit Review the project brief' }).click();
  await page.getByLabel('Task name').fill('Review the final brief');
  await page.getByLabel('Notes').fill('Compare the timeline and write down questions.');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await waitText(page, 'Review the final brief');
  await page.getByRole('button', { name: 'Edit Review the final brief' }).click();
  await page.getByRole('button', { name: 'Save changes' }).focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Close dialog');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Save changes');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Edit Review the final brief');
  await page.getByRole('button', { name: 'Hide details', exact: false }).click();
  await add(page, 'Bring a book for the train');
  await page.getByLabel('Sort tasks').selectOption('alphabetical');
  assert.equal(await page.locator('.task-title').first().textContent(), 'Bring a book for the train');
  await page.getByRole('searchbox', { name: 'Search tasks' }).fill('missing-phrase');
  await page.getByRole('heading', { name: 'Nothing by that name' }).waitFor();
  await page.getByRole('button', { name: 'Clear search', exact: true }).first().click();
  await page.getByRole('checkbox', { name: 'Complete: Review the final brief', exact: true }).click();
  await absent(page, 'Review the final brief');
  await page.getByRole('navigation', { name: 'Task views' }).getByRole('button', { name: /^Completed/ }).click();
  await waitText(page, 'Review the final brief');
  await page.getByRole('checkbox', { name: 'Mark incomplete: Review the final brief' }).click();
  await page.getByRole('navigation', { name: 'Task views' }).getByRole('button', { name: /^My tasks/ }).click();
  await page.getByRole('button', { name: 'Delete Bring a book for the train', exact: true }).click();
  await absent(page, 'Bring a book for the train');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await waitText(page, 'Bring a book for the train');
  await page.reload();
  await waitText(page, 'Review the final brief');
  pass('create, details, edit, keyboard focus return, sort, search, complete, reopen, delete, undo, reload persistence');

  await page.getByRole('button', { name: 'Backup & restore', exact: true }).click();
  await audit(page, 'backup dialog');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download backup', exact: true }).click();
  const download = await downloadPromise;
  const backupPath = `${output}/backup.json`; await download.saveAs(backupPath);
  const backup = JSON.parse(await readFile(backupPath, 'utf8'));
  assert.equal(backup.tasks.filter(t => !t.deleted).length, 2);
  await page.getByLabel('Backup file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
  await page.getByRole('alert').filter({ hasText: 'valid Tandem JSON' }).waitFor();
  await closeDialog(page);
  const restoreContext = await browser.newContext();
  const restorePage = await restoreContext.newPage(); await restorePage.goto(url);
  await restorePage.getByRole('button', { name: 'Keep a backup', exact: true }).click();
  await restorePage.getByLabel('Backup file').setInputFiles(backupPath);
  await waitText(restorePage, 'Review the final brief');
  await restoreContext.close();
  pass('real backup download, fresh-device restore, and invalid-file recovery');

  for (const width of [320, 390, 720, 900, 1440]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
    const metrics = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, add: document.querySelector('.add-button').getBoundingClientRect().bottom }));
    assert.ok(metrics.scroll <= metrics.client, `overflow at ${width}`);
    assert.ok(metrics.add < 844, `main action below first screen at ${width}`);
    results.viewports.push({ width, ...metrics });
    await page.screenshot({ path: `${output}/tasks-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.locator('#mobile-navigation').getByRole('button', { name: /^Today/ }).click();
  await waitText(page, 'Review the final brief');
  await page.getByRole('button', { name: 'Sync devices', exact: true }).click();
  await audit(page, 'mobile pairing dialog');
  await page.getByRole('button', { name: 'Enter a code', exact: true }).click();
  await page.getByLabel('Pairing code from your other device').fill('invalid-code');
  await page.getByRole('button', { name: 'Create reply code' }).click();
  await page.getByRole('alert').filter({ hasText: 'complete pairing code' }).waitFor();
  await page.screenshot({ path: `${output}/pairing-error-390.png`, fullPage: true });
  await closeDialog(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.primary').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.locator('#mobile-navigation').getByRole('button', { name: /^My tasks/ }).click();
  await audit(page, 'mobile tasks');
  await page.evaluate(() => document.documentElement.style.fontSize = '32px');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const panels = await page.locator('.overview > section').evaluateAll(elements => elements.map(e => ({ top: e.getBoundingClientRect().top, bottom: e.getBoundingClientRect().bottom })));
  assert.ok(panels[1].top >= panels[0].bottom, 'overview stacks at 200% text size');
  await page.screenshot({ path: `${output}/text-resize-390.png`, fullPage: true });
  await page.evaluate(() => document.documentElement.style.fontSize = '');
  pass('responsive reflow, 200% text size, first-screen action, mobile navigation, reduced motion, and recoverable pairing errors');

  await page.setViewportSize({ width: 1440, height: 1000 });
  const contextB = await browser.newContext({ viewport: { width: 390, height: 844 } });
  contextB.setDefaultTimeout(10000);
  const b = await contextB.newPage(); await b.goto(url); await add(b, 'An idea from my phone');
  await pair(page, b);
  await waitText(page, 'An idea from my phone'); await waitText(b, 'Review the final brief');
  await add(page, 'Synced from the laptop'); await waitText(b, 'Synced from the laptop');
  await b.getByRole('button', { name: 'Edit Synced from the laptop', exact: true }).click();
  await b.getByLabel('Task name').fill('Edited on the phone');
  await b.getByRole('button', { name: 'Save changes' }).click(); await waitText(page, 'Edited on the phone');
  await b.getByRole('checkbox', { name: 'Complete: Edited on the phone', exact: true }).click();
  await absent(page, 'Edited on the phone');
  await b.getByRole('button', { name: 'Delete An idea from my phone', exact: true }).click();
  await absent(page, 'An idea from my phone');
  await b.getByRole('button', { name: 'Undo', exact: true }).click(); await waitText(page, 'An idea from my phone');
  await page.screenshot({ path: `${output}/live-sync-desktop.png`, fullPage: true });
  pass('real WebRTC pairing between isolated browser contexts; two-way initial merge, creation, edit, completion, deletion, and undo');

  await Promise.all([page.reload(), b.reload()]);
  await page.getByRole('button', { name: 'Edit Review the final brief', exact: true }).click();
  await page.getByLabel('Task name').fill('Offline title from laptop'); await page.getByRole('button', { name: 'Save changes' }).click();
  await b.getByRole('button', { name: 'Edit Review the final brief', exact: true }).click();
  await b.getByLabel('Notes').fill('Offline note from phone'); await b.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('button', { name: 'Delete An idea from my phone', exact: true }).click();
  await pair(page, b);
  await waitText(b, 'Offline title from laptop'); await absent(b, 'An idea from my phone');
  await page.getByRole('button', { name: 'Edit Offline title from laptop', exact: true }).click();
  assert.equal(await page.getByLabel('Notes').inputValue(), 'Offline note from phone'); await closeDialog(page);
  pass('re-pairing after reload merges concurrent offline fields and propagates offline deletions');
  await contextB.close();

  const tab = await context.newPage(); await tab.goto(url);
  await add(tab, 'Added in another tab'); await waitText(page, 'Added in another tab');
  await tab.close();
  await context.setOffline(true);
  await add(page, 'Saved without internet');
  await waitText(page, 'Saved without internet');
  await context.setOffline(false); await page.reload(); await waitText(page, 'Saved without internet');
  pass('same-browser tab synchronization and offline edits persisted across reload');

  const quotaContext = await browser.newContext();
  await quotaContext.addInitScript(() => { Storage.prototype.setItem = function () { throw new DOMException('Full', 'QuotaExceededError'); }; });
  const quotaPage = await quotaContext.newPage(); await quotaPage.goto(url); await add(quotaPage, 'Keep this in memory');
  await quotaPage.getByRole('alert').filter({ hasText: 'browser storage is unavailable or full' }).waitFor();
  assert.equal(await quotaPage.locator('.local-footer').textContent(), 'Not saved to browser');
  await quotaContext.close();
  const corruptContext = await browser.newContext();
  await corruptContext.addInitScript(() => localStorage.setItem('tandem.tasks.v1', '{unreadable'));
  const corrupt = await corruptContext.newPage(); await corrupt.goto(url); await add(corrupt, 'Temporary task');
  assert.equal(await corrupt.evaluate(() => localStorage.getItem('tandem.tasks.v1')), '{unreadable');
  await corruptContext.close();
  pass('storage quota errors are visible; unreadable original storage is preserved');

  await context.close(); await browser.close(); browser = null;
  let safari;
  try {
    safari = await webkit.launch({ headless: true });
  } catch (error) { results.limitations.push(`WebKit could not launch: ${String(error.message).split('\n').slice(0, 8).join(' ')}`); console.log('LIMITATION WebKit launch unavailable'); }
  if (safari) {
    try {
      const p = await safari.newPage({ viewport: { width: 390, height: 844 } }); await p.goto(url);
      await add(p, 'Safari task'); await waitText(p, 'Safari task');
      await p.getByRole('checkbox', { name: 'Complete: Safari task' }).click(); await absent(p, 'Safari task');
      await p.screenshot({ path: `${output}/webkit-390.png`, fullPage: true }); pass('WebKit create and complete at 390');
    } finally { await safari.close(); }
  }
  assert.deepEqual(results.consoleErrors, []); assert.deepEqual(results.failedResources, []);
  pass('no console errors or failing resources on production export');
} catch (error) {
  results.failure = String(error.stack || error); process.exitCode = 1; console.error(error);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
}
