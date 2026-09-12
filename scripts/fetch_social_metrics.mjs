// Fetch social media engagement metrics and update metrics.csv
import { readCsv, writeCsv, upsertRow } from './csv_util.mjs';
import { postToX, postToThreads, postToTelegram, dispatchToWebhook } from './social-poster.js';
import { RedditClient } from '../server/src/services/reddit-client.js';
import { PinterestClient } from '../server/src/services/pinterest-client.js';
import { YouTubeClient } from '../server/src/services/youtube-client.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import dotenv from 'dotenv';

dotenv.config();

// Helper to pause between API calls (rate‑limit friendly)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchXMetrics(postId) {
  const bearer = process.env.X_BEARER_TOKEN;
  if (!bearer) return {};
  const url = `https://api.twitter.com/2/tweets/${postId}?tweet.fields=public_metrics`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${bearer}` } });
  if (!res.ok) return {};
  const data = await res.json();
  const mp = data?.data?.public_metrics || {};
  return { views: mp.impression_count || 0, likes: mp.like_count || 0, retweets: mp.retweet_count || 0, replies: mp.reply_count || 0 };
}

async function fetchThreadsMetrics(postId) {
  const token = process.env.THREADS_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return {};
  const url = `https://graph.threads.net/v1.0/${postId}?fields=like_count,reply_count,view_count&access_token=${token}`;
  const res = await fetch(url);
  if (!res.ok) return {};
  const data = await res.json();
  return { views: data.view_count || 0, likes: data.like_count || 0, replies: data.reply_count || 0 };
}

async function fetchInstagramMetrics(igMediaId) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return {};
  const url = `https://graph.facebook.com/v20.0/${igMediaId}?fields=like_count,comments_count,impressions&access_token=${token}`;
  const res = await fetch(url);
  if (!res.ok) return {};
  const data = await res.json();
  return { views: data.impressions || 0, likes: data.like_count || 0, comments: data.comments_count || 0 };
}

async function fetchLinkedInMetrics(urn) {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!token) return {};
  const url = `https://api.linkedin.com/v2/ugcPosts/${urn}?projection=(id,author,visibility,created,timeStamp,statistics)`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return {};
  const data = await res.json();
  const stats = data?.statistics?.view?.total || 0;
  const likes = data?.statistics?.likes?.total || 0;
  const comments = data?.statistics?.comments?.total || 0;
  return { views: stats, likes, comments };
}

async function fetchRedditMetrics(postTarget) {
  try {
    const client = new RedditClient();
    if (!client.isConfigured()) return {};

    // Extract fullname or id: e.g. "t3_1abcde", "1abcde", or URL "https://reddit.com/r/.../comments/1abcde/..."
    let fullname = postTarget;
    if (fullname.includes('/comments/')) {
      const parts = fullname.split('/comments/')[1]?.split('/');
      const id36 = parts?.[0];
      if (id36) fullname = `t3_${id36}`;
    } else if (!fullname.startsWith('t3_')) {
      fullname = `t3_${fullname}`;
    }

    const metrics = await client.getPostMetrics(fullname);
    if (!metrics) return {};

    return {
      views: metrics.viewCount || 0,
      likes: metrics.score || metrics.ups || 0,
      comments: metrics.numComments || 0,
      upvote_ratio: metrics.upvoteRatio || 1.0,
    };
  } catch (err) {
    console.warn(`Could not fetch Reddit metrics: ${err.message}`);
    return {};
  }
}

async function fetchPinterestMetrics(postTarget) {
  try {
    const client = new PinterestClient();
    if (!client.isConfigured()) return {};

    let pinId = String(postTarget || '').trim();
    if (pinId.includes('/pin/')) {
      pinId = pinId.split('/pin/')[1]?.replace(/\/.*$/, '');
    }

    if (!pinId) return {};

    const analytics = await client.getPinAnalytics(pinId);
    return {
      views: analytics.impressions || 0,
      likes: analytics.saves || 0,
      comments: 0,
      shares: analytics.outboundClicks || 0,
    };
  } catch (err) {
    console.warn(`Could not fetch Pinterest metrics: ${err.message}`);
    return {};
  }
}

async function fetchYouTubeMetrics(target) {
  try {
    const client = new YouTubeClient();
    if (!client.isConfigured()) return {};

    const videoId = String(target).replace(/^.*[=/]/, '');
    const stats = await client.getVideoMetrics(videoId);
    return {
      views: stats.views || 0,
      likes: stats.likes || 0,
      comments: stats.comments || 0,
    };
  } catch (err) {
    console.warn(`Could not fetch YouTube metrics: ${err.message}`);
    return {};
  }
}

async function main() {
  const calendarPath = path.resolve('campaign/antigravity-2026-09-06-19/publishing-calendar.csv');
  const metricsPath = path.resolve('campaign/antigravity-2026-09-06-19/metrics.csv');
  const calendarRows = await readCsv(calendarPath);
  const metricRows = await readCsv(metricsPath);

  for (const entry of calendarRows) {
    const { delivery_id, platform, post_url } = entry;
    let metrics = {};
    try {
      if (platform === 'x') {
        const tweetId = post_url?.split('/').pop();
        metrics = await fetchXMetrics(tweetId);
      } else if (platform === 'threads') {
        const threadId = post_url?.split('/').pop();
        metrics = await fetchThreadsMetrics(threadId);
      } else if (platform === 'instagram' || platform === 'ig') {
        const mediaId = post_url?.split('/').pop();
        metrics = await fetchInstagramMetrics(mediaId);
      } else if (platform === 'linkedin') {
        const urn = entry.linkedin_urn; // assume column exists or embed in post_url
        metrics = await fetchLinkedInMetrics(urn);
      } else if (platform === 'reddit') {
        const target = entry.reddit_id || entry.post_id || post_url;
        metrics = await fetchRedditMetrics(target);
      } else if (platform === 'pinterest') {
        const target = entry.pinterest_id || entry.pin_id || entry.post_id || post_url;
        metrics = await fetchPinterestMetrics(target);
      } else if (platform === 'youtube') {
        const target = entry.youtube_id || entry.video_id || entry.post_id || post_url;
        metrics = await fetchYouTubeMetrics(target);
      }
    } catch (e) {
      console.warn('Failed metrics for', delivery_id, e);
    }
    const newRow = { delivery_id, platform, ...metrics, metric_source: 'api_fetch', captured_at_ist: new Date().toISOString() };
    upsertRow(metricRows, 'delivery_id', newRow);
    // be gentle to APIs
    await sleep(1200);
  }

  await writeCsv(metricsPath, metricRows);
  console.log('Metrics CSV updated');
}

main().catch((e) => console.error('Fetch script error', e));
