import pg from 'pg';
import dotenv from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { loadRuntimeConfig, loadFirebaseServiceAccount } from '../config.js';

dotenv.config({ path: '.env' });

export const TEST_PHONE = {
  profileId: 'FMpu4Aqe25R07h8Mz0TrHzRliVp1',
  name: 'Usha Srivastava',
  email: 'ushasrivastava532@gmail.com',
  device: 'Redmi test phone (Android 15)',
};

async function main() {
  const args = process.argv.slice(2);
  const profileIdArg = args.find(a => a.startsWith('--profile='))?.split('=')[1] || TEST_PHONE.profileId;
  const storyIdArg = args.find(a => a.startsWith('--story='))?.split('=')[1];
  const customTitle = args.find(a => a.startsWith('--title='))?.split('=')[1];
  const customBody = args.find(a => a.startsWith('--body='))?.split('=')[1];
  const includeTopic = args.includes('--topic');

  const config = loadRuntimeConfig();
  const serviceAccount = await loadFirebaseServiceAccount(config);
  const firebaseApp = getApps().length
    ? getApps()[0]
    : (serviceAccount
      ? initializeApp({ credential: cert(serviceAccount) })
      : initializeApp({ projectId: 'writon-app-2020' }));
  const firebaseMessaging = getMessaging(firebaseApp);

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  // 1. Fetch recipient profile
  const profileRes = await client.query(
    'SELECT * FROM public.profiles WHERE id = $1',
    [profileIdArg]
  );
  const recipient = profileRes.rows[0];
  if (!recipient) {
    console.error(`Profile not found for ID: ${profileIdArg}`);
    await client.end();
    process.exit(1);
  }
  console.log('Test Recipient:', {
    id: recipient.id,
    name: recipient.full_name,
    email: recipient.email,
    isTestPhone: recipient.id === TEST_PHONE.profileId,
  });

  // 2. Fetch active device tokens
  const tokensRes = await client.query(
    'SELECT * FROM public.device_push_tokens WHERE profile_id = $1 AND revoked_at IS NULL ORDER BY last_seen_at DESC',
    [recipient.id]
  );
  console.log(`Found ${tokensRes.rows.length} active device push tokens.`);

  if (tokensRes.rows.length === 0) {
    console.warn('No active push tokens found for this profile.');
    await client.end();
    return;
  }

  // 3. Fetch story to link
  let story = null;
  if (storyIdArg) {
    const sRes = await client.query(`
      SELECT p.id, p.title, p.summary, coalesce(author.pen_name, author.full_name, 'WritOn') as author_name
      FROM public.posts p
      LEFT JOIN public.profiles author ON author.id = p.author_id
      WHERE p.id = $1
    `, [storyIdArg]);
    story = sRes.rows[0];
  }

  if (!story) {
    const sRes = await client.query(`
      SELECT p.id, p.title, p.summary, coalesce(author.pen_name, author.full_name, 'WritOn') as author_name
      FROM public.posts p
      LEFT JOIN public.profiles author ON author.id = p.author_id
      WHERE p.status = 'published' AND p.is_public = true
      ORDER BY p.published_at DESC NULLS LAST, p.created_at DESC
      LIMIT 1
    `);
    story = sRes.rows[0];
  }
  console.log('Linked Story:', { id: story?.id, title: story?.title, author: story?.author_name });

  // 4. Send test message
  for (const tokenRow of tokensRes.rows) {
    console.log(`\nSending to token ID: ${tokenRow.id} (last seen: ${tokenRow.last_seen_at}, permission: ${tokenRow.notification_permission})`);
    const title = customTitle || (story ? `Morning Read: ${story.title}` : 'WritOn Verification');
    const body = customBody || (story ? `${story.author_name} just shared this piece. Tap to open and read.` : 'Testing push notification delivery.');
    const targetRoute = story ? `reader/${story.id}` : 'notifications';

    const payload = {
      token: tokenRow.token,
      notification: { title, body },
      data: {
        kind: 'daily_digest',
        edition: 'morning',
        storyId: story ? story.id : '',
        storyTitle: story ? story.title : '',
        storySummary: story?.summary || '',
        authorName: story?.author_name || 'WritOn',
        targetRoute,
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'writon_editorial_channel',
          icon: 'ic_stat_writon',
          color: '#E75A2A',
        },
      },
    };

    try {
      const response = await firebaseMessaging.send(payload);
      console.log(`Successfully sent: ${response}`);
    } catch (err) {
      console.error(`Failed to send to token ${tokenRow.id}:`, err.message || err);
      if (err.message?.includes('NotRegistered') || err.code === 'messaging/registration-token-not-registered') {
        await client.query('UPDATE public.device_push_tokens SET revoked_at = now() WHERE id = $1', [tokenRow.id]);
      }
    }
  }

  // 5. Broadcast to the general FCM topic 'daily_digest' only when explicitly requested via --topic
  if (includeTopic && story) {
    console.log('\nBroadcasting to topic "daily_digest" (--topic flag detected)...');
    const topicPayload = {
      topic: 'daily_digest',
      notification: {
        title: customTitle || `Morning Read: ${story.title}`,
        body: customBody || `${story.author_name} just shared this piece. Tap to open and read.`,
      },
      data: {
        kind: 'daily_digest',
        edition: 'morning',
        storyId: story.id,
        storyTitle: story.title,
        storySummary: story.summary || '',
        authorName: story.author_name,
        targetRoute: `reader/${story.id}`,
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'writon_editorial_channel',
          icon: 'ic_stat_writon',
          color: '#E75A2A',
        },
      },
    };

    try {
      const topicResponse = await firebaseMessaging.send(topicPayload);
      console.log(`Successfully broadcasted to daily_digest topic: ${topicResponse}`);
    } catch (err) {
      console.error('Failed to broadcast to daily_digest topic:', err.message || err);
    }
  }

  await client.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
