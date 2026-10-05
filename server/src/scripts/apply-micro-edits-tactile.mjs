import pg from 'pg';
import dotenv from 'dotenv';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
dotenv.config({ path: 'server/.env' });

const POST_ID = '1f76712c-6c85-43b4-8ba1-132fa7c8b539';

const REVISED_TITLE = "The Tactile Sanctuary: Why Print Feels New Again to Gen Z";
const REVISED_SUMMARY = "Perhaps the most radical feature of a book is that nothing happens when you touch the page. Why younger readers are finding quiet utility in paper.";

const REVISED_CONTENT = `Perhaps the most radical feature of a book is that nothing happens when you touch the page.
A phone is never merely waiting.
Even when its screen is dark, it contains weather, messages, photographs, payments, headlines, maps, arguments, videos, work and the possibility that somewhere, someone has replied.
A book contains a book.
That limitation is beginning to feel luxurious.
Among U.S. Gen Z readers, something interesting is happening. The cohort most thoroughly surrounded by digital media is not abandoning print as an obsolete container. Many are choosing it deliberately.
In a 2025 nationally representative U.S. survey of 2,000 Gen Z respondents, researchers Kathi Inman Berens and Rachel Noorda found that 66 percent identified as readers, up 14 percentage points from 2022. The Cambridge University Press study found print remained the preferred format, with the researchers connecting that preference partly to a desire for digital detox. A summary by RELEVANT noted that 65 percent had read at least one print book during the previous twelve months. ([DOI](https://doi.org/10.1017/9781009732857?utm_source=chatgpt.com)) ([RELEVANT](https://relevantmagazine.com/culture/gen-z-is-reading-more-not-less-and-theyre-going-back-to-print/?utm_source=chatgpt.com))
This is not simply nostalgia.
You cannot be nostalgic for a world you barely inhabited.
Something else is going on.

A medium that refuses to interrupt you

Open a paperback to page 147.
Page 147 does not vibrate.
It does not suggest three other pages you may enjoy.
It does not tell you that people who read this paragraph also liked another paragraph.
There is no red circle in the corner announcing that seven things require your attention.
The sentence simply waits.
That sounds trivial until you spend enough time inside modern interfaces.
Digital products are designed around possibility. Every surface can lead somewhere else. Every moment can contain another action.
The physical page behaves differently.
Its boundaries are visible.
The text begins here.
The text ends there.
The remaining pages have literal weight in your hand.
Reading becomes spatial.
You remember that a passage appeared near the top of a left-hand page. You notice the bend in the spine. Your thumb slowly migrates from a thick block of unread pages toward a thick block of finished ones.
The book does not merely deliver language.
It gives language a body.

Reading together, silently

An even stranger phenomenon has grown alongside sustained interest in print: people are gathering in public specifically to spend part of the time not talking.
Silent Book Club now describes itself as a community of more than a million members across 2,200-plus chapters in 70 countries.
There is no common assigned title. People arrive with their own books, sit together and read. ([Silent Book Club](https://silentbook.club/?utm_source=chatgpt.com))
Consider how odd that would sound to an earlier internet age.
The web promised to connect readers across continents.
Now some readers are using the internet to locate a nearby room where everybody will put the internet away.
Traditional book clubs organize belonging around agreement: we read the same book, then discuss it.
Silent reading groups organize belonging around presence.
Your Dostoevsky does not have to speak to my romance novel.
Nobody is required to produce an interpretation.
For an hour, the shared activity is simply sustained attention.
That may be one of the rarest forms of companionship left.

The attention crisis is partly architectural

We often talk about distraction as though it were a personal moral failure.
You should focus harder.
Disable notifications.
Develop discipline.
Try another productivity system.
But attention does not exist independently of environment.
A person reading a novel on a phone is using the same object that contains work email, social media, breaking news, banking alerts, group chats and short-form video.
The reader is being asked to exercise restraint every few minutes against a device on which switching is nearly frictionless.
Paper changes the architecture.
There is nowhere else to go.
The constraint becomes assistance.
A separate consumer survey commissioned by ThriftBooks reported that 63 percent of Gen Z respondents intentionally disconnect from devices, pointing to analogue habits including physical notebooks, printed books and paper calendars as ways to construct personal boundaries against continuous screen use. ([RELEVANT](https://relevantmagazine.com/culture/tech-gaming/gen-z-is-cutting-back-on-screen-time-more-than-any-other-generation/?utm_source=chatgpt.com))
We keep trying to solve attention with better software.

Ownership feels different from access

A physical book usually gives the reader a simpler form of possession than platform-bound digital access.
It remains where you left it.
No service needs to remain solvent.
No password needs to be remembered.
No catalog needs to renew its rights.
If you buy a battered copy of a novel and leave it untouched for twenty years, it will still be there, perhaps slightly yellower and carrying the faint smell of whichever room stored it.
That permanence is inefficient.
It requires shelves.
It gathers dust.

The new luxury is undivided attention

For decades, technology companies competed to eliminate waiting.
Faster loading.
Faster communication.
Faster delivery.
Faster answers.
Now a different scarcity has appeared.
We have extraordinary access to information and increasingly fragmented access to ourselves.
A physical book cannot repair that alone.
Reading on paper does not automatically make anyone wiser, calmer or more serious.
But it creates a small environment in which sustained thought has a fighting chance.
Perhaps this explains why print can feel unexpectedly modern.
Not because the book changed.
Because everything around it did.
The page remained quiet while the rest of the world became louder.
And somewhere inside that silence, many readers raised with infinite scroll are rediscovering one of culture's oldest technologies:
the ability to stay.`;

async function applyMicroEdits() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database.');

    const res = await client.query(`
      UPDATE public.posts
      SET title = $1,
          summary = $2,
          content = $3,
          updated_at = NOW()
      WHERE id = $4
      RETURNING id, title, slug, status, updated_at
    `, [REVISED_TITLE, REVISED_SUMMARY, REVISED_CONTENT, POST_ID]);

    if (res.rowCount === 0) {
      console.error('Post not found!');
      return;
    }

    const updated = res.rows[0];
    console.log('SUCCESS! Applied 3 micro-edits to post:');
    console.log('ID:', updated.id);
    console.log('Title:', updated.title);
    console.log('Slug:', updated.slug);
    console.log('Updated At:', updated.updated_at);

    // Regenerate SEO feeds so sitemaps and RSS are refreshed
    console.log('\nRegenerating SEO sitemaps and RSS feed...');
    const { stdout, stderr } = await execAsync('node server/src/scripts/generate-seo-feeds.mjs');
    console.log(stdout);
    if (stderr) console.error(stderr);

  } catch (err) {
    console.error('Error applying micro-edits:', err);
  } finally {
    await client.end();
    console.log('Database client closed.');
  }
}

applyMicroEdits();
