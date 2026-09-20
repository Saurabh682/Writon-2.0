import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { renderWritOnEmail } from '../services/email-foundation.js';

const folder = new URL('../../../docs/email/preview/', import.meta.url);
await mkdir(folder, { recursive: true });
const samples = [
  ['verification', 'Confirm your email', 'Confirm this address for your WritOn account.', 'Confirm email'],
  ['password-reset', 'Reset your password', 'You asked to reset your WritOn password. Use the link below to choose a new one.', 'Reset password'],
  ['welcome', 'Welcome to WritOn', 'Start with a story, or write your first line. There is no need to do both today.', 'Open WritOn'],
  ['digest', 'Your weekly reading', 'A few stories for whenever you have time to read.', 'Explore stories'],
  ['activity', 'Activity on your writing', 'Your weekly activity summary will appear here when there is something new to share.', 'View your writing'],
  ['return', 'Something to read, when you feel like it', 'Your reading can wait until you have time. Here is a place to begin again.', 'Explore stories'],
];
for (const [type, title, intro, actionLabel] of samples) {
  const email = renderWritOnEmail({ type, title, intro, actionLabel,
    actionUrl: 'https://example.com/preview-only', preferencesUrl: 'https://example.com/preferences-preview',
    unsubscribeUrl: 'https://example.com/unsubscribe-preview', postalAddress: 'PREVIEW ONLY — replace with verified sender postal address',
  });
  await writeFile(new URL(`${type}.html`, folder), email.html);
  await writeFile(new URL(`${type}.txt`, folder), email.text);
}
await writeFile(new URL('index.html', folder), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WritOn email previews</title><body style="background:#FAF5EE;color:#30271F;font:18px/1.7 Georgia,serif;max-width:720px;margin:48px auto;padding:16px"><h1>WritOn email previews</h1><p>Design samples only. Links are placeholders. No emails have been sent.</p><ul>${samples.map(([type, title]) => `<li><a style="color:#9C3E1D" href="${type}.html">${title}</a> · <a href="${type}.txt">Plain text</a></li>`).join('')}</ul></body></html>`);
console.log(`Email previews written to ${fileURLToPath(folder)}. No delivery attempted.`);
