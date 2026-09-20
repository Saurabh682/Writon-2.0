import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CAMPAIGN_DIR = path.resolve(__dirname, '..');

/**
 * Simple CSV parser for content-calendar.csv
 */
export function parseCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Handle quoted commas
    const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
    const matches = [];
    let match;
    while ((match = regex.exec(rawLine)) !== null) {
      if (match.index === regex.lastIndex) regex.lastIndex++;
      let val = match[1] ?? '';
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1).replace(/""/g, '"');
      }
      matches.push(val.trim());
      if (regex.lastIndex >= rawLine.length) break;
    }

    if (matches.length > 0) {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = matches[idx] || '';
      });
      rows.push(obj);
    }
  }

  return rows;
}

const HUMAN_FEATURE_DAYS = new Set([3, 5, 6, 10, 11, 16, 19, 20, 23, 24, 27, 28]);

function approvedHumanFeature(dayNumber, expectedLanguage) {
  if (!HUMAN_FEATURE_DAYS.has(dayNumber)) return null;
  const allowlistPath = path.join(CAMPAIGN_DIR, 'human-content-allowlist.csv');
  const rows = parseCsv(fs.readFileSync(allowlistPath, 'utf8'));
  const approved = rows.find((row) => (
    Number(row.planned_day) === dayNumber
    && row.language === expectedLanguage
    && ['approved', 'granted', 'rights_verified'].includes(row.consent_status)
    && row.source_story_id
    && row.author_id
    && row.approved_excerpt
    && row.reviewed_by
    && row.reviewed_at
  ));
  if (!approved) {
    return THEME_CORPUS[dayNumber] || null;
  }
  return {
    title: approved.story_slug.replaceAll('-', ' '),
    excerpt: approved.approved_excerpt,
    author: approved.author_display_name,
    lang: approved.language,
  };
}

/**
 * Curated content corpus for Day 1–30 themes
 */
export const THEME_CORPUS = {
  1: {
    title: 'Words Matter. Stories Endure.',
    excerpt: 'In an era of relentless noise and algorithms, WritOn exists for the quiet power of the written word. No ads, no popups. Just pure, focused storytelling.',
    author: 'WritOn Manifesto',
    lang: 'en'
  },
  2: {
    title: 'A Calmer Writer’s Desk',
    excerpt: 'Designed with distraction-free manuscript typography, real-time autosave, and zero clutter. Write your next chapter in peace.',
    author: 'WritOn Editor',
    lang: 'en'
  },
  3: {
    title: 'शब्दों का अपना एक सफर होता है',
    excerpt: 'कभी खामोशी में बहते हैं, कभी पन्नों पर ठहर जाते हैं। अपनी कहानियों और कविताओं को दीजिए एक शांत, सुंदर आशियाना।',
    author: 'WritOn Community',
    lang: 'hi'
  },
  4: {
    title: 'Weekly Writing Prompt',
    excerpt: '“The train stopped at a station not on any map.” Complete the story in 200 words on WritOn.',
    author: 'Prompt #01',
    lang: 'en'
  },
  5: {
    title: 'Voice of the Independent Writer',
    excerpt: 'Every great book began as a simple thought written down before bedtime. Keep writing, chapter by chapter.',
    author: 'Author Spotlight',
    lang: 'en'
  },
  6: {
    title: 'প্রতিটি শব্দের পেছনে একটি গল্প থাকে',
    excerpt: 'আপনার না-বলা কথাগুলোকে দিন এক সুন্দর রূপ। রিটঅন-এ লিখতে ও পড়তে শুরু করুন আজই।',
    author: 'WritOn Bangla',
    lang: 'bn'
  },
  7: {
    title: 'The Sunday Chapter Challenge',
    excerpt: 'Draft one scene today. 300 words. No backspacing, no second-guessing. Share it with readers who care.',
    author: 'WritOn Community',
    lang: 'en'
  },
  8: {
    title: 'पढ़ने का सुकून, बिना किसी विज्ञापन के',
    excerpt: 'जब कहानी अच्छी हो, तो बीच में कोई रुकावट नहीं होनी चाहिए। रिटॉन पर सिर्फ आप और आपके पसंदीदा लेखक।',
    author: 'WritOn Hindi',
    lang: 'hi'
  },
  9: {
    title: 'आज का लेखन संकेत',
    excerpt: '“दरवाज़े पर एक पुरानी चिट्ठी रखी थी, जिस पर कोई नाम नहीं था...” आगे क्या हुआ? लिखिए रिटॉन पर।',
    author: 'WritOn Hindi',
    lang: 'hi'
  },
  10: {
    title: 'The Art of the First Line',
    excerpt: 'A first line should hook the heart, not just the eyes. Discover indie stories crafted with pure devotion.',
    author: 'WritOn Readers',
    lang: 'en'
  },
  11: {
    title: 'शब्दांची जादू अनुभवा',
    excerpt: 'कथा, कविता आणि विचारांचे एक सुंदर व्यासपीठ. शांत आणि जाहिरातमुक्त वाचनाचा नवा अनुभव.',
    author: 'WritOn Marathi',
    lang: 'mr'
  }
};

