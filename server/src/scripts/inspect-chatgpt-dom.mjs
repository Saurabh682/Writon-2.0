import { chromium } from 'playwright';

async function inspectChatPage() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const pages = context.pages();
  const page = pages.find(p => p.url().includes('chatgpt.com')) || pages[0];

  console.log(`Inspecting page: [${await page.title()}] ${page.url()}`);

  // Look for input elements
  const textarea = await page.$('#prompt-textarea, textarea, div[contenteditable="true"]');
  console.log('Found input element:', textarea ? 'YES' : 'NO');
  if (textarea) {
    const tagName = await textarea.evaluate(el => el.tagName);
    const id = await textarea.evaluate(el => el.id);
    const isContentEditable = await textarea.evaluate(el => el.isContentEditable);
    console.log(`Input tag: <${tagName} id="${id}" contenteditable="${isContentEditable}">`);
  }

  // Look for send button
  const sendButton = await page.$('button[data-testid="send-button"], button[aria-label="Send prompt"], button[aria-label="Send message"]');
  console.log('Found send button:', sendButton ? 'YES' : 'NO');
}

inspectChatPage().catch(err => console.error('Inspect error:', err.message));
