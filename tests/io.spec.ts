import { test, expect, Page } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

import { chromium, Browser, BrowserContext } from 'playwright';
import { openFilePicker, bypassWritePermission } from './helpers';

const path = require('path');

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