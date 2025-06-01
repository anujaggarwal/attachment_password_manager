# AttachKey: Email Attachment Password Manager

*Helps you recall passwords for encrypted email attachments.*

## Overview

AttachKey is a Chrome extension designed for webmail platforms like Gmail, Yahoo, and Outlook Web. It simplifies the process of managing passwords for encrypted email attachments. Unlike traditional password managers, AttachKey focuses specifically on email attachments, providing a tailored solution for users who frequently encounter password-protected documents.

### Key Capabilities:

*   **Save Passwords**: Securely store passwords used to open encrypted attachments (e.g., PDFs, ZIPs).
*   **Auto-Suggest Passwords**: Automatically suggest relevant passwords when similar emails arrive, based on sender and subject matching.
*   **Manual Management**: Provides options to manually manage and edit password associations.

### Target Use Cases:

AttachKey is ideal for managing passwords for:

*   Monthly credit card statements (e.g., Axis, ICICI, HDFC)
*   Broker reports (e.g., Zerodha, Groww, Upstox)
*   Salary slips, insurance documents, and investment statements

## Features

### Attachment Detection

*   Detects common attachment types (.pdf, .zip, .docx) by parsing the Document Object Model (DOM).
*   Displays an action icon next to detected attachments, offering options to save passwords or view suggestions.

### Password Management

*   **Manual Rule Creation**: Users can define rules based on:
    *   Sender email (mandatory)
    *   Subject keyword/regex (optional)
    *   Filename pattern (optional)
*   **Secure Storage**: Passwords are encrypted using AES via the WebCrypto API and stored securely in Chrome's local/sync storage.

### Password Suggestion

*   **Automatic Trigger**: Suggestions are automatically triggered when both the sender and subject match (exact, keyword, or fuzzy matching).
*   **Display**: Shows a masked password with a "Copy" button and a reference to the matching rule.

### Extension Popup UI

1.  **Password Dashboard**: Lists all saved entries, including masked passwords (with toggle visibility), sender, subject keywords, attachment patterns, last used timestamp, and edit/delete controls.
2.  **Rule Editor**: Provides form fields for defining sender email, subject pattern, filename pattern, and password.

## Installation

To install AttachKey, follow these steps:

1.  **Download the Extension**: Clone or download this repository to your local machine.
2.  **Open Chrome Extensions**: Navigate to `chrome://extensions/` in your Chrome browser.
3.  **Enable Developer Mode**: Toggle on "Developer mode" in the top right corner.
4.  **Load Unpacked**: Click on "Load unpacked" and select the directory where you downloaded the extension.
5.  **Pin the Extension**: For easy access, pin the AttachKey icon to your Chrome toolbar.

## Usage

### Saving a Password

1.  Open an email containing a password-protected attachment.
2.  AttachKey will display an action icon next to the attachment.
3.  Click the icon, enter the password, and confirm to save it. The extension will associate the password with the sender and subject of the email.

### Suggesting a Password

1.  When a new email from a previously saved sender arrives, AttachKey will detect it.
2.  The extension will automatically suggest the associated password, displayed as `Suggested password: **** [Copy]`.
3.  Click "Copy" to quickly get the password to your clipboard.

## Technical Details

*   **Frontend**: Utilizes Content Scripts for DOM injection in email UIs and a Popup UI for the dashboard.
*   **Backend**: Features AES encryption, `chrome.storage.local`/`sync` for storage, and fuzzy string matching algorithms for password suggestions.

## Security

*   **Encrypted Passwords**: All passwords are encrypted at rest.
*   **Local Data Storage**: No data leaves your device unless cloud sync is explicitly enabled.
*   **Optional Master Passphrase**: Supports an optional session-based master passphrase for enhanced security.

## Non-Goals

*   Automated password guessing.
*   Desktop file decryption.

