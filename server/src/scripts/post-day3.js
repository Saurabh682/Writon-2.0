import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { renderDay3EnglishGroundFloorCarousel, renderDay3HindiPoemCarousel } = await import('../services/social-card-generator.js');
const { postToInstagramCarousel, postToX, postToThreads, postToTelegram } = await import('../services/social-poster.js');

const renderedAssetsDir = path.resolve(__dirname, '../../../campaign/fomo-ground-floor/rendered-assets');
const historyFilePath = path.resolve(__dirname, '../../../campaign/published-history.json');

async function runDay3Publish() {
  console.log('================================================================');
  console.log('🚀 PUBLISHING DAY 3 DUAL CAMPAIGNS TO SOCIAL PLATFORMS');
  console.log('   Campaign A: "The Ground Floor Advantage" (English)');
  console.log('   Campaign B: "साहित्यिक कोना • बल्लीमारान" (Hindi Literary)');
  console.log('   Platforms: Instagram, X / Twitter, Threads, Telegram');
  console.log('================================================================\n');

  // Step 1: Render and verify both sets of slides
  console.log('🎨 Step 1: Rendering high-res Obsidian Dark slides (text wrapping verified)...');
  const enSlideFiles = await renderDay3EnglishGroundFloorCarousel(renderedAssetsDir);
  const hiSlideFiles = await renderDay3HindiPoemCarousel(renderedAssetsDir);

  console.log(`✅ Rendered ${enSlideFiles.length} English slides`);
  console.log(`✅ Rendered ${hiSlideFiles.length} Hindi slides\n`);

  const results = {
    day: 3,
    timestamp: new Date().toISOString(),
    campaignA_english: {
      theme: 'The Ground Floor Advantage',
      shortlink: 'https://writon.cc/go/2609_d03_ig_carousel_en_groundfloor',
      instagram: { status: 'pending' },
      x: { status: 'pending' },
      threads: { status: 'pending' },
      telegram: { status: 'pending' },
    },
    campaignB_hindi: {
      theme: 'साहित्यिक कोना • बल्लीमारान की शाम',
      shortlink: 'https://writon.cc/go/2609_d03_ig_post_hi_verified_poem_quote',
      instagram: { status: 'pending' },
      x: { status: 'pending' },
      threads: { status: 'pending' },
      telegram: { status: 'pending' },
    },
  };

  // -------------------------------------------------------------
  // PART 1: PUBLISH CAMPAIGN A (ENGLISH GROUND FLOOR ADVANTAGE)
  // -------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('📢 PART 1: PUBLISHING CAMPAIGN A — THE GROUND FLOOR ADVANTAGE');
  console.log('----------------------------------------------------------------\n');

  const enHashtags = '#writon #writingcommunity #writersoftwitter #creators #poetry #storytelling #books #amwriting #readersofig';
  const enCaption = `In 2015, the first writers on Medium built massive followings.
In 2018, early Substack writers built lifelong audiences.

Right now, a new sanctuary for essays, poetry, and short fiction called WritOn is opening its doors.

Early platforms create unfair creator advantages:
• Your ideal pen name (@handle) is free right now
• Early stories are featured directly on the main Daily Deck
• 100% ad-free, quiet reading environment
• Offline-first with instant autosave

Don't wait until Year 3 to wish you had started at Day 1.

📲 Download on Google Play & claim your pen name:
https://writon.cc/go/2609_d03_ig_carousel_en_groundfloor

${enHashtags}`;

  // 1A: Instagram Carousel (English)
  console.log('📸 [1A] Publishing English Carousel to Instagram (@writon_socialapp)...');
  try {
    const igResult = await postToInstagramCarousel({
      localImagePaths: enSlideFiles,
      caption: enCaption,
    });
    results.campaignA_english.instagram = igResult;
    if (igResult.success) {
      console.log(`🎉 INSTAGRAM (EN) SUCCESS! Post ID: ${igResult.publishedPostId}`);
    } else {
      console.log('⚠️ Instagram (EN) result:', igResult);
    }
  } catch (err) {
    console.log('❌ Instagram (EN) error:', err.message);
    results.campaignA_english.instagram = { success: false, error: err.message };
  }

  // 1B: X (Twitter) Multi-Card Post (English)
  console.log('\n🐦 [1B] Publishing English Post with 4 Cards to X (@WritOn_Social)...');
  try {
    const xText = `In 2015, the first writers on Medium built massive audiences.
In 2018, Substack writers built lifelong readerships.

Today, WritOn is opening its doors.

Claim your pen name before someone else does:
https://writon.cc/go/2609_d03_ig_carousel_en_groundfloor

#writon #writingcommunity #writersoftwitter #creators #amwriting`;

    const xResult = await postToX({
      text: xText,
      localImagePaths: enSlideFiles.slice(0, 4),
    });
    results.campaignA_english.x = xResult;
    if (xResult.success) {
      console.log(`🎉 X (EN) SUCCESS! Post ID: ${xResult.postId}`);
      console.log(`   Link: https://x.com/WritOn_Social/status/${xResult.postId}`);
    } else {
      console.log('⚠️ X (EN) result:', xResult);
    }
  } catch (err) {
    console.log('❌ X (EN) error:', err.message);
    results.campaignA_english.x = { success: false, error: err.message };
  }

  // 1C: Threads Carousel (English)
  console.log('\n🧵 [1C] Publishing English Carousel to Threads (writon_socialapp)...');
  try {
    const threadsResult = await postToThreads({
      text: enCaption,
      localImagePaths: enSlideFiles,
    });
    results.campaignA_english.threads = threadsResult;
    if (threadsResult.success) {
      console.log(`🎉 THREADS (EN) SUCCESS! Post ID: ${threadsResult.postId}`);
    } else {
      console.log('⚠️ Threads (EN) result:', threadsResult);
    }
  } catch (err) {
    console.log('❌ Threads (EN) error:', err.message);
    results.campaignA_english.threads = { success: false, error: err.message };
  }

  // 1D: Telegram Broadcast (English)
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    console.log('\n✈️ [1D] Broadcasting to Telegram Channel...');
    try {
      const tgResult = await postToTelegram({
        caption: `📖 <b>The Ground Floor Advantage</b>\n\n${enCaption}`,
        imageUrl: null,
      });
      results.campaignA_english.telegram = tgResult;
      console.log('🎉 Telegram (EN) broadcast finished:', tgResult.success);
    } catch (err) {
      console.log('⚠️ Telegram error:', err.message);
    }
  }

  // Small cooldown between campaigns to avoid Meta API rate-limiting
  console.log('\n⏳ Pausing 5 seconds before publishing Campaign B...');
  await new Promise((r) => setTimeout(r, 5000));

  // -------------------------------------------------------------
  // PART 2: PUBLISH CAMPAIGN B (HINDI LITERARY POETRY CAROUSEL)
  // -------------------------------------------------------------
  console.log('\n----------------------------------------------------------------');
  console.log('📢 PART 2: PUBLISHING CAMPAIGN B — साहित्यिक कोना • बल्लीमारान');
  console.log('----------------------------------------------------------------\n');

  const hiHashtags = '#writon #हिंदीसाहित्य #लेखक #शायरी #कविता #ग़ज़ल #delhiwriters #writingcommunity #writersoftwitter';
  const hiCaption = `इतिहास खुद को दोहराता है:
• 2015 में Medium पर लिखने वाले शुरुआती लेखक बड़े लेखक बने।
• 2018 में Substack पर आने वाले लेखकों ने सबसे मजबूत पाठक वर्ग तैयार किया।

2026 में, लेखकों और विचारकों के लिए एक नया साहित्यिक आशियाना तैयार है — WritOn!

पुरानी दिल्ली के बल्लीमारान की तंग गलियों से लेकर आज के डिजिटल युग तक — शब्दों की तासीर कभी नहीं बदलती।

यहाँ आपकी नज़्में और कहानियाँ रील्स के शोर में नहीं खोएंगी:
✨ 100% विज्ञापन-मुक्त और शांत रीडिंग
✨ आपका पसंदीदा कलमी नाम (@pen_name) अभी उपलब्ध है
✨ शुरुआती रचनाओं को मुख्य डेली डेक पर फीचर किया जा रहा है

शुरुआत आज ही करें:
📲 https://writon.cc/go/2609_d03_ig_post_hi_verified_poem_quote

${hiHashtags}`;

  // 2A: Instagram Carousel (Hindi)
  console.log('📸 [2A] Publishing Hindi Carousel to Instagram (@writon_socialapp)...');
  try {
    const igResult = await postToInstagramCarousel({
      localImagePaths: hiSlideFiles,
      caption: hiCaption,
    });
    results.campaignB_hindi.instagram = igResult;
    if (igResult.success) {
      console.log(`🎉 INSTAGRAM (HI) SUCCESS! Post ID: ${igResult.publishedPostId}`);
    } else {
      console.log('⚠️ Instagram (HI) result:', igResult);
    }
  } catch (err) {
    console.log('❌ Instagram (HI) error:', err.message);
    results.campaignB_hindi.instagram = { success: false, error: err.message };
  }

  // 2B: X (Twitter) Multi-Card Post (Hindi)
  console.log('\n🐦 [2B] Publishing Hindi Post with 4 Cards to X (@WritOn_Social)...');
  try {
    const xHiText = `बल्लीमारान की गलियों में जब शाम उतरती है... 📖

शोर के इस दौर में लफ़्ज़ों का एक शांत आशियाना। आपकी लिखी नज़्में Notes ऐप में दबी नहीं रहनी चाहिए।

आज ही अपना कलमी नाम (@pen_name) रिज़र्व करें:
https://writon.cc/go/2609_d03_ig_post_hi_verified_poem_quote

#writon #हिंदीसाहित्य #शायरी #कविता #delhiwriters #writingcommunity`;

    const xResult = await postToX({
      text: xHiText,
      localImagePaths: hiSlideFiles.slice(0, 4),
    });
    results.campaignB_hindi.x = xResult;
    if (xResult.success) {
      console.log(`🎉 X (HI) SUCCESS! Post ID: ${xResult.postId}`);
      console.log(`   Link: https://x.com/WritOn_Social/status/${xResult.postId}`);
    } else {
      console.log('⚠️ X (HI) result:', xResult);
    }
  } catch (err) {
    console.log('❌ X (HI) error:', err.message);
    results.campaignB_hindi.x = { success: false, error: err.message };
  }

  // 2C: Threads Carousel (Hindi)
  console.log('\n🧵 [2C] Publishing Hindi Carousel to Threads (writon_socialapp)...');
  try {
    const threadsResult = await postToThreads({
      text: hiCaption,
      localImagePaths: hiSlideFiles,
    });
    results.campaignB_hindi.threads = threadsResult;
    if (threadsResult.success) {
      console.log(`🎉 THREADS (HI) SUCCESS! Post ID: ${threadsResult.postId}`);
    } else {
      console.log('⚠️ Threads (HI) result:', threadsResult);
    }
  } catch (err) {
    console.log('❌ Threads (HI) error:', err.message);
    results.campaignB_hindi.threads = { success: false, error: err.message };
  }

  // Step 6: Update published history
  try {
    const raw = await fs.readFile(historyFilePath, 'utf8');
    const history = JSON.parse(raw);
    history.publishedDays['3'] = results;
    await fs.writeFile(historyFilePath, JSON.stringify(history, null, 2), 'utf8');
    console.log('\n🔒 Step 6: Published history updated with Day 3 details in published-history.json.');
  } catch (err) {
    console.log('Could not update published history file:', err.message);
  }

  console.log('\n================================================================');
  console.log('🏁 DAY 3 DUAL CAMPAIGN PUBLISHING CYCLE COMPLETE');
  console.log('================================================================');
}

runDay3Publish();
