#!/usr/bin/env node
/**
 * Standalone CLI Publisher for WhatsApp Business Cloud API.
 *
 * Usage:
 *   node scripts/whatsapp_publisher.mjs --dry-run
 *   node scripts/whatsapp_publisher.mjs --to="+918178055817" --template="writon_story_invite"
 *   node scripts/whatsapp_publisher.mjs --to="+918178055817" --text="Hello from WritOn"
 */

import { WhatsAppClient } from '../server/src/services/whatsapp-client.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    to: process.env.WHATSAPP_TEST_RECIPIENT || '918178055817',
    text: null,
    template: 'writon_craft_story',
    card: 'https://writon.cc/cards/whatsapp_tactile_sanctuary.png',
    quote: 'Perhaps the most radical feature of a book is that nothing happens when you touch the page.',
    slug: 'the-tactile-sanctuary',
  };

  for (const arg of args) {
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg.startsWith('--to=')) options.to = arg.split('=')[1];
    else if (arg.startsWith('--text=')) options.text = arg.split('=')[1];
    else if (arg.startsWith('--template=')) options.template = arg.split('=')[1];
    else if (arg.startsWith('--card=')) options.card = arg.split('=')[1];
  }

  return options;
}

async function main() {
  const options = parseArgs();
  console.log('📱 WritOn WhatsApp Publisher Agent');
  console.log('-----------------------------------');
  console.log(`Recipient: ${options.to}`);
  console.log(`Mode: ${options.dryRun ? 'DRY-RUN (Safe Simulation)' : 'LIVE DISPATCH'}`);

  const client = new WhatsAppClient();

  if (options.dryRun) {
    console.log('\n[DRY RUN PREVIEW]');
    if (options.text) {
      console.log(`Type: Freeform Text\nBody: ${options.text}`);
    } else {
      console.log(`Type: Pre-Approved Template [${options.template}]`);
      console.log(`Header Media: ${options.card}`);
      console.log(`Body Quote: "${options.quote}"`);
      console.log(`CTA Action: Visit https://writon.cc/play`);
    }
    console.log('\n✅ Dry run validation successful. Zero live messages dispatched.');
    return;
  }

  if (!client.isConfigured()) {
    console.error('❌ Error: Missing WhatsApp credentials in environment (WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID)');
    process.exit(1);
  }

  try {
    let result;
    if (options.text) {
      result = await client.sendTextMessage({
        to: options.to,
        text: options.text,
      });
    } else {
      result = await client.sendTemplateMessage({
        to: options.to,
        templateName: options.template,
        headerImageUrl: options.card,
        bodyParameters: [options.quote],
        buttonParameters: [options.slug],
      });
    }

    console.log('✅ Message dispatched successfully!');
    console.log(`Message ID: ${result.messageId}`);
  } catch (err) {
    console.error(`❌ Failed to send WhatsApp message: ${err.message}`);
    if (err.data) {
      console.error(JSON.stringify(err.data, null, 2));
    }
    process.exit(1);
  }
}

main();
