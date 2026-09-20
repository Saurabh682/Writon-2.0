import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
import { mkdir, writeFile } from 'node:fs/promises';
import { renderWritOnEmail } from '../services/email-foundation.js';
import { renderWelcome } from '../email/render/welcome.js';
import { renderWeeklyDigest } from '../email/render/weekly-digest.js';
import { createResendClient } from '../email/resend-client.js';

// Parse CLI flags: --to=<email>, --key=<resend_key>, --from=<sender>, --dry-run
const args = process.argv.slice(2);
function getArg(prefix, fallback = null) {
  const match = args.find(a => a.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

const targetEmail = getArg('--to=', 'saurabh.682@gmail.com').trim().toLowerCase();
const apiKey = getArg('--key=', process.env.RESEND_API_KEY || '').trim();
const fromAddress = getArg('--from=', process.env.WRITON_EMAIL_FROM || 'WritOn <hello@mail.writon.cc>').trim();
const replyTo = getArg('--reply-to=', process.env.WRITON_EMAIL_REPLY_TO || 'support@writon.cc').trim();
const isDryRun = args.includes('--dry-run') || !apiKey;

const postalAddress = 'WritOn Publishing Inc., 120 Koramangala 4th Block, Bengaluru, KA 560034';
const prefsUrl = 'https://writon.cc/settings/email?token=sample_demo';
const unsubUrl = 'https://writon.cc/email/unsubscribe?token=sample_demo';

console.log(`\n======================================================`);
console.log(`✉️  WritOn Sample Email Dispatcher`);
console.log(`======================================================`);
console.log(`Target Recipient : ${targetEmail}`);
console.log(`From Address     : ${fromAddress}`);
console.log(`Reply-To         : ${replyTo}`);
console.log(`Resend API Key   : ${apiKey ? apiKey.slice(0, 6) + '...' + apiKey.slice(-4) : '(none provided)'}`);
console.log(`Mode             : ${isDryRun ? 'DRY-RUN (HTML/Text Previews Only)' : 'LIVE DISPATCH VIA RESEND'}`);
console.log(`======================================================\n`);

// Build sample data for all 8 template variations
export function buildSampleEmails(recipient = targetEmail) {
  const localPart = recipient.split('@')[0] || 'Reader';
  const rawFirstName = localPart.split('.')[0].split('_')[0] || localPart;
  const capitalizedName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1);

  const verification = renderWritOnEmail({
    type: 'verification',
    title: 'Confirm your email',
    intro: `Welcome to WritOn, ${capitalizedName}. Confirm this address to activate your account and begin publishing.`,
    actionLabel: 'Confirm email',
    actionUrl: 'https://writon.cc/auth/verify?token=sample_verify_token_123',
    locale: 'en',
  });

  const passwordReset = renderWritOnEmail({
    type: 'password-reset',
    title: 'Reset your password',
    intro: `We received a request to reset your WritOn password for ${recipient}. Use the secure button below to choose a new one.`,
    actionLabel: 'Reset password',
    actionUrl: 'https://writon.cc/auth/reset-password?token=sample_reset_token_456',
    locale: 'en',
  });

  const welcomeEngagement = renderWelcome({
    tip: {
      title: 'Craft Principle: Write Your Opening Sentence Last',
      body: 'Don\'t let the first line stall your draft. Begin in the middle of the scene with a tactile detail, and write the opening hook once the core observation is established.',
    },
    actionLabel: 'Explore Stories',
    actionUrl: 'https://writon.cc/#explore',
    unsubscribeUrl: unsubUrl,
  });

  const readingDigest = renderWritOnEmail({
    type: 'digest',
    title: 'Your weekly reading',
    intro: `A few handpicked stories curated for you from the WritOn community this week.`,
    actionLabel: 'Explore all stories',
    actionUrl: 'https://writon.cc/explore',
    stories: [
      {
        title: 'The Geometry of Diminishing Returns',
        author: 'Aarav Mehta',
        readingMinutes: 4,
        excerpt: 'With faster hardware in our hands, speed should expand the performance budget we return to users, not the bloat we are allowed to hide.',
        url: 'https://writon.cc/stories/the-geometry-of-diminishing-returns-ef82cc76-4d0',
      },
      {
        title: 'The Number That Changes Before Lunch',
        author: 'Priyanka Mishra',
        readingMinutes: 5,
        excerpt: 'In a quiet dining room in Varanasi, a retired father checks his mutual fund NAV—revealing how daily price ticks alter the quiet temperature of a household.',
        url: 'https://writon.cc/stories/the-number-that-changes-before-lunch-ef41831b',
      },
      {
        title: 'What Fifty-Four Minutes Conceal',
        author: 'Arshdeep Singh',
        readingMinutes: 4,
        excerpt: 'When a Grand Slam match ends in fifty-four minutes, the scoreboard records speed—what it conceals is the accumulated labour that made the speed possible.',
        url: 'https://writon.cc/stories/what-fifty-four-minutes-conceal-8e5994f7',
      },
    ],
    preferencesUrl: prefsUrl,
    unsubscribeUrl: unsubUrl,
    postalAddress,
    locale: 'en',
  });

  const writerWeeklyDigest = renderWeeklyDigest({
    subject: `Your week on WritOn — Weekly Writer Insights`,
    intro: `Here is what happened around your writing this week, ${capitalizedName}.`,
    stats: {
      storiesPublished: 2,
      uniqueReaders: 84,
      applauds: 39,
      comments: 14,
      followersGained: 9,
      shareActions: 6,
    },
    milestone: {
      title: '🎉 50 Unique Readers Milestone',
      body: 'Your latest essay "The Architecture of Quiet Spaces" reached over 50 dedicated readers this week.',
    },
    topStory: {
      title: 'The Architecture of Quiet Spaces',
      summary: '84 reads · 39 applauds · Average reading time: 3m 42s',
    },
    tip: {
      title: 'Sensory Anchors in Non-Fiction',
      body: 'Anchor abstract cultural ideas to physical objects present in the scene—teak wood, rain on glass, or the smell of wet pavement.',
    },
    recommendations: [
      { title: 'Monsoon in Old Delhi', author: 'Vikram Seth', url: 'https://writon.cc/stories/monsoon-delhi' },
      { title: 'The Rhythm of Short Sentences', author: 'Arundhati Roy', url: 'https://writon.cc/stories/short-sentences' },
    ],
    unsubscribeUrl: unsubUrl,
  });

  const activityNotice = renderWritOnEmail({
    type: 'activity',
    title: 'Activity on your writing',
    intro: `Readers engaged with your stories this week on WritOn.`,
    actionLabel: 'View your writing stats',
    actionUrl: 'https://writon.cc/dashboard',
    stories: [
      {
        title: 'The Geometry of Diminishing Returns',
        author: capitalizedName,
        readingMinutes: 4,
        excerpt: '14 new comments and 39 applauds recorded in the last 7 days.',
        url: 'https://writon.cc/stories/the-geometry-of-diminishing-returns-ef82cc76-4d0',
      },
    ],
    preferencesUrl: prefsUrl,
    unsubscribeUrl: unsubUrl,
    postalAddress,
    locale: 'en',
  });

  const returnInvitation = renderWritOnEmail({
    type: 'return',
    title: 'Something to read, when you feel like it',
    intro: `Your reading shelf has been quiet, ${capitalizedName}. When you have ten quiet minutes, here is a thoughtful piece waiting for you.`,
    actionLabel: 'Read on WritOn',
    actionUrl: 'https://writon.cc/explore',
    stories: [
      {
        title: 'The Geometry of Diminishing Returns',
        author: 'Aarav Mehta',
        readingMinutes: 4,
        excerpt: 'An exploration of silence, performance budgets, and tactile software.',
        url: 'https://writon.cc/stories/the-geometry-of-diminishing-returns-ef82cc76-4d0',
      },
    ],
    preferencesUrl: prefsUrl,
    unsubscribeUrl: unsubUrl,
    postalAddress,
    locale: 'en',
  });

  return [
    { key: '01_verification', name: '1. Email Verification', subject: 'Confirm your email', ...verification },
    { key: '02_password_reset', name: '2. Password Reset', subject: 'Reset your password', ...passwordReset },
    { key: '03_welcome', name: '3. Welcome to WritOn (Unified Onboarding)', subject: 'Welcome to WritOn', ...welcomeEngagement },
    { key: '04_reading_digest', name: '4. Weekly Reading Digest', subject: 'Your weekly reading', ...readingDigest },
    { key: '05_writer_weekly_digest', name: '5. Writer Weekly Digest & Stats', subject: writerWeeklyDigest.subject, ...writerWeeklyDigest },
    { key: '06_activity_milestone', name: '6. Writing Activity & Milestone', subject: 'Activity on your writing', ...activityNotice },
    { key: '07_return_invitation', name: '7. Gentle Return Invitation', subject: 'Something to read, when you feel like it', ...returnInvitation },
  ];
}

async function run() {
  const sampleList = buildSampleEmails(targetEmail);
  const outDir = new URL('../../../docs/email/preview/samples/', import.meta.url);
  await mkdir(outDir, { recursive: true });

  console.log(`Generated ${sampleList.length} customized email templates for ${targetEmail}.\n`);

  // Save HTML and TXT files for each sample
  for (const sample of sampleList) {
    await writeFile(new URL(`${sample.key}.html`, outDir), sample.html, 'utf8');
    await writeFile(new URL(`${sample.key}.txt`, outDir), sample.text, 'utf8');
    console.log(`  [Rendered] ${sample.name.padEnd(36)} -> docs/email/preview/samples/${sample.key}.html`);
  }

  // Create an index gallery for easy previewing
  const galleryHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WritOn Email Previews — ${targetEmail}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Georgia, serif; background: #FAF5EE; color: #30271F; margin: 0; padding: 40px 20px; }
    .container { max-width: 800px; margin: 0 auto; background: #fffaf4; border: 1px solid #E8DFD3; border-radius: 16px; padding: 36px; }
    h1 { font-family: Georgia, serif; font-size: 28px; color: #9C3E1D; margin: 0 0 8px; }
    p.subtitle { font-size: 15px; color: #6f6258; margin: 0 0 28px; }
    .badge { display: inline-block; background: #E8DFD3; color: #30271F; font-size: 13px; font-weight: bold; padding: 4px 10px; border-radius: 6px; }
    ul.sample-list { list-style: none; padding: 0; margin: 24px 0; }
    li.sample-item { padding: 16px; border-bottom: 1px solid #E8DFD3; display: flex; justify-content: space-between; align-items: center; }
    li.sample-item:last-child { border-bottom: none; }
    .sample-title { font-weight: 600; font-size: 16px; margin-bottom: 4px; }
    .sample-subject { font-size: 14px; color: #6f6258; font-style: italic; }
    .btn { display: inline-block; padding: 8px 14px; background: #9C3E1D; color: #FFFFFF; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600; margin-left: 8px; }
    .btn-secondary { background: #E8DFD3; color: #30271F; }
    .btn:hover { opacity: 0.9; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E8DFD3; font-size: 12px; color: #6f6258; }
  </style>
</head>
<body>
  <div class="container">
    <h1>WritOn Email Suite Previews</h1>
    <p class="subtitle">Customized live preview set rendered for <span class="badge">${targetEmail}</span></p>
    <ul class="sample-list">
      ${sampleList.map(s => `
        <li class="sample-item">
          <div>
            <div class="sample-title">${s.name}</div>
            <div class="sample-subject">Subject: "${s.subject}"</div>
          </div>
          <div>
            <a class="btn" href="${s.key}.html" target="_blank">View HTML</a>
            <a class="btn btn-secondary" href="${s.key}.txt" target="_blank">Plain Text</a>
          </div>
        </li>
      `).join('')}
    </ul>
    <div class="footer">
      WritOn Warm Parchment (#FAF5EE) design standard. Strict WCAG 2.1 AA contrast. Zero tracking pixels.
    </div>
  </div>
</body>
</html>`;
  await writeFile(new URL('index.html', outDir), galleryHtml, 'utf8');
  console.log(`\n📄 Gallery Index written to: docs/email/preview/samples/index.html`);

  // If apiKey is provided, dispatch them to Resend
  if (!isDryRun) {
    console.log(`\n🚀 Connecting to Resend API for live delivery...`);
    const resend = createResendClient({
      enabled: true,
      mode: 'internal',
      testRecipients: new Set([targetEmail]),
      from: fromAddress,
      replyTo,
      resendApiKey: apiKey,
    });

    for (const sample of sampleList) {
      const idempotencyKey = `sample_${sample.key}_${Date.now()}`;
      try {
        console.log(`  Sending "${sample.subject}" to ${targetEmail}...`);
        const result = await resend.send({
          to: targetEmail,
          subject: sample.subject,
          html: sample.html,
          text: sample.text,
          idempotencyKey,
        });
        if (result.blocked) {
          console.warn(`    ⚠️ Blocked: ${result.reason}`);
        } else {
          console.log(`    ✅ Delivered to Resend! Message ID: ${result.id}`);
        }
      } catch (err) {
        console.error(`    ❌ Delivery error for ${sample.key}: ${err.message}`);
        if (err.responseBody) {
          console.error(`       Provider response:`, JSON.stringify(err.responseBody));
        }
      }
    }
  } else {
    console.log(`\nℹ️  Live delivery skipped because RESEND_API_KEY is not set.`);
    console.log(`   To send these samples directly to your inbox at ${targetEmail}:`);
    console.log(`   1. Provide your Resend API Key:`);
    console.log(`      node server/src/scripts/send-sample-emails.mjs --to=${targetEmail} --key=re_YOUR_RESEND_KEY`);
    console.log(`   or set RESEND_API_KEY=re_... in server/.env and run without --key.`);
  }
}

run().catch(err => {
  console.error('Fatal error in send-sample-emails:', err);
  process.exit(1);
});
