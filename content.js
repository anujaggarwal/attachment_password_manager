console.debug("AttachKey content script loaded.");

// Function to detect attachments and insert action icons
function detectAttachments() {
  const attachments = document.querySelectorAll('a[download], div[role="link"][aria-label*="attachment"], span[data-file-name], div.aQA span.aV3');
  let detectedAttachmentsCount = 0;
  let insertedIconsCount = 0;

  if (attachments.length > 0) {
    console.debug(`Detected ${attachments.length} potential attachments.`);
    attachments.forEach((link, index) => {
      console.debug(`Attachment ${index + 1}:`, link.outerHTML);

      // Check if an action icon already exists for this attachment
      if (link.nextElementSibling && link.nextElementSibling.classList.contains('attachkey-action-icon')) {
        return; // Skip if icon already exists
      }

      // Create the action icon element
      const actionIcon = document.createElement('span');
      actionIcon.textContent = ' 🔑'; // Key emoji
      actionIcon.style.cursor = 'pointer';
      actionIcon.classList.add('attachkey-action-icon'); // Add a class for easy identification
      actionIcon.title = 'Click to manage password';

      // Add click event listener to the action icon
      actionIcon.addEventListener('click', () => {
        console.debug('Action icon clicked for:', link.outerHTML);

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

        if (chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            action: 'attachmentClicked',
            details: details
          });
        } else {
          console.error('chrome.runtime or chrome.runtime.sendMessage is undefined. Cannot send message.');
        }

      });

      // Insert the icon next to the attachment link
      // For span elements, insert after the span itself
      if (link.tagName === 'SPAN') {
        link.parentNode.insertBefore(actionIcon, link.nextSibling);
      } else {
        link.parentNode.insertBefore(actionIcon, link.nextSibling);
      }
      insertedIconsCount++;

      detectedAttachmentsCount++;
    });

    console.debug(`Successfully detected ${detectedAttachmentsCount} attachments and inserted ${insertedIconsCount} action icons.`);
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
