import dotenv from 'dotenv';
import pg from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const TARGET_POST_ID = '89a76a84-b38d-47d0-ba27-56b88b95d5b5';
const TITLE = 'The Shadow Premium';
const SUMMARY = 'In the shadow of primary capital markets, the informal Grey Market Premium compresses investor impatience into an unregulated price before trading officially begins.';

const CALIBRATED_ESSAY = `*September 7, 2026*

Before an exchange ever rings its opening bell, an unofficial price has already taken shape.

In the second week of September, twelve initial public offerings opened across the Indian capital markets. In financial reporting by *Business Standard*, two names led the informal pre-listing tracking tables: Rentomojo and Pranav Constructions. The number drawing attention across financial portals was not simply the company's price band or published financial statements. It was an unofficial metric: the Grey Market Premium (GMP).

For Pranav Constructions, which opened its subscription book on September 7, the informal market indicated a premium hovering around thirty-five percent over its issue price. 

GMP compresses a messy collection of expectations into one unofficial number: the premium over an IPO's issue price at which its shares are being valued in the grey market before listing. It is neither an exchange quotation nor a guaranteed listing price. Around it sits a related market in IPO applications, including *kostak* and *subject-to-sauda* arrangements. In a *kostak* agreement, a buyer pays for an application regardless of whether shares are allotted; in *subject-to-sauda*, payment depends strictly on an allotment occurring.

Beside the official primary market—with its SEBI-mandated disclosures, funds blocked through ASBA, demat linkages, and a regulated basis of allotment—sits this parallel price-discovery engine. It operates through personal networks, informal dealer networks, and off-exchange agreements.

Why does an investor care about an unofficial quote attached to shares that are not yet traded?

Perhaps the premium is partly the price of impatience: the amount people are willing to pay to turn tomorrow's uncertainty into today's number. In some households, eligible family members submit separate applications through their own PAN-linked demat and bank accounts, giving the household more than one independent chance at allotment. Yet the few working days between subscription close, allotment, and exchange listing feel interminable. The shadow market satisfies a psychological demand before the formal market can deliver an outcome.

Those transactions sit outside the settlement, grievance-redressal and investor-protection mechanisms available on recognized exchanges. Settlement therefore depends heavily on the dealer network and counterparties honoring their informal agreements. If market sentiment turns or an issue lists at a discount, there is no exchange guarantee to absorb a counterparty default.

The shares are not yet trading on an exchange screen. Yet thousands of people can already tell you what they think they are worth.

---

#marketmechanisms #finance #priceaction #economicpsychology #capitalmarkets

#writon`;

async function run() {
  try {
    console.log(`Checking post ${TARGET_POST_ID}...`);
    const res = await pool.query('SELECT id, title, content FROM public.posts WHERE id = $1', [TARGET_POST_ID]);
    if (res.rows.length === 0) {
      console.error('Post not found in database!');
      return;
    }

    console.log(`Found post "${res.rows[0].title}". Updating with calibrated essay...`);
    await pool.query(
      `UPDATE public.posts 
       SET title = $1, 
           summary = $2,
           content = $3, 
           updated_at = NOW() 
       WHERE id = $4`,
      [TITLE, SUMMARY, CALIBRATED_ESSAY, TARGET_POST_ID]
    );

    const verify = await pool.query('SELECT id, title, summary, updated_at FROM public.posts WHERE id = $1', [TARGET_POST_ID]);
    console.log('Successfully updated post:', verify.rows[0]);
  } catch (err) {
    console.error('Error updating post in DB:', err);
  } finally {
    await pool.end();
  }
}

run();
