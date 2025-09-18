import { test, expect, Page } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

import { chromium, Browser, BrowserContext } from 'playwright';

const path = require('path');

const KEYBOARD_CONTROLLER_PORT = 5001;
const KEYBOARD_CONTROLLER_URL = `http://localhost:${KEYBOARD_CONTROLLER_PORT}`;
const WAIT_TIME_KB_MS = 1000;
const WAIT_TIME_MS = 3000;

let browser: Browser;
let context: BrowserContext;
let page: Page;

let fileSystemAccessSupported = false;

test.beforeAll(async () => {
  browser = await chromium.launch({ headless: false });
  context = await browser.newContext();
  page = await context.newPage();

  const tempFolderPath = path.resolve(__dirname, `../temp/`);
  if (!require('fs').existsSync(tempFolderPath)) {
    require('fs').mkdirSync(tempFolderPath);
  }
});

test.beforeEach(async () => {
  await page.goto('https://googlechromelabs.github.io/text-editor/');

  fileSystemAccessSupported = await page.evaluate(() => {
    return 'showOpenFilePicker' in window;
  });
});

test.afterAll(async () => {
  // await page.request.post(`${KEYBOARD_CONTROLLER_URL}/shutdown`);
  await context.close();
  await browser.close();
});

test('should display "text editor" on the page', async () => {
  const content = await page.textContent('body');
  expect(content?.toLowerCase()).toContain('text editor');
});

async function openFilePicker(page: Page, absFilePath: string) {
  const isMac = process.platform === 'darwin'
  if (isMac) {
    // Press Cmd+Shift+G
    await page.request.post(`${KEYBOARD_CONTROLLER_URL}/key/combo`, {
      data: { keys: ["cmd", "shift", "g"] }
    });
  } else {
    // Press Ctrl+L
    await page.request.post(`${KEYBOARD_CONTROLLER_URL}/key/combo`, {
      data: { keys: ["ctrl", "l"] }
    });
  }

  await page.waitForTimeout(WAIT_TIME_KB_MS);

  // Type backspace to clear the input field
  await page.request.post(`${KEYBOARD_CONTROLLER_URL}/key/press`, {
    data: { key: "Backspace" }
  });

  await page.waitForTimeout(WAIT_TIME_KB_MS);

  // Type the absolute file path
  await page.request.post(`${KEYBOARD_CONTROLLER_URL}/type`, {
    data: { text: absFilePath }
  });

  await page.waitForTimeout(WAIT_TIME_KB_MS);

  // Press Enter
  await page.request.post(`${KEYBOARD_CONTROLLER_URL}/key/press`, {
    data: { key: "enter" }
  });

  await page.waitForTimeout(WAIT_TIME_KB_MS);

  if (isMac) {
    // Press Enter again to confirm the file selection on Mac
    await page.request.post(`${KEYBOARD_CONTROLLER_URL}/key/press`, {
      data: { key: "enter" }
    });
  }

  await page.waitForTimeout(WAIT_TIME_MS);
}

async function bypassWritePermission(page: Page) {
  // Tab twice to focus on "OK" button
  await page.request.post(`${KEYBOARD_CONTROLLER_URL}/key/press`, {
    data: { key: 'tab' }
  });

  await page.waitForTimeout(WAIT_TIME_KB_MS);

  const isMac = process.platform === 'darwin'
  if (isMac) {
    await page.request.post(`${KEYBOARD_CONTROLLER_URL}/key/press`, {
      data: { key: 'tab' }
    });
    
    await page.waitForTimeout(WAIT_TIME_KB_MS);
  }

  await page.request.post(`${KEYBOARD_CONTROLLER_URL}/key/press`, {
    data: { key: 'enter' }
  });

  await page.waitForTimeout(WAIT_TIME_MS);
}

test('should open file picker', async () => {
  test.skip(!fileSystemAccessSupported, 'File System Access API is not supported in this browser');

  await page.locator('#butFile').click();
  await page.locator('#butOpen').click();

  const absFilePath = path.resolve(__dirname, '../sample.txt');
  // console.debug(absFilePath);
  await openFilePicker(page, absFilePath);

  // Verify that the content of the file is displayed in the text editor
  const editorContent = await page.locator('#textEditor').inputValue();
  expect(editorContent).toContain('This is a sample text file');
})

test('should save new file', async () => {
  test.skip(!fileSystemAccessSupported, 'File System Access API is not supported in this browser');

  const editor = page.locator('#textEditor');
  await editor.fill('Hello, World!');

  await page.locator('#butFile').click();
  await page.locator('#butSave').click();

  const newUuid = uuidv4();
  // console.debug('Generated UUID:', newUuid);
  const absFilePath = path.resolve(__dirname, `../temp/${newUuid}.txt`);
  // console.debug(absFilePath);
  await openFilePicker(page, absFilePath);

  // Verify that the file has been saved with the correct content
  const fs = require('fs');
  const savedContent = fs.readFileSync(absFilePath, 'utf8');
  expect(savedContent).toBe('Hello, World!');
});

test('should save existing file', async () => {
  test.skip(!fileSystemAccessSupported, 'File System Access API is not supported in this browser');

  const newUuid = uuidv4();
  const newFilePath = path.resolve(__dirname, `../temp/${newUuid}.txt`);
  const originFilePath = path.resolve(__dirname, '../sample.txt');

  const fs = require('fs');
  fs.copyFileSync(originFilePath, newFilePath);

  await page.locator('#butFile').click();
  await page.locator('#butOpen').click();
  await openFilePicker(page, newFilePath);

  const editor = page.locator('#textEditor');
  await editor.fill('Updated content');

  await page.locator('#butFile').click();
  await page.locator('#butSave').click();

  await bypassWritePermission(page);

  // Verify that the file has been updated with the new content
  const savedContent = fs.readFileSync(newFilePath, 'utf8');
  expect(savedContent).toBe('Updated content');
});