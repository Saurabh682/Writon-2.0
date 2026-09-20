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
 * Uploads a local MP4 video to a direct raw HTTPS host for Instagram Graph API video ingestion.
 */
export async function uploadLocalVideoForMeta(localFilePath) {
  try {
    const fileBuffer = await fs.readFile(localFilePath);
    const filename = path.basename(localFilePath);
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', new Blob([fileBuffer], { type: 'video/mp4' }), filename);

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
    throw new Error(`Failed to upload local video ${localFilePath} for Meta: ${err.message}`);
  }
}

/**
 * Publishes an MP4 video (Reel / Video post) to Instagram via the Meta Graph API.
 */
export async function postToInstagramReel({
  videoUrl = null,
  localVideoPath = null,
  caption = '',
  config = {},
  log = console,
}) {
  const token = config.instagramAccessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = config.instagramBusinessAccountId || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!token || !accountId) {
    return {
      success: false,
      reason: 'Missing Instagram credentials (INSTAGRAM_ACCESS_TOKEN & INSTAGRAM_BUSINESS_ACCOUNT_ID)',
    };
  }

  try {
    let resolvedVideoUrl = videoUrl;
    if (!resolvedVideoUrl && localVideoPath) {
      log.info?.(`📤 Uploading local video ${localVideoPath} for Instagram Reel...`);
      resolvedVideoUrl = await uploadLocalVideoForMeta(localVideoPath);
    }

    if (!resolvedVideoUrl) {
      return { success: false, reason: 'No video URL or local video path provided' };
    }

    log.info?.('📦 Creating Instagram Reel media container...');
    const containerRes = await fetch(`https://graph.facebook.com/v20.0/${accountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'REELS',
        video_url: resolvedVideoUrl,
        caption,
        access_token: token,
      }),
    });
    const containerData = await containerRes.json();

    if (!containerData.id) {
      return { success: false, error: 'Failed to create Instagram Reel container', details: containerData };
    }

    const containerId = containerData.id;
    log.info?.(`⏳ Waiting for Instagram video container processing (${containerId})...`);

    // Poll status until FINISHED (up to 90s)
    let isReady = false;
    for (let attempt = 0; attempt < 18; attempt++) {
      await new Promise(r => setTimeout(r, 5000));
      const statusRes = await fetch(`https://graph.facebook.com/v20.0/${containerId}?fields=status_code&access_token=${token}`);
      const statusData = await statusRes.json();
      log.info?.(`  • Reel container status: ${statusData.status_code || 'CHECKING'}`);
      if (statusData.status_code === 'FINISHED') {
        isReady = true;
        break;
      }
      if (statusData.status_code === 'ERROR') {
        return { success: false, error: 'Instagram failed to process video', details: statusData };
      }
    }

    if (!isReady) {
      log.warn?.('⚠️ Video processing still in progress, attempting publish anyway...');
    }

    log.info?.(`🚀 Publishing Instagram Reel (${containerId})...`);
    const pubRes = await fetch(`https://graph.facebook.com/v20.0/${accountId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: token,
      }),
    });
    const result = await pubRes.json();

    return {
      success: pubRes.ok,
      publishedPostId: result.id,
      permalink: `https://www.instagram.com/reel/${result.id}/`,
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

/**
 * Publishes a text update or image post to LinkedIn using the v2 UGC Post API.
 * Supports attaching local images via LinkedIn asset upload registration.
 */
export async function postToLinkedIn({
  text,
  localImagePaths = [],
  articleTitle = '',
  config = {},
  log = console,
}) {
  const token = config.LINKEDIN_ACCESS_TOKEN || process.env.LINKEDIN_ACCESS_TOKEN;
  const authorUrn = config.LINKEDIN_PERSON_URN || process.env.LINKEDIN_PERSON_URN;

  if (!token || !authorUrn) {
    log.warn?.('⚠️ LinkedIn credentials missing (LINKEDIN_ACCESS_TOKEN or LINKEDIN_PERSON_URN)');
    return {
      success: false,
      status: 'skipped',
      reason: 'Missing LINKEDIN_ACCESS_TOKEN or LINKEDIN_PERSON_URN',
    };
  }

  try {
    const mediaList = [];

    if (localImagePaths && localImagePaths.length > 0) {
      for (const imgPath of localImagePaths) {
        log.info?.(`📤 Registering LinkedIn media upload for: ${imgPath}`);
        const regRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            registerUploadRequest: {
              recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
              owner: authorUrn,
              serviceRelationships: [
                {
                  relationshipType: 'OWNER',
                  identifier: 'urn:li:userGeneratedContent',
                },
              ],
            },
          }),
        });

        if (!regRes.ok) {
          const errText = await regRes.text();
          throw new Error(`Failed to register LinkedIn upload (${regRes.status}): ${errText}`);
        }

        const regData = await regRes.json();
        const uploadUrl = regData.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
        const assetUrn = regData.value?.asset;

        if (!uploadUrl || !assetUrn) {
          throw new Error('LinkedIn registerUpload returned no uploadUrl or asset URN');
        }

        const fileBuffer = await fs.readFile(imgPath);
        log.info?.(`⬆️ Uploading image bytes (${fileBuffer.length} bytes) to LinkedIn...`);
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/octet-stream',
          },
          body: fileBuffer,
        });

        if (!uploadRes.ok) {
          const upErr = await uploadRes.text();
          throw new Error(`Failed to PUT image to LinkedIn (${uploadRes.status}): ${upErr}`);
        }

        mediaList.push({
          status: 'READY',
          description: {
            text: articleTitle || 'WritOn Story Card',
          },
          media: assetUrn,
          title: {
            text: articleTitle || 'WritOn',
          },
        });
      }
    }

    const shareMediaCategory = mediaList.length > 0 ? 'IMAGE' : 'NONE';

    const ugcPayload = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text,
          },
          shareMediaCategory,
          ...(mediaList.length > 0 ? { media: mediaList } : {}),
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    log.info?.('🚀 Creating UGC post on LinkedIn...');
    const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(ugcPayload),
    });

    const result = await postRes.json();

    if (!postRes.ok) {
      log.error?.('❌ LinkedIn post error:', result);
      return {
        success: false,
        error: result.message || 'LinkedIn publish failed',
        details: result,
      };
    }

    const postId = result.id;
    log.info?.(`✅ Successfully published to LinkedIn: ${postId}`);

    return {
      success: true,
      postId,
      url: `https://www.linkedin.com/feed/update/${postId}`,
      result,
    };
  } catch (err) {
    log.error?.(`❌ Error in postToLinkedIn: ${err.message}`);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Publishes a text post or link post to Reddit using RedditClient.
 */
export async function postToReddit({
  subreddit = process.env.REDDIT_DEFAULT_SUBREDDIT || 'writon',
  title,
  text = '',
  url = null,
  kind = 'self',
  flairId = null,
  flairText = null,
  config = {},
  log = console,
}) {
  const { RedditClient } = await import('./reddit-client.js');
  const client = new RedditClient({
    clientId: config.REDDIT_CLIENT_ID || process.env.REDDIT_CLIENT_ID,
    clientSecret: config.REDDIT_CLIENT_SECRET || process.env.REDDIT_CLIENT_SECRET,
    username: config.REDDIT_USERNAME || process.env.REDDIT_USERNAME,
    password: config.REDDIT_PASSWORD || process.env.REDDIT_PASSWORD,
    userAgent: config.REDDIT_USER_AGENT || process.env.REDDIT_USER_AGENT,
    log,
  });

  if (!client.isConfigured()) {
    log.warn?.('⚠️ Reddit credentials missing in environment / config');
    return {
      success: false,
      status: 'skipped',
      reason: 'Missing REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, or REDDIT_PASSWORD',
    };
  }

  try {
    const outcome = await client.submitPost({
      subreddit,
      title,
      text,
      url,
      kind,
      flairId,
      flairText,
    });

    return {
      success: true,
      status: 'published',
      postId: outcome.name, // Fullname e.g. t3_15bfi0
      url: outcome.url,
      data: outcome,
    };
  } catch (err) {
    log.error?.(`❌ Error in postToReddit: ${err.message}`);
    return {
      success: false,
      status: 'failed',
      error: err.message,
    };
  }
}

/**
 * Publishes a Pin to Pinterest using PinterestClient.
 */
export async function postToPinterest({
  boardId = process.env.PINTEREST_DEFAULT_BOARD_ID,
  title,
  description = '',
  link = 'https://writon.cc',
  altText = '',
  imageUrl = null,
  imagePath = null,
  imageBuffer = null,
  config = {},
  log = console,
}) {
  const { PinterestClient } = await import('./pinterest-client.js');
  const client = new PinterestClient({
    accessToken: config.PINTEREST_ACCESS_TOKEN || process.env.PINTEREST_ACCESS_TOKEN,
    refreshToken: config.PINTEREST_REFRESH_TOKEN || process.env.PINTEREST_REFRESH_TOKEN,
    appId: config.PINTEREST_APP_ID || process.env.PINTEREST_APP_ID || config.PINTEREST_CLIENT_ID || process.env.PINTEREST_CLIENT_ID,
    appSecret: config.PINTEREST_APP_SECRET || process.env.PINTEREST_APP_SECRET || config.PINTEREST_CLIENT_SECRET || process.env.PINTEREST_CLIENT_SECRET,
    defaultBoardId: config.PINTEREST_DEFAULT_BOARD_ID || process.env.PINTEREST_DEFAULT_BOARD_ID,
    log,
  });

  if (!client.isConfigured()) {
    log.warn?.('⚠️ Pinterest credentials missing in environment / config');
    return {
      success: false,
      status: 'skipped',
      reason: 'Missing PINTEREST_ACCESS_TOKEN or refresh credentials',
    };
  }

  try {
    const outcome = await client.createPin({
      boardId,
      title,
      description,
      link,
      altText,
      imageUrl,
      imagePath,
      imageBuffer,
    });

    return {
      success: true,
      status: 'published',
      postId: outcome.id,
      url: outcome.url,
      data: outcome,
    };
  } catch (err) {
    log.error?.(`❌ Error in postToPinterest: ${err.message}`);
    return {
      success: false,
      status: 'failed',
      error: err.message,
    };
  }
}

/**
 * Publishes a Video or Short to YouTube using YouTubeClient.
 */
export async function postToYouTube({
  videoPath,
  title,
  description = '',
  tags = ['writing', 'craft', 'poetry', 'books', 'WritOn'],
  privacyStatus = 'public',
  isShort = true,
  config = {},
  log = console,
}) {
  const { YouTubeClient } = await import('./youtube-client.js');
  const client = new YouTubeClient({
    clientId: config.YOUTUBE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID,
    clientSecret: config.YOUTUBE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET,
    refreshToken: config.YOUTUBE_REFRESH_TOKEN || process.env.YOUTUBE_REFRESH_TOKEN,
    accessToken: config.YOUTUBE_ACCESS_TOKEN || process.env.YOUTUBE_ACCESS_TOKEN,
    channelId: config.YOUTUBE_CHANNEL_ID || process.env.YOUTUBE_CHANNEL_ID,
    log,
  });

  if (!client.canUpload()) {
    log.warn?.('⚠️ YouTube OAuth credentials missing in environment / config');
    return {
      success: false,
      status: 'skipped',
      reason: 'Missing YOUTUBE_REFRESH_TOKEN or OAuth credentials',
    };
  }

  try {
    const outcome = await client.uploadVideo({
      videoPath,
      title,
      description,
      tags,
      privacyStatus,
      isShort,
    });

    return {
      success: true,
      status: 'published',
      postId: outcome.videoId,
      url: outcome.url,
      data: outcome,
    };
  } catch (err) {
    log.error?.(`❌ Error in postToYouTube: ${err.message}`);
    return {
      success: false,
      status: 'failed',
      error: err.message,
    };
  }
}

