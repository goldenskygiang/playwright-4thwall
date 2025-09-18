import { Page } from '@playwright/test';

const KEYBOARD_CONTROLLER_PORT = 5001;
const KEYBOARD_CONTROLLER_URL = `http://localhost:${KEYBOARD_CONTROLLER_PORT}`;
const WAIT_TIME_KB_MS = 1000;
const WAIT_TIME_MS = 3000;

async function pressKey(page: Page, key: string) {
  await page.request.post(`${KEYBOARD_CONTROLLER_URL}/key/press`, {
    data: { key: key }
  });
  await page.waitForTimeout(WAIT_TIME_KB_MS);
}

async function typeText(page: Page, text: string) {
  await page.request.post(`${KEYBOARD_CONTROLLER_URL}/type`, {
    data: { text: text }
  });
  await page.waitForTimeout(WAIT_TIME_KB_MS);
}

async function comboKeys(page: Page, keys: string[]) {
  await page.request.post(`${KEYBOARD_CONTROLLER_URL}/key/combo`, {
    data: { keys: keys }
  });
  await page.waitForTimeout(WAIT_TIME_KB_MS);
}

export async function openFilePicker(page: Page, absFilePath: string) {
  const isMac = process.platform === 'darwin';
  if (isMac) await comboKeys(page, ["cmd", "shift", "g"]);
  else await comboKeys(page, ["ctrl", "l"]);

  // Type backspace to clear the input field
  await pressKey(page, "backspace");

  // Type the absolute file path
  await typeText(page, absFilePath);

  // Press Enter
  await pressKey(page, "enter");

  // Press Enter again to confirm the file selection on Mac
  if (isMac) await pressKey(page, "enter");

  await page.waitForTimeout(WAIT_TIME_MS);
}

export async function bypassWritePermission(page: Page) {
  // Tab twice to focus on "OK" button
  await pressKey(page, "tab");

  const isMac = process.platform === 'darwin'
  if (isMac) await pressKey(page, "tab");

  await pressKey(page, "enter");

  await page.waitForTimeout(WAIT_TIME_MS);
}
