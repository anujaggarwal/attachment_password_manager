document.addEventListener('DOMContentLoaded', () => {

  const passwordInput = document.getElementById('passwordInput');
  const toggleSavePasswordVisibility = document.getElementById('toggleSavePasswordVisibility');
  const saveButton = document.getElementById('saveButton');
  const cancelButton = document.getElementById('cancelButton');

  const savePasswordSection = document.getElementById('savePasswordSection');
  const foundPasswordSection = document.getElementById('foundPasswordSection');
  const foundPasswordInput = document.getElementById('foundPasswordInput');
  const togglePasswordVisibility = document.getElementById('togglePasswordVisibility');
  const copyButton = document.getElementById('copyButton');
  const editButton = document.getElementById('editButton');

  let currentAttachmentDetails = null;

  // Get attachment details from background script via URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const encodedDetails = urlParams.get('details');

  if (encodedDetails) {
    try {
      currentAttachmentDetails = JSON.parse(decodeURIComponent(encodedDetails));
    } catch (e) {
      console.error('Error parsing attachment details:', e);
    }
  }

  if (currentAttachmentDetails) {
    // The background script will send the password directly to the popup.
    // The popup will listen for a 'displayPassword' message.
  }

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'displayPassword') {
      if (request.password) {
        foundPasswordInput.value = request.password;
        foundPasswordInput.type = 'password'; // Mask the password by default
        foundPasswordSection.style.display = 'block';
        savePasswordSection.style.display = 'none';

      } else {
        foundPasswordSection.style.display = 'none';
        savePasswordSection.style.display = 'block';
        console.debug('Popup: displayPassword message received, but no password provided. Showing save section.');
      }
    }
  });

  // Listener for final password save status from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'passwordSaveStatus') {
      console.debug('Popup: Received final password save status:', request);
      if (request.status === 'success') {
        console.debug('Popup: Password saved successfully.');
        window.close();
      } else {
        console.error('Popup: Failed to save password:', request.message);
        document.getElementById('errorMessage').textContent = request.message;
        document.getElementById('errorMessage').style.display = 'block';
      }
    }
  });

  saveButton.addEventListener('click', () => {
    const password = passwordInput.value;
    navigator.clipboard.writeText(password).then(() => {
      console.debug('Popup: Successfully copied password to clipboard on save button click!');
    }).catch(err => {
      console.error('Popup: Failed to copy password to clipboard on save button click. Error:', err);
      // Display error to user if clipboard copy fails
      document.getElementById('errorMessage').textContent = 'Failed to copy password to clipboard. Please copy manually.';
      document.getElementById('errorMessage').style.display = 'block';
    });

    chrome.runtime.sendMessage({
      action: 'savePassword',
      details: currentAttachmentDetails,
      password: password
    }, (response) => {
      console.debug('Popup: Received immediate response from background (save request received):', response);
      if (response && response.status === 'received') {
        console.debug('Popup: Save request acknowledged by background. Waiting for final status...');
        // Do not close the window here. Wait for the second message.
      } else {
        console.error('Popup: Unexpected immediate response from background:', response ? response.message : 'No response');
        // Optionally, provide user feedback about the failure
      }
    });
  });

  cancelButton.addEventListener('click', () => {
    console.debug('Password management cancelled.');
    window.close();
  });

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(foundPasswordInput.value);
      const originalText = copyButton.textContent;
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = originalText;
      }, 1500);
      console.debug('Password copied to clipboard.');
      window.close();
    } catch (err) {
      console.error('Failed to copy password: ', err);
    }
  });

  editButton.addEventListener('click', () => {
    passwordInput.value = foundPasswordInput.value;
    savePasswordSection.style.display = 'block';
    foundPasswordSection.style.display = 'none';
    console.debug('Switched to edit mode.');
  });

  togglePasswordVisibility.addEventListener('click', () => {
    if (foundPasswordInput.type === 'password') {
      foundPasswordInput.type = 'text';
      togglePasswordVisibility.innerHTML = '&#128064;'; // Crossed-out eye icon
    } else {
      foundPasswordInput.type = 'password';
      togglePasswordVisibility.innerHTML = '&#128065;'; // Open eye icon
    }
  });

  toggleSavePasswordVisibility.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      toggleSavePasswordVisibility.innerHTML = '&#128064;'; // Crossed-out eye icon
    } else {
      passwordInput.type = 'password';
      toggleSavePasswordVisibility.innerHTML = '&#128065;'; // Open eye icon
    }
  });
});
