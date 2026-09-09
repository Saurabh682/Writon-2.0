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

/**
 * Broadcasts a story or post to a Telegram Channel or Group.
 * Supports sending direct image buffer or local image path via multipart/form-data.
 */
export async function postToTelegram({
  botToken,
  chatId,
  caption = '',
  imageBuffer = null,
  imagePath = null,
  imageUrl = null,
}) {
  const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
  const targetChatId = chatId || process.env.TELEGRAM_CHAT_ID;

  if (!token || !targetChatId) {
    return {
      success: false,
      status: 'skipped',
      reason: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID',
    };
  }

  try {
    let finalBuffer = imageBuffer;
    if (!finalBuffer && imagePath) {
      finalBuffer = await fs.readFile(imagePath);
    }

    if (finalBuffer) {
      // Send Photo via multipart/form-data
      const formData = new FormData();
      formData.append('chat_id', targetChatId);
      formData.append('caption', caption.slice(0, 1024)); // Telegram caption limit 1024 chars
      formData.append('parse_mode', 'HTML');
      formData.append('photo', new Blob([finalBuffer], { type: 'image/png' }), 'social_card.png');

      const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      return {
        success: res.ok && data.ok,
        status: res.ok && data.ok ? 'published' : 'failed',
        data,
        postId: data.result?.message_id?.toString(),
      };
    }

    if (imageUrl) {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          photo: imageUrl,
          caption: caption.slice(0, 1024),
          parse_mode: 'HTML',
        }),
      });
      const data = await res.json();
      return {
        success: res.ok && data.ok,
        status: res.ok && data.ok ? 'published' : 'failed',
        data,
        postId: data.result?.message_id?.toString(),
      };
    }

    // Fallback: Text-only message
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: caption,
        parse_mode: 'HTML',
      }),
    });
    const data = await res.json();
    return {
      success: res.ok && data.ok,
      status: res.ok && data.ok ? 'published' : 'failed',
      data,
      postId: data.result?.message_id?.toString(),
    };
  } catch (err) {
    return {
      success: false,
      status: 'failed',
      error: err.message,
    };
  }
}

/**
 * Dispatches a formatted rich embed to a Discord or Slack webhook.
 */
export async function dispatchToWebhook({ title, summary, url, authorName, hashtags, category, imageUrl }, webhookUrl = null) {
  const targetWebhook = webhookUrl || process.env.DISCORD_WEBHOOK_URL || process.env.SOCIAL_WEBHOOK_URL;
  if (!targetWebhook) {
    return {
      success: false,
      status: 'skipped',
      reason: 'No webhook URL configured (DISCORD_WEBHOOK_URL or SOCIAL_WEBHOOK_URL)',
    };
  }

  try {
    const payload = {
      username: 'WritOn Editorial Dispatch',
      avatar_url: 'https://writon.cc/assets/writon_app_icon.png',
      embeds: [
        {
          title: title || 'New Story on WritOn',
          description: summary ? `> *${summary}*\n\n${hashtags || ''}` : hashtags || '',
          url: url || 'https://writon.cc',
          color: 0xE75A2A, // Terracotta brand color
          fields: [
            { name: 'Author', value: authorName || 'Editorial Bot', inline: true },
            { name: 'Category', value: category || 'Editorial', inline: true },
          ],
          image: imageUrl ? { url: imageUrl } : undefined,
          footer: {
            text: 'WritOn Publishing Network • Read peacefully',
            icon_url: 'https://writon.cc/assets/writon_app_icon.png',
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const res = await fetch(targetWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return {
      success: res.ok,
      status: res.ok ? 'published' : 'failed',
      statusCode: res.status,
    };
  } catch (err) {
    return {
      success: false,
      status: 'failed',
      error: err.message,
    };
  }
}

/**
 * Publishes a tweet / thread to X (Twitter) using TwitterApi if available.
 */
export async function postToX({ text, localImagePaths = [], config = {}, log = console }) {
  const apiKey = config.xApiKey || process.env.X_API_KEY;
  const apiSecret = config.xApiSecret || process.env.X_API_SECRET;
  const accessToken = config.xAccessToken || process.env.X_ACCESS_TOKEN;
  const accessSecret = config.xAccessSecret || process.env.X_ACCESS_SECRET;
  const bearerToken = config.xBearerToken || process.env.X_BEARER_TOKEN;

  if (!bearerToken && (!apiKey || !apiSecret || !accessToken || !accessSecret)) {
    return {
      success: false,
      status: 'skipped',
      reason: 'Missing X API credentials (X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET)',
    };
  }

  try {
    let TwitterApi;
    try {
      const mod = await import('twitter-api-v2');
      TwitterApi = mod.TwitterApi;
    } catch {
      return {
        success: false,
        status: 'skipped',
        reason: 'twitter-api-v2 package not installed',
      };
    }

    const client = apiKey && accessToken
      ? new TwitterApi({ appKey: apiKey, appSecret: apiSecret, accessToken, accessSecret })
      : new TwitterApi(bearerToken);

    const rwClient = client.readWrite;
    let mediaIds = [];

    if (localImagePaths && localImagePaths.length > 0) {
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

    const result = await rwClient.v2.tweet(tweetPayload);
    return {
      success: true,
      status: 'published',
      postId: result?.data?.id,
      data: result,
    };
  } catch (err) {
    return {
      success: false,
      status: 'failed',
      error: err.message,
    };
  }
}

/**
 * Publishes a post to Meta Threads via Threads Graph API.
 */
export async function postToThreads({
  text = '',
  localImagePaths = [],
  config = {},
  log = console,
}) {
  const token = config.threadsAccessToken || process.env.THREADS_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = config.threadsUserId || process.env.THREADS_USER_ID || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!token || !userId) {
    return {
      success: false,
      status: 'skipped',
      reason: 'Missing Threads credentials (THREADS_ACCESS_TOKEN & THREADS_USER_ID)',
    };
  }

  try {
    let imageUrl = null;
    if (localImagePaths && localImagePaths.length > 0) {
      imageUrl = await uploadLocalImageForMeta(localImagePaths[0]);
    }

    const mediaType = imageUrl ? 'IMAGE' : 'TEXT';
    const body = { media_type: mediaType, text, access_token: token };
    if (imageUrl) body.image_url = imageUrl;

    const res = await fetch(`https://graph.threads.net/v1.0/${userId}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.id) {
      return { success: false, status: 'failed', error: data.error?.message || 'Could not create Threads container' };
    }

    // Publish creation container
    const publishRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads_publish?creation_id=${data.id}&access_token=${token}`, {
      method: 'POST',
    });
    const publishData = await publishRes.json();
    return {
      success: publishRes.ok,
      status: publishRes.ok ? 'published' : 'failed',
      postId: publishData.id,
      data: publishData,
    };
  } catch (err) {
    return {
      success: false,
      status: 'failed',
      error: err.message,
    };
  }
}

/**
 * Publishes a single image or multi-image carousel to an Instagram Professional/Business account
 * via the Meta Graph API.
 * 
 * Requirements:
 * 1. POST /{ig-user-id}/media (image_url, is_carousel_item=true) for each slide
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

