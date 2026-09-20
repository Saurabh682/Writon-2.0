import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/VibeCode/WritOn-PowerUp/server/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const TARGET_POST_ID = '44072d8c-96b6-4079-8fa5-9e390c11889f';
const NEW_TITLE = 'Who Gets to Pause on Labor Day?';
const NEW_SUMMARY = 'On Labor Day 2026, as New York equity floors fall silent, Dr. Sunita Banerjee examines the gap between the labor commemorated by stopping a market and the labor that cannot afford to pause.';

const CALIBRATED_CONTENT = `*September 7, 2026*

Financial outlets began the week answering a simple question: is the U.S. stock market closed today?

The answer was straightforward: regular equity trading sessions on the New York Stock Exchange and Nasdaq were suspended for Labor Day. For investors and market watchers accustomed to the second-by-second flicker of equity indices, the calendar offered an administrative interruption.

The labor movement that produced the holiday in the late nineteenth century also fought over something more fundamental than wages: control over time. The campaign for an eight-hour workday—dividing the day into work, rest, and personal life—was an effort to establish physical boundaries against uninterrupted industrial extraction. That wider labor movement eventually succeeded in turning Labor Day itself into law.

Yet the modern financial market has created its own temporal architecture. In university seminars on comparative literature, we examine how modernist writers like Virginia Woolf and James Joyce registered the tyranny of public timekeepers—the striking of Big Ben or parish bells measuring individual lives from above. Today, our master clock is no longer a municipal bell tower. It is the continuous electronic ticker. It tells us, second by second, what financial markets are willing to pay for thousands of claims on the future.

When regular trading halts on a Monday, it is tempting to treat the quiet as a shared social pause—an hour when modern acceleration relents. But that reflection quickly encounters a harder reality.

The stock exchange closes for Labor Day, yet many workers still report for shifts. Retail employees ring up purchases; grocery workers restock shelves; restaurant and travel workers serve a holiday public. The financial system pauses equity clearing while other markets, including some futures and overseas venues, continue on their own schedules. Meanwhile, consumer-facing infrastructure remains fully active because halting it would be economically inconvenient.

At half-past nine in Manhattan, no opening bell sounds. Across the country, grocery stores and retailers are already doing business. The holiday does not suspend labor. It reveals which kinds of labor our institutions are prepared to suspend.

### Sources
- *Livemint*: [Stock Market Holiday: Is the US stock market closed today for Labour Day 2026?](https://news.google.com/rss/articles/CBMixwFBVV95cUxPeWY1Q2NuZ0RibnpNektPTEp2VDMwdjBjZnVlOGFna0hyNDh1Q0NpZmYySlI3X04wajBrUEc2Z1B0TG9DX2dhT2hqSXBYVEhEaXlXcElzTWJFeHY5ZGhFdU5ESVRvSVZTcjBKUWp5Ti1LLVpfeXJuaksxUkV5bkZTZGxJamhfbHlHb0VSZURnLXF1QWpiRmtxSTZTSUVuWE1HbllsLWtSYjhRTHVxa0tuVmRWSEZWZU10ZHU0YWMxUTFiNlZ2aDk00gHMAUFVX3lxTE5uVDIxeUR5bzMzcDROTXphUEJTQ1owRGRTdkVWZWJ3ZjdvOTNUWUVOTFJoY1V4d0haaDJLcWhwbXI4bkhyQTFObXNCWFVYeWFJWUFqNWF6SHRPdU0yMEljT2lRV3RiUjlNQi1CbVg0NU4xNzJhWG0xeXhVTlByT3ZmR1BzbTFBSG13ZXN2U1M0V3hpUmpkcV9XcnRMTXdiOWxNaVZvUHUyX2tEN0szeWlxMkxsRnR6ZzBXVDRfMVNLWGR1bGxGcEQtM3JJUg?oc=5)
- *Yahoo Finance*: [Is the stock market open on Labor Day? NYSE, Nasdaq hours today](https://news.google.com/rss/articles/CBMilwFBVV95cUxPb3RIYTBubGxwUUxBRTRiNm9uTG5uampkdXpSRFJ5QkdLSGJXYU9DaDRMWHRCYUFvQlRLT3NrbGU0b3h2Y2J5U3EtSW9ydkdIb1psRG9hVTVyR1c2WTJUQzhBaW9vWVdYeURQSWxtSTFmSFpsWlkzYU9qUGxKbVQ2d1k4OW4tV1JWblNLaUgzZXV2dDVDUkpV?oc=5)
- *Upstox*: [Are US markets closed today for Labor Day?](https://news.google.com/rss/articles/CBMi8AFBVV95cUxQVXlKNTlTRGVHLU5SbE1pQjBsY1R3Zi1PY29TeDFPZTJhTllQa0dHdlA3dngyWGtpLXU2bmp0UEZWMDRuWHZmOGlQclNXQ1NraUdnZGFfRzBaLVdjbkpkYnB4clBfNGI4TmhreldQdG1RZmdHN196S2ZVTE1kVGFiRF9ydWYzd1VpSHhhWFNUeUZhZk95V2xJQnU1d1VBRDd1RjgzUFgwLWFNWXNiRTZEd2hHWlFxOVBHNzNPTENuX0ZlNFNTQVM0UUFYdjU4SmNHSi14NF9vWWVWZllSVU1fXzUtaFFER0ZTMlRpOW1raEg?oc=5)
- *Detroit Free Press*: [Is the stock market closed today? Why you can't trade stocks on Labor Day](https://news.google.com/rss/articles/CBMiwgFBVV95cUxOU1VEcG16d1lKRTZaLU11cTdWN0pHZW0teUxIZExwdnU2UDh3d29CM3dkb1cxblc5Unl5S1lNVUZ4aUFCUWJZUFpIdGJwdFFQbFlzcDVmQldBdml6X1E5c3ZVS0ZxLU1sWWRRQTVlb2UzX0FMY2I0MVJmNnhkZ1hBeGlpZ190bXVhT3ducnpxQ0pwUHFSeVZfZmdPUnhfU0F5aGxtSXhtWEZtS0hjd0d1Rk5JY19KRDBDWU8zeTA4U3diQQ?oc=5)

---

#laborday #work #markets #time #essays #economiclife

#writon`;

async function run() {
  try {
    console.log(`Checking post ${TARGET_POST_ID}...`);
    const res = await pool.query('SELECT id, title, content FROM public.posts WHERE id = $1', [TARGET_POST_ID]);
    if (res.rows.length === 0) {
      console.error('Target post not found!');
      return;
    }

    console.log(`Found post "${res.rows[0].title}". Updating with rebuilt essay...`);
    const updateRes = await pool.query(`
      UPDATE public.posts
      SET title = $1,
          summary = $2,
          content = $3,
          updated_at = NOW()
      WHERE id = $4
      RETURNING id, title, summary, updated_at;
    `, [NEW_TITLE, NEW_SUMMARY, CALIBRATED_CONTENT, TARGET_POST_ID]);

    console.log('Successfully updated post in PostgreSQL:', updateRes.rows[0]);
  } finally {
    await pool.end();
  }
}

run().catch(console.error);