/**
 * Platform specific hashtag sets
 */
const HASHTAGS = {
  ig: '#WritOn #WritOnApp #ReadingCommunity #ShortStories #IndieAuthors #Storytelling #AdFreeReading',
  threads: '#WritOn #WritingCommunity #IndieWriters #Books',
  x: '#WritOn #WritingCommunity #AmWriting #IndieAuthors',
  pin: '#WritOn #WritingCommunity #StoryIdeas #ReadingCommunity #AdFreeApp'
};

/**
 * Builds ready-to-post content bundle for a specific day
 */
export function buildDayContent(dayNumber) {
  const calendarPath = path.join(CAMPAIGN_DIR, 'content-calendar.csv');
  const calendarText = fs.readFileSync(calendarPath, 'utf8');
  const allRows = parseCsv(calendarText);

  const dayRows = allRows.filter(r => parseInt(r.day, 10) === dayNumber);
  const plannedLanguage = dayRows[0]?.language || 'en';
  const themeData = approvedHumanFeature(dayNumber, plannedLanguage) || THEME_CORPUS[dayNumber] || {
    title: `Day ${dayNumber} Literary Inspiration`,
    excerpt: `Discover quiet, ad-free reading and writing on WritOn. Read indie stories from passionate storytellers.`,
    author: 'WritOn Community',
    lang: plannedLanguage
  };

  const platformPosts = dayRows.map(row => {
    const platform = row.platform;
    const deliveryId = row.delivery_id;
    const linkUrl = `https://writon.cc/go/${deliveryId}`;

    let caption = '';
    let headline = themeData.title;
    let body = themeData.excerpt;

    if (platform === 'x') {
      // X 280-char limit
      caption = `${headline}\n\n“${body.slice(0, 140)}...”\n\nRead more & write ad-free:\n${linkUrl}\n\n${HASHTAGS.x}`;
    } else if (platform === 'threads') {
      caption = `${headline}\n\n${body}\n\n📖 Read on WritOn (Ad-free on Google Play):\n${linkUrl}\n\n${HASHTAGS.threads}`;
    } else if (platform === 'pin') {
      caption = `${headline}\n\n${body}\n\n• Ad-free reading\n• Minimalist manuscript writer\n• Available on Google Play\n\n${linkUrl}`;
    } else {
      // Instagram / Facebook
      caption = `${headline}\n\n“${body}”\n\n✨ Tap the link in bio to download WritOn and explore thousands of indie stories without intrusive ads.\n\n🔗 Direct Link: ${linkUrl}\n\n${HASHTAGS.ig}`;
    }

    return {
      day: dayNumber,
      date: row.date,
      platform,
      deliveryId,
      linkUrl,
      contentType: row.content_type,
      language: row.language,
      caption,
      themeData
    };
  });

  return {
    day: dayNumber,
    themeData,
    posts: platformPosts
  };
}
