import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Uploads a local image buffer to a direct raw HTTPS image host for Instagram Graph API ingestion.
 */
export async function uploadLocalImageForMeta(localFilePath) {
  try {
    const fileBuffer = await fs.readFile(localFilePath);
    const isPng = localFilePath.endsWith('.png');
    const processedBuffer = isPng
      ? await sharp(fileBuffer).jpeg({ quality: 92 }).toBuffer()
      : fileBuffer;

    const filename = path.basename(localFilePath).replace(/\.png$/, '.jpg');
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', new Blob([processedBuffer], { type: 'image/jpeg' }), filename);

    const uploadRes = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData,
    });

    const directUrl = (await uploadRes.text()).trim();
    if (directUrl.startsWith('http')) {
      return directUrl;
    }
    throw new Error(`Upload failed with response: ${directUrl}`);
  } catch (err) {
    throw new Error(`Failed to upload local image ${localFilePath} for Meta: ${err.message}`);
  }
}

import crypto from 'node:crypto';

function percentEncode(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function generateOAuth1Header({ method, url, apiKey, apiSecret, accessToken, accessSecret }) {
  const oauthParams = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  };

  const sortedParams = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`)
    .join('&');

  const baseString = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(sortedParams)}`;
  const signingKey = `${percentEncode(apiSecret)}&${percentEncode(accessSecret)}`;

  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');

  oauthParams.oauth_signature = signature;

  return 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ');
}

import { TwitterApi } from 'twitter-api-v2';

/**
 * Publishes a tweet / thread to X (Twitter) using the official TwitterApi client.
 * Supports OAuth 1.0a User Context or Bearer Token.
 */
export async function postToX({ text, mediaUrls = [], localImagePaths = [], config = {}, log = console }) {
  const apiKey = config.xApiKey || process.env.X_API_KEY;
  const apiSecret = config.xApiSecret || process.env.X_API_SECRET;
  const accessToken = config.xAccessToken || process.env.X_ACCESS_TOKEN;
  const accessSecret = config.xAccessSecret || process.env.X_ACCESS_SECRET;
  const bearerToken = config.xBearerToken || process.env.X_BEARER_TOKEN;

  if (!bearerToken && (!apiKey || !apiSecret || !accessToken || !accessSecret)) {
    return {
      success: false,
      reason: 'Missing X API credentials (set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET)',
    };
  }

  try {
    const client = apiKey && accessToken
      ? new TwitterApi({
          appKey: apiKey,
          appSecret: apiSecret,
          accessToken,
          accessSecret,
        })
      : new TwitterApi(bearerToken);

    const rwClient = client.readWrite;
    let mediaIds = [];

    // If local image paths are passed, upload up to 4 images to X (Twitter's max limit per tweet)
    if (localImagePaths && localImagePaths.length > 0) {
      log.info?.(`📤 Uploading ${Math.min(localImagePaths.length, 4)} image cards to X...`);
      for (const imgPath of localImagePaths.slice(0, 4)) {
        try {
          const mediaId = await rwClient.v1.uploadMedia(imgPath);
          mediaIds.push(mediaId);
        } catch (uploadErr) {
          log.warn?.(`Could not upload ${imgPath} to X: ${uploadErr.message}`);
        }
      }
    }

    const tweetPayload = { text };
    if (mediaIds.length > 0) {
      tweetPayload.media = { media_ids: mediaIds };
    }

    let result;
    try {
      result = await rwClient.v2.tweet(tweetPayload);
    } catch (err) {
      if (err.data?.status === 403 && /https?:\/\/\S+/.test(text)) {
        log.info?.('ℹ️ X returned 403 with link in media tweet. Splitting link into threaded reply...');
        const urlMatch = text.match(/(https?:\/\/\S+)/);
        const url = urlMatch ? urlMatch[1] : '';
        const cleanText = text.replace(/(Claim your pen name[^\n]*\n)?https?:\/\/\S+/i, 'Claim your pen name in the reply below 👇').trim();

        result = await rwClient.v2.tweet({
          text: cleanText,
          ...(mediaIds.length > 0 ? { media: { media_ids: mediaIds } } : {}),
        });

        if (result?.data?.id && url) {
          try {
            await rwClient.v2.reply(`📲 Claim your pen name and read on Google Play:\n${url}`, result.data.id);
            log.info?.('✅ Threaded reply with link successfully attached to tweet');
          } catch (replyErr) {
            log.warn?.(`Could not attach threaded link reply: ${replyErr.message}`);
          }
        }
      } else {
        throw err;
      }
    }

    return {
      success: true,
      postId: result?.data?.id,
      data: result,
    };
  } catch (err) {
    return {
      success: false,
      error: err.data?.detail || err.message,
      data: err.data,
    };
  }
}

