console.debug("AttachKey: background script starting...");

chrome.runtime.onInstalled.addListener(() => {
  console.debug('AttachKey background service worker installed.');
});

// --- Encryption/Decryption Functions ---
let encryptionKeyPromise;

// Function to normalize email subjects for fuzzy matching
function normalizeSubject(subject) {
  // Convert to lowercase
  let normalized = subject.toLowerCase();

  // Remove month names and numbers
  normalized = normalized.replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/g, '');
  normalized = normalized.replace(/\b\d{1,}\b/g, ''); // Remove any numbers

  // Remove specific phrases that vary with dates, but keep core identifying words
  normalized = normalized.replace(/\bfor the period\s*|\s*to\s*|\s*ending\s*/g, ' '); // Remove 'for the period', 'to', 'ending' with surrounding spaces

  // Remove punctuation and extra spaces
  normalized = normalized.replace(/[^a-z\s]/g, ''); // Keep only letters and spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}



function getEncryptionKey() { // No longer async, returns a promise synchronously
  if (!encryptionKeyPromise) {
    console.debug('getEncryptionKey: Initializing new key promise.');
    encryptionKeyPromise = (async () => {
      console.debug('getEncryptionKey: Running key initialization logic...');
      const storedKeyData = await chrome.storage.local.get('encryptionKey');
      if (storedKeyData.encryptionKey) {
        console.debug('getEncryptionKey: Found stored encryptionKey, importing...');
        const importedKey = await crypto.subtle.importKey(
          'jwk',
          storedKeyData.encryptionKey,
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );
        console.debug('getEncryptionKey: EncryptionKey imported.');
        return importedKey;
      } else {
        console.debug('getEncryptionKey: No stored encryptionKey found, generating new key...');
        const newKey = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          true, // extractable
          ['encrypt', 'decrypt']
        );
        const exportedKey = await crypto.subtle.exportKey('jwk', newKey);
        await chrome.storage.local.set({ encryptionKey: exportedKey });
        console.debug('getEncryptionKey: New encryptionKey generated and stored.');
        return newKey;
      }
    })().catch(error => {
      console.error('getEncryptionKey: Critical error during key initialization:', error);
      encryptionKeyPromise = null; // Reset on error to allow future attempts
      throw error; // Re-throw to propagate the error to callers
    });
  } else {
    console.debug('getEncryptionKey: Returning existing key promise.');
  }
  return encryptionKeyPromise;
}

async function encrypt(text) {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // IV should be unique for each encryption
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    enc.encode(text)
  );
  const encryptedArray = new Uint8Array(encrypted);
  const result = new Uint8Array(iv.length + encryptedArray.length);
  result.set(iv, 0);
  result.set(encryptedArray, iv.length);

  // Convert Uint8Array to a binary string, then Base64 encode
  const binaryString = String.fromCharCode.apply(null, result);
  return btoa(binaryString);
}

