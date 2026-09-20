import { chromium } from 'playwright';

async function testConnection() {
  console.log('Attempting to connect to browser on http://localhost:9222...');
  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    console.log('Connected successfully!');
    const contexts = browser.contexts();
    console.log(`Contexts: ${contexts.length}`);
    const pages = contexts[0].pages();
    console.log(`Pages open: ${pages.length}`);
    for (const p of pages) {
      console.log(` - [${await p.title()}] ${p.url()}`);
    }
  } catch (err) {
    console.log(`Connection failed: ${err.message}`);
  }
}

testConnection();