/**
 * Publishes a multi-image carousel to Instagram via the Meta Graph API.
 * Uses the official 3-step carousel container workflow:
 * 1. POST /{ig-user-id}/media for each child image (is_carousel_item=true)
 * 2. POST /{ig-user-id}/media (media_type=CAROUSEL, children=[ids...], caption)
 * 3. POST /{ig-user-id}/media_publish (creation_id)
 */
export async function postToInstagramCarousel({
  imageUrls = [],
  localImagePaths = [],
  caption = '',
  config = {},
  log = console,
}) {
  const token = config.instagramAccessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = config.instagramBusinessAccountId || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!token || !accountId) {
    return {
      success: false,
      reason: 'Missing Instagram credentials (set INSTAGRAM_ACCESS_TOKEN & INSTAGRAM_BUSINESS_ACCOUNT_ID)',
    };
  }

  let resolvedUrls = [...imageUrls];

  // Auto-upload local images if supplied
  if (localImagePaths && localImagePaths.length > 0) {
    log.info?.('📤 Uploading local slide assets for Instagram Graph API...');
    for (const localPath of localImagePaths) {
      try {
        const uploadedUrl = await uploadLocalImageForMeta(localPath);
        resolvedUrls.push(uploadedUrl);
      } catch (err) {
        log.warn?.(`Could not upload ${localPath}: ${err.message}`);
      }
    }
  }

  if (resolvedUrls.length === 0) {
    return {
      success: false,
      reason: 'No valid image URLs available to publish to Instagram',
    };
  }

  try {
    // Single image publishing
    if (resolvedUrls.length === 1) {
      const singleRes = await fetch(`https://graph.facebook.com/v20.0/${accountId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: resolvedUrls[0],
          caption,
          access_token: token,
        }),
      });
      const singleContainer = await singleRes.json();
      if (!singleContainer.id) {
        return { success: false, error: singleContainer };
      }

      const publishRes = await fetch(`https://graph.facebook.com/v20.0/${accountId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: singleContainer.id,
          access_token: token,
        }),
      });
      const publishResult = await publishRes.json();
      return { success: publishRes.ok, result: publishResult, mediaId: publishResult.id };
    }

    // Multi-Image Carousel
    log.info?.(`📸 Creating ${resolvedUrls.length} Instagram carousel child items...`);
    const childIds = [];
    for (let i = 0; i < resolvedUrls.length; i++) {
      const itemRes = await fetch(`https://graph.facebook.com/v20.0/${accountId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: resolvedUrls[i],
          is_carousel_item: true,
          access_token: token,
        }),
      });
      const itemData = await itemRes.json();
      if (itemData.id) {
        childIds.push(itemData.id);
        log.info?.(`  • Child item ${i + 1}/${resolvedUrls.length} created: ${itemData.id}`);
      } else {
        return {
          success: false,
          error: `Failed to create carousel child item for ${resolvedUrls[i]}`,
          details: itemData,
        };
      }
    }

    // Create Parent Carousel Container
    log.info?.('📦 Creating master Carousel container on Instagram...');
    const carouselRes = await fetch(`https://graph.facebook.com/v20.0/${accountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'CAROUSEL',
        children: childIds,
        caption,
        access_token: token,
      }),
    });
    const carouselData = await carouselRes.json();
    if (!carouselData.id) {
      return {
        success: false,
        error: 'Failed to create parent carousel container',
        details: carouselData,
      };
    }

    log.info?.(`🚀 Publishing master Carousel container (${carouselData.id}) to @writon_socialapp...`);
    const publishRes = await fetch(`https://graph.facebook.com/v20.0/${accountId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: carouselData.id,
        access_token: token,
      }),
    });
    const result = await publishRes.json();

    return {
      success: publishRes.ok,
      carouselId: carouselData.id,
      publishedPostId: result.id,
      result,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Broadcasts the day's post to a Telegram Channel or Founder Bot.
 */
export async function postToTelegram({ botToken, chatId, caption, imageUrl }) {
  const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
  const targetChatId = chatId || process.env.TELEGRAM_CHAT_ID;

  if (!token || !targetChatId) {
    return { success: false, reason: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID' };
  }

  try {
    const endpoint = imageUrl
      ? `https://api.telegram.org/bot${token}/sendPhoto`
      : `https://api.telegram.org/bot${token}/sendMessage`;

    const body = imageUrl
      ? { chat_id: targetChatId, photo: imageUrl, caption, parse_mode: 'HTML' }
      : { chat_id: targetChatId, text: caption, parse_mode: 'HTML' };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return { success: res.ok, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Publishes a single image post to Instagram.
 */
export async function postToInstagram({ imageUrl, localImagePath, caption, config }) {
  const imageUrls = imageUrl ? [imageUrl] : [];
  const localImagePaths = localImagePath ? [localImagePath] : [];
  return postToInstagramCarousel({ imageUrls, localImagePaths, caption, config });
}

/**
 * Publishes a text, image, or carousel post to Threads via Meta Threads API (graph.threads.net).
 */
export async function postToThreads({
  text = '',
  imageUrls = [],
  localImagePaths = [],
  config = {},
  log = console,
}) {
  const token = config.threadsAccessToken || process.env.THREADS_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = config.threadsUserId || process.env.THREADS_USER_ID || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!token || !userId) {
    return {
      success: false,
      reason: 'Missing Threads credentials (set THREADS_ACCESS_TOKEN & THREADS_USER_ID)',
    };
  }

  let resolvedUrls = [...imageUrls];
  if (localImagePaths && localImagePaths.length > 0) {
    for (const localPath of localImagePaths) {
      try {
        const uploadedUrl = await uploadLocalImageForMeta(localPath);
        resolvedUrls.push(uploadedUrl);
      } catch (err) {
        log.warn?.(`Could not upload ${localPath} for Threads: ${err.message}`);
      }
    }
  }

  try {
    let containerId = null;

    if (resolvedUrls.length === 0) {
      // Text only Thread
      const res = await fetch(`https://graph.threads.net/v1.0/${userId}/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'TEXT',
          text,
          access_token: token,
        }),
      });
      const data = await res.json();
      containerId = data.id;
    } else if (resolvedUrls.length === 1) {
      // Single Image Thread
      const res = await fetch(`https://graph.threads.net/v1.0/${userId}/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'IMAGE',
          image_url: resolvedUrls[0],
          text,
          access_token: token,
        }),
      });
      const data = await res.json();
      containerId = data.id;
    } else {
      // Multi-image Carousel Thread
      const childIds = [];
      for (const url of resolvedUrls) {
        const itemRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_type: 'IMAGE',
            image_url: url,
            is_carousel_item: true,
            access_token: token,
          }),
        });
        const itemData = await itemRes.json();
        if (itemData.id) childIds.push(itemData.id);
      }

      // Poll until all child containers finish transcoding on Meta's servers
      for (const cid of childIds) {
        for (let attempt = 0; attempt < 10; attempt++) {
          try {
            const statusRes = await fetch(`https://graph.threads.net/v1.0/${cid}?fields=status,error_message&access_token=${token}`);
            const statusData = await statusRes.json();
            if (statusData.status === 'FINISHED') break;
          } catch (_e) {}
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      const carouselRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads?children=${childIds.join(',')}&media_type=CAROUSEL&text=${encodeURIComponent(text)}&access_token=${token}`, {
        method: 'POST',
      });
      const carouselData = await carouselRes.json();
      containerId = carouselData.id;
    }

    if (!containerId) {
      return { success: false, error: 'Could not create Threads media container' };
    }

    // Publish step
    const publishRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads_publish?creation_id=${containerId}&access_token=${token}`, {
      method: 'POST',
    });
    const result = await publishRes.json();
    return { success: publishRes.ok, postId: result.id, result };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