async function decrypt(encryptedBase64) {
  const key = await getEncryptionKey();
  // Base64 decode to binary string, then convert to Uint8Array
  const binaryString = atob(encryptedBase64);
  const decoded = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    decoded[i] = binaryString.charCodeAt(i);
  }

  const iv = decoded.slice(0, 12);
  const encrypted = decoded.slice(12);
  const dec = new TextDecoder();
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encrypted
  );
  return dec.decode(decrypted);
}
// --- End Encryption/Decryption Functions ---

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => { // Made listener async
  if (request.action === 'attachmentClicked') {
    chrome.storage.local.set({ lastReceivedAttachmentDetails: request.details }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error setting storage:', chrome.runtime.lastError.message);
      } else {
        console.debug('Attachment details stored in local storage:', request.details);
      }
    });
    self.lastReceivedAttachmentDetails = request.details; // Set a global variable for testing
    console.debug('Attachment clicked message received in background script:', request.details);
    console.debug('Email Subject:', request.details.emailSubject);
    console.debug('Email Sender:', request.details.emailSender);

    // Open the popup and pass attachment details
    const encodedDetails = encodeURIComponent(JSON.stringify(request.details));
    chrome.windows.create({
      url: chrome.runtime.getURL(`popup.html?details=${encodedDetails}`),
      type: 'popup',
      width: 350,
      height: 350
    }).then(async (window) => {
      // Retrieve password after popup is created and send it to the popup
      const originalSubject = request.details.emailSubject;
      const normalizedSubject = normalizeSubject(originalSubject);
      console.debug(`Retrieval: Original Subject: "${originalSubject}", Normalized Subject: "${normalizedSubject}"`);
  const passwordKey = `password_${normalizedSubject}_${request.details.emailSender}`;
      console.debug(`Retrieval: Password Key: "${passwordKey}"`);
      chrome.storage.local.get(passwordKey, async (result) => {
        if (chrome.runtime.lastError) {
          console.error('Error retrieving password from storage:', chrome.runtime.lastError.message);
          // Even if error, still send success response to content script
          sendResponse({ status: 'success', message: 'Popup opened, but failed to retrieve password.' });
          return;
        }
        const encryptedPassword = result[passwordKey];
        if (encryptedPassword) {
          try {
            const decryptedPassword = await decrypt(encryptedPassword);

            // Send decrypted password to the popup with a slight delay
            if (window.tabs && window.tabs[0]) {
              const tabId = window.tabs[0].id;
              setTimeout(() => {
                chrome.tabs.sendMessage(tabId, {
                  action: 'displayPassword',
                  password: decryptedPassword
                });
              }, 100); // 100ms delay to allow popup to load
            }
          } catch (e) {
            console.error('Decryption failed when sending to popup:', e);
          }
        }
        sendResponse({ status: 'success', message: 'Popup opened and password retrieval initiated.' });
      });
    }).catch(error => {
      console.error('Error creating window:', error);
      sendResponse({ status: 'error', message: 'Failed to open popup: ' + error.message });
    });
  } else if (request.action === 'savePassword') {

    // Here, you would implement the logic to securely store the password
    // For now, we'll just acknowledge it.
    
    // Generate a unique key for the password based on email context and attachment
    const originalSubject = request.details.emailSubject;
    const normalizedSubject = normalizeSubject(originalSubject);
    console.debug(`Save: Original Subject: "${originalSubject}", Normalized Subject: "${normalizedSubject}"`);
    const passwordKey = `password_${normalizedSubject}_${request.details.emailSender}`;
    console.debug(`Save: Password Key: "${passwordKey}"`);

    // Immediately send a response to prevent message port closure
    sendResponse({ status: 'received', message: 'Save request received.' });

    try {
      const encryptedPassword = await encrypt(request.password);
      await chrome.storage.local.set({ [passwordKey]: encryptedPassword });

      // After async operation, send a separate message back to the popup
      const responseStatus = chrome.runtime.lastError ? 'error' : 'success';
      const responseMessage = chrome.runtime.lastError ?
        `Failed to save encrypted password: ${chrome.runtime.lastError.message}` :
        'Encrypted password saved!';

      if (sender.tab && sender.tab.id) {
        // Send final status via chrome.runtime.sendMessage
        chrome.runtime.sendMessage({
          action: 'passwordSaveStatus',
          status: responseStatus,
          message: responseMessage,
          passwordToCopy: responseStatus === 'success' ? request.password : undefined // Include password only on success
        });
      }
    } catch (e) {
      console.error('Encryption failed:', e);
      if (sender.tab && sender.tab.id) {
        chrome.tabs.sendMessage(sender.tab.id, {
          action: 'passwordSaveStatus',
          status: 'error',
          message: `Encryption failed: ${e.message}`
        });
      }
    }
  } else if (request.action === 'retrievePassword') {
    console.debug('Retrieve password message received from popup for key:', request.passwordKey);
    chrome.storage.local.get(request.passwordKey, async (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error retrieving password from storage:', chrome.runtime.lastError.message);
        sendResponse({ status: 'error', message: 'Failed to retrieve password.' });
        return;
      }
      const encryptedPassword = result[request.passwordKey];
      if (encryptedPassword) {
        try {
          const decryptedPassword = await decrypt(encryptedPassword);

          sendResponse({ status: 'received', message: 'Save request received.' });
        } catch (e) {
          console.error('Decryption failed:', e);
          sendResponse({ status: 'error', message: 'Decryption failed.' });
        }
      } else {
        sendResponse({ status: 'success', password: null }); // No password found
      }
    });
  }
  return true; // Indicate that sendResponse will be called asynchronously
});
// This script will handle events and manage the extension's state.
