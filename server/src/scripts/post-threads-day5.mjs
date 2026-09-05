import dotenv from 'dotenv';
import { uploadLocalImageForMeta } from '../services/social-poster.js';

dotenv.config({ path: '.env' });

async function post() {
  const token = process.env.THREADS_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = '28375458605413205';
  const cardPath = 'd:/VibeCode/WritOn-PowerUp/campaign/day5-assets/day5_spotlight_slide_1.png';
  
  console.log('Uploading card for Threads...');
  const imageUrl = await uploadLocalImageForMeta(cardPath);
  console.log('Image uploaded to:', imageUrl);

  const text = `“Platform 8 smelled of wet jute, diesel exhaust, and cold mustard oil under the hum of fluorescent lights.” 📖

Today’s Author Spotlight: Devansh Roy (@devansh_roy) and his noir story “The Last Train from Howrah Station at 2:15 AM”.

Distraction-free 3-minute decks. No ads. Just craft.

📲 Read on Google Play:
https://writon.cc/go/2609_d05_threads_post_en_author_spotlight

#writon #writingcommunity #creators #books`;

  console.log('Creating Threads container...');
  const res = await fetch(`https://graph.threads.net/v1.0/${userId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'IMAGE',
      image_url: imageUrl,
      text,
      access_token: token,
    }),
  });
  const data = await res.json();
  console.log('Container creation result:', data);

  if (!data.id) {
    throw new Error(`Container creation failed: ${JSON.stringify(data)}`);
  }

  console.log('Waiting 4s for Threads transcoding...');
  await new Promise(r => setTimeout(r, 4000));

  console.log(`Publishing container ${data.id}...`);
  const pubRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads_publish?creation_id=${data.id}&access_token=${token}`, {
    method: 'POST',
  });
  const pubData = await pubRes.json();
  console.log('Publish result:', pubData);

  return { containerId: data.id, postId: pubData.id };
}

post().then(r => console.log('THREADS SUCCESS:', r)).catch(console.error);
