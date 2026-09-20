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

const TARGET_POST_ID = 'd91ac46f-e8fb-4e7b-a7a1-6fa2abab7b3d';
const NEW_TITLE = 'Mrs Menon Has Left the Group';

const TIGHTENED_CALIBRATED_STORY = `### 6:12 AM

Palm Meadows Phase II, Block B, is technically a residential complex of seventy-two flats overlooking a bypass drainage canal. Administratively, it is a nuclear-armed constitutional republic governed by five men with bifocals and Samsung tablets who believe that if they ever surrender group administrator privileges, civilization itself will unravel before lunchtime.

The opening salvo arrived while the morning milk sat on the doormat.

Mr. Pillai (Flat 204) posted a screenshot from his newsfeed. It was an update from the second week of *Bigg Boss Malayalam Season 8*. Rahul Easwar had become house captain.

Mr. Pillai wrote:
> *“Rahul Easwar is captain!!!!!!!!!!!!!!!!!!! Mark my words, from today nobody will get tea on time in that house!!!!!!!!!!!!!!!!!!!”*

He included nineteen exclamation marks. Mr. Pillai considers punctuation a form of supporting documentation.

### 6:18 AM

Rajan from Flat 302 replied within six minutes. Rajan does not watch television, but he has not missed an opportunity to declare an ideological position on WhatsApp since the building’s solar panel tender of 2019.

> *“Obvious trap,”* Rajan typed. *“Easwar will deliberately weaponize kitchen duties. In twenty-four hours he will have the smokers and the non-smokers forming separate voting blocs. A captain who controls the ginger quota controls the house.”*

### 6:21 AM

At exactly 6:21 AM, the Executive Committee crossed the border.

Mr. T. S. Sundaram, Society Secretary (Flat 402), activated his keyboard. Sundaram types entirely in capital letters to convey statutory authority, regardless of whether he is announcing an emergency diesel generator overhaul or inquiring about an unclaimed green plastic bucket near the basement water meter.

> *“DEAR ESTEEMED RESIDENTS. PLEASE NOTE. THIS IS PALM MEADOWS OFFICIAL RESIDENTS GROUP (COMMUNICATION WINDOW: 7:00 AM TO 9:00 PM AS PER 2018 BYE-LAWS). TELEVISION REALITY PROGRAMMES HAVE ZERO BEARING ON DRAINAGE CLEARANCE OR LIFTS MAINTENANCE. CONFINE POSTS STRICTLY TO MUNICIPAL MATTERS.”*

### 6:22 AM

Flat 507 did not wait thirty seconds.

Kurup has lost three consecutive committee elections to Sundaram and still refers to the 2019 security-bulb tender as "the incident." Kurup does not recognize Sundaram’s 7:00 AM embargo. Kurup considers the 7:00 AM embargo an unconstitutional suspension of civil liberties.

> *“Why is Secretary sir suppressing spontaneous cultural discourse?”* Kurup replied. *“If residents cannot discuss contemporary Malayalam media in their own paid building group, why did we pay twenty-four thousand rupees for the clubhouse Wi-Fi router? Is Block B a cooperative housing society or a central prison?”*

### 6:27 AM

At 6:27 AM, somebody whose flat number is not saved in my contacts initiated a poll:

**“SHOULD BIGG BOSS DISCUSSION BE PERMITTED IN MAIN GROUP?”**
- *Option 1: Yes, until 8:00 AM (7 votes)*
- *Option 2: No, move to Cultural Sub-Group (12 votes)*
- *Option 3: Security guard is still refusing Amazon packages after 8:00 PM (31 votes)*

Within three minutes, Option 3 was leading by a landslide.

### 6:31 AM

Sundaram deleted the poll.

Under WhatsApp’s admin privileges, the screen displayed the single most authoritarian phrase in contemporary Indian domestic life:
*“This poll was deleted by an admin.”*

Sundaram followed with an attachment: a scanned, crooked PDF of the 2018 Bye-Laws, Section 14, Subsection (b): *“Use of Common Areas for Activities Other Than Residential Purpose.”*

> *“ONE MORE IRRELEVANT POST AND GROUP SETTING WILL BE CONVERTED TO ‘ONLY ADMINS CAN SEND MESSAGES’ TILL SUNDAY AGM.”*

### 6:34 AM

The chat froze.

To threaten fifty-eight families with admin-only mode before breakfast is the equivalent of imposing emergency rule.

Then came the turn.

At 6:34 AM, Mrs. Menon (Flat 601) entered the thread. Mrs. Menon has lived in Block B since 2012. She has never spoken on WhatsApp. She did not vote in the solar panel tender. She did not reply when the basement flooded during the 2021 monsoon. She pays her maintenance six months in advance by demand draft delivered by hand in an unmarked manila envelope.

Mrs. Menon typed five words:
> *“I am leaving this group.”*

A grey notification immediately dropped onto the screen:
*“Mrs. Menon left.”*

### 6:35 AM

At 6:35 AM, before the collective silence could register, her husband, Mr. Menon (Flat 601, retired LIC officer), stepped in.

Without typing a single letter of explanation or apology, Mr. Menon tapped *Add Participant*.

*“Mr. Menon added Mrs. Menon.”*

Mrs. Menon was back inside the house.

### The Confession Room

I set my phone on the dining table and looked across at the kitchen.

My wife Meera was slicing onions. She didn't look at her phone. She keeps the society group on permanent one-year mute.

“What is happening over there?” she asked without turning around.

“Rahul Easwar is captain,” I said. “Kurup accused Sundaram of authoritarianism. Someone tried to audit Amazon couriers through a poll. Sundaram threatened Section 14(b). Mrs. Menon resigned and was reinstated within fifty-two seconds.”

Meera scraped the onions into a stainless-steel plate. “They are criticizing the Bigg Boss contestants for forty-five minutes every night,” she said, “while running the exact same reality show for eleven years on the fourth floor.”

Palm Meadows has had weekly nominations since 2016. The lift lobby is our confession room, and every AGM contains at least one attempted eviction.

### 6:44 AM

From the terrace roof above Flat 402, the water motor shut off with a sharp, mechanical clack.

The pipes shuddered once through the shaft.

My phone buzzed.

A single message popped up from Secretary Sundaram:
> *“WATER MOTOR OFF. WHO SWITCHED IT ON BEFORE 7:00 AM?”*

At the bottom of the screen, the indicator appeared:
*Forty-seven people are typing...*

---

#humour #satire #apartmentlife #residentassociation #palmmeadows #biggboss

#writon`;

async function run() {
  try {
    console.log(`Checking post ${TARGET_POST_ID}...`);
    const res = await pool.query('SELECT id, title, content FROM public.posts WHERE id = $1', [TARGET_POST_ID]);
    if (res.rows.length === 0) {
      console.error('Post not found in database!');
      return;
    }

    console.log(`Updating post ${TARGET_POST_ID} with tightened text...`);
    await pool.query(
      `UPDATE public.posts 
       SET title = $1, 
           content = $2, 
           updated_at = NOW() 
       WHERE id = $3`,
      [NEW_TITLE, TIGHTENED_CALIBRATED_STORY, TARGET_POST_ID]
    );

    const verify = await pool.query('SELECT id, title, updated_at FROM public.posts WHERE id = $1', [TARGET_POST_ID]);
    console.log('Successfully updated post to tightened version:', verify.rows[0]);
  } catch (err) {
    console.error('Error updating post in DB:', err);
  } finally {
    await pool.end();
  }
}

run();
