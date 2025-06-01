const puppeteer = require('puppeteer');
const path = require('path');
const http = require('http');
const serveStatic = require('serve-static');

(async () => {
  const pathToExtension = path.resolve(__dirname);
  const browser = await puppeteer.launch({
    headless: false, // Keep headless false to see the browser
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });

  // Get the background page of the extension
  console.log('Attempting to find background service worker via targetcreated event...');
  let backgroundServiceWorker = null;

  // Listen for new targets being created
  browser.on('targetcreated', async (target) => {
    if (target.type() === 'service_worker') {
      const worker = await target.worker();
      if (worker && worker.url().includes('background.js')) {
        backgroundServiceWorker = worker;
        console.log('Background service worker found via targetcreated event.');
      }
    }
  });

  // Give some time for the service worker to be created and caught by the listener
  // This is a workaround as there's no direct waitForServiceWorker in older Puppeteer versions
  let attempts = 0;
  while (!backgroundServiceWorker && attempts < 10) { // Try for up to 10 * 1000ms = 10 seconds
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }

  if (!backgroundServiceWorker) {
    throw new Error('Failed to find background service worker after multiple attempts.');
  }

  // Listen for console messages from the background service worker
  const backgroundPage = await backgroundServiceWorker.evaluateHandle(() => self);
  console.log('Background service worker context obtained.');

  backgroundServiceWorker.on('console', (msg) => {
    console.log(`Background service worker console: ${msg.text()}`);
  });

  const page = await browser.newPage();

  // Listen for console messages from the page
  page.on('console', msg => {
    console.log(`Browser console: ${msg.text()}`);
  });

  // Setup a simple http server to serve the extension files
  const serve = serveStatic(path.resolve(__dirname), { 'index': ['test_email.html'] });

  const server = http.createServer((req, res) => {
    serve(req, res, (err) => {
      res.writeHead(err ? 500 : 404, { 'Content-Type': 'text/plain' });
      res.end(err ? err.message : 'Not Found');
    });
  }).listen(8080);

  console.log('HTTP server listening on port 8080');

  await page.goto('http://localhost:8080/test_email.html');

  // Inject content.js into the page
  await page.addScriptTag({ path: path.join(__dirname, 'content.js') });

  // Give some time for the content script to execute and the MutationObserver to trigger
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Now, let's check if the attachment detection worked by evaluating the DOM
  const detectedAttachmentsCount = await page.evaluate(() => {
    const attachmentLinks = document.querySelectorAll('a[download], div[role="link"][aria-label*="attachment"], span[data-file-name]');
    return attachmentLinks.length;
  });

  const detectedIconsCount = await page.evaluate(() => {
    const actionIcons = document.querySelectorAll('span[title="Click to manage password"]');
    return actionIcons.length;
  });

  if (detectedAttachmentsCount > 0 && detectedIconsCount === detectedAttachmentsCount) {
    console.log(`Puppeteer: Successfully detected ${detectedAttachmentsCount} attachments and inserted ${detectedIconsCount} action icons.`);

    // Simulate a click on the first action icon
    await page.click('span[title="Click to manage password"]');
    console.log('Puppeteer: Simulated click on the first action icon.');

    // Give some time for the message to be processed by the background script
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify the message was received by the background script by checking chrome.storage.local
    const storedDetails = await backgroundServiceWorker.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.storage.local.get('lastReceivedAttachmentDetails', (result) => {
          resolve(result.lastReceivedAttachmentDetails);
        });
      });
    });

    if (storedDetails && storedDetails.fileName === 'document.pdf') {
      console.log('Puppeteer: Background script successfully received and stored attachment details.');
    } else {
      console.error('Puppeteer: Background script DID NOT receive or store expected attachment details.');
      console.log('Stored details:', storedDetails);
    }

  } else {
    console.error(`Puppeteer: Failed to detect attachments or insert icons correctly. Detected attachments: ${detectedAttachmentsCount}, Inserted icons: ${detectedIconsCount}`);
  }

  await browser.close();
  server.close(); // Close the http server
})();