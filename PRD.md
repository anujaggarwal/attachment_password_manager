# AttachKey: Email Attachment Password Manager  

*Helps you recall passwords for encrypted email attachments.*  



## 1. Overview  

AttachKey is a Chrome extension for Gmail, Yahoo, Outlook Web, and similar webmail platforms. It allows users to:  

- Save passwords used to open encrypted attachments (PDFs, ZIPs, etc.)  

- Auto-suggest passwords when similar emails arrive (matching sender/subject)  

- Manually manage password associations  



**Key Differentiator**: Focuses exclusively on email attachments (unlike traditional password managers for websites).  



## 2. Target Use Cases  

- Monthly credit card statements (Axis, ICICI, HDFC)  

- Broker reports (Zerodha, Groww, Upstox)  

- Salary slips, insurance documents, investment statements  



## 3. Key Features  



### 🔍 Attachment Detection  

- Detects attachments (.pdf, .zip, .docx) via DOM parsing  

- Displays action icon next to attachments with options to:  

  - Save password  

  - View suggestions (if matched)  



### 💾 Password Management  

- **Manual rule creation**:  

  - Sender email (mandatory)  

  - Subject keyword/regex (optional)  

  - Filename pattern (optional)  

- **Secure storage**:  

  - AES encryption via WebCrypto API  

  - Chrome Storage (local/sync)  



### 💡 Password Suggestion  

- Auto-triggers when:  

  - Sender matches **AND**  

  - Subject matches (exact/keyword/fuzzy > threshold)  

- Displays:  

  - Masked password with "Copy" button  

  - Matching rule reference  



### 🧩 Extension Popup UI  

**1. Password Dashboard**  

- List of saved entries with:  

  - Masked passwords (toggle visibility)  

  - Sender, subject keywords, attachment patterns  

  - Last used timestamp  

  - Edit/delete controls  



**2. Rule Editor**  

- Form fields for:  

  - Sender email (exact match)  

  - Subject pattern (keywords/regex)  

  - Filename pattern  

  - Password  



**3. Activity Log (Optional)**  

- History of password suggestions  

- Timestamps and copy actions  



## 4. Additional Features  

| Feature | Purpose |  

|---------|---------|  

| Inline Suggestion Toggle | Temporarily disable suggestions |  

| Passphrase Unlock | Master password for session access |  

| Search & Filter | Quick rule management |  

| Clean-up Reminder | Review unused entries periodically |  



## 5. Workflow Examples  



### 📥 Saving a Password  

1. User opens email with protected PDF  

2. Extension shows attachment icon  

3. User clicks → enters password → confirms:  

   - Sender: `cc.statements@axisbank.com`  

   - Subject: "Axis Credit Card Statement"  



### 📤 Suggesting a Password  

1. New email from same sender arrives  

2. Extension detects match → shows:  

   `Suggested password: **** [Copy]`  



## 6. Technical Requirements  

**Frontend**  

- Content Scripts: DOM injection for email UIs  

- Popup UI: React/Vue dashboard  

- Options Page: Advanced settings  



**Backend**  

- Encryption: AES + optional passphrase derivation  

- Storage: `chrome.storage.local`/`sync`  

- Matching: Fuzzy string algorithms (Dice/Levenshtein)  



## 7. Security  

- 🔒 Passwords encrypted at rest  

- 🚫 No data leaves device (unless cloud sync enabled)  

- 🔑 Optional session-based master passphrase  



## 8. Non-Goals  

- ❌ Automated password guessing  

- ❌ Desktop file decryption  

- ❌ Cloud sync (by default)  



## 9. Success Metrics  

- 📈 Attachment match rate (%)  

- 📊 Number of active rules  

- 🖱️ Password copy actions  

- 📅 30/60/90-day user retention