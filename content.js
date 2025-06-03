console.debug("AttachKey content script loaded.");

// Create a fixed-position container for the action button
const fixedButtonContainer = document.createElement('div');
fixedButtonContainer.id = 'attachkey-fixed-button-container';
fixedButtonContainer.style.cssText = `
  position: fixed;
  top: 10px; /* Adjust as needed */
  right: 10px; /* Adjust as needed */
  z-index: 9999; /* Ensure it's on top */
  display: none; /* Hidden by default */
  background-color: #0b57d0; /* Blue background */
  color: white;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
`;
fixedButtonContainer.textContent = 'Manage Attachment Password';

let currentDetectedAttachmentDetails = null; // To store details of the first detected attachment

fixedButtonContainer.addEventListener('click', () => {
  if (currentDetectedAttachmentDetails && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({
      action: 'attachmentClicked',
      details: currentDetectedAttachmentDetails
    });
  } else {
    console.error('No attachment details to send or chrome.runtime is undefined.');
  }
});

document.body.appendChild(fixedButtonContainer);


// Function to detect attachments and insert action icons
function detectAttachments() {
  const attachments = document.querySelectorAll('a[download], div[role="link"][aria-label*="attachment"], span[data-file-name], div.aQA span.aV3, span.aV3');
  let detectedAttachmentsCount = 0;
  let insertedIconsCount = 0;

  if (attachments.length > 0) {
    console.debug(`Detected ${attachments.length} potential attachments.`);
    attachments.forEach((link, index) => {
      console.debug(`Attachment ${index + 1}:`, link.outerHTML);

      // Function to get email subject and sender
      function getEmailContext() {
        let subject = '';
        let sender = '';

        // Try to get subject (common Gmail selector for subject line)
        const subjectElement = document.querySelector('h2.hP');
        if (subjectElement) {
          subject = subjectElement.textContent.trim();
        }

        // Try to get sender
        // Based on provided HTML, target span with class 'gD' and 'email' attribute
        const senderElement = document.querySelector('span.gD[email]');
        if (senderElement) {
          sender = senderElement.getAttribute('email') || senderElement.textContent.trim();
        } else {
          // Fallback for other common Gmail sender elements if the above doesn't work universally
          const fallbackSenderElement = document.querySelector('.gD [email], .gD .go, .gD .g2');
          if (fallbackSenderElement) {
            sender = fallbackSenderElement.getAttribute('email') || fallbackSenderElement.textContent.trim();
          } else {
            const senderNameElement = document.querySelector('.gD span[name]');
            if (senderNameElement) {
              sender = senderNameElement.getAttribute('name') || senderNameElement.textContent.trim();
            }
          }
        }
        return { subject, sender };
      }

      const emailContext = getEmailContext();

      let details = {
        text: link.textContent.trim(),
        href: link.href || '',
        fileName: link.getAttribute('download') || link.getAttribute('data-file-name') || link.textContent.trim(),
        emailSubject: emailContext.subject,
        emailSender: emailContext.sender
      };

      // Special handling for Gmail attachments (div.aQA span.aV3)
      if (link.tagName === 'SPAN' && link.classList.contains('aV3') && link.closest('div.aQA')) {
        details.fileName = link.textContent.trim();
      }

      // Store the details of the first detected attachment
      if (detectedAttachmentsCount === 0) {
        currentDetectedAttachmentDetails = details;
      }
      detectedAttachmentsCount++;
    });

    // Show the fixed button if attachments are detected
    fixedButtonContainer.style.display = 'block';
    console.debug(`Successfully detected ${detectedAttachmentsCount} attachments. Fixed button shown.`);
  } else {
    // Hide the fixed button if no attachments are detected
    fixedButtonContainer.style.display = 'none';
    currentDetectedAttachmentDetails = null;
    console.debug('No attachments detected. Fixed button hidden.');
  }
}

// Use MutationObserver to detect dynamically added content
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length > 0) {
      detectAttachments();
    }
  });
});

// Start observing the document body for changes
observer.observe(document.body, { childList: true, subtree: true });

// Initial call to detect attachments on page load
detectAttachments();
