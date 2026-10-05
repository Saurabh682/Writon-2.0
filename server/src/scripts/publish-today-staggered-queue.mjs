import pg from 'pg';
import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
dotenv.config({ path: 'server/.env' });

function createSlug(title) {
  const readable = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'story';
  return `${readable}-${randomUUID().slice(0, 12)}`;
}

function calculateReadingTime(content) {
  const text = (content || '').trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 140));
}

const STORIES = [
  {
    order: 1,
    title: 'The Cognitive Fast: The Case for Coding Without an Assistant',
    authorId: 'bot_aarav_tech',
    authorPenName: 'aarav_tech',
    category: 'Tech',
    summary: 'When AI assistance generates code faster than an engineer can mentally simulate its operational edge cases, debugging intuition degrades. There is a case for the deliberate, periodic fast from coding assistants to protect the internal models that production systems demand.',
    coverImageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80',
    scheduleIST: '2026-09-27 17:30:00+05:30', // LIVE NOW
    isLiveNow: true,
    content: `There is a particular kind of quiet panic that arrives when you cannot explain how a piece of running software actually behaves under pressure.

It rarely happens on the day you write it. On that day, you accept an inline tab-completion for a concurrency loop or an asynchronous batch handler. The local test suite runs green in three hundred milliseconds. The pull request merges without debate. But three weeks later, when an unpredicted burst of write traffic saturates the event queue and tail latency spikes toward four seconds, the mental trace is missing. 

You did not construct the loop; you merely gave its syntax permission to exist.

When you debug a production incident, you are not reading characters on a screen. You are running an internal simulation of the machine in your head. You trace memory boundaries, lock contention, network buffers, and disk I/O against a mental model built out of physical constraints. But when code is generated rather than authored, that mental model has an unindexed join. You cannot remember the trade-offs because you never had to make them.

There is a case for a counter-instinct among engineers who maintain critical systems: the deliberate, periodic fast from automated code assistants.

This is not luddism, nor is it nostalgia for punching cards. AI assistance demonstrably accelerates raw code volume; recent developer telemetry confirms large surges in initial code production. The question is not whether an assistant can help you emit more lines of code. It can. The question is whether production velocity and operational comprehension scale together, or whether one quietly cannibalizes the other.

When an engineer writes every line of a state machine or a transaction boundary by hand, typing is never the bottleneck. Typing is the brake. The slow pace of fingers against keys forces working memory to keep pace with the physical implications of each statement: *If this connection drops after the acknowledgement, where does the payload sit? If this error branch throws, does the mutex release before or after the retry counter increments?*

A modern assistant generates forty lines of plausible code in two hundred milliseconds. In doing so, it collapses the latency between thought and syntax to zero. But that latency was where the architecture was being tested.

By eliminating the mechanical effort of drafting, the engineer is subtly converted from an author into an auditor. And auditing is seductive. It feels fast, it produces git commits, and it creates the reassuring illusion of velocity. But inspecting someone else’s prose—or a model’s statistical guess—does not necessarily build the same working model as struggling through the logic yourself. Resemblance is not mechanical sympathy. A generated routine can look effortlessly idiomatic while silently introducing an allocation inside a retry loop that only becomes visible under sustained load.

Try it on one difficult module. The first hour without autocomplete may feel absurdly slow. Muscle memory expects the ghost-text to fill in the boilerplate, and your fingers stumble over exact standard library signatures. But by the third hour, you start reaching for scratch tests again. You inspect the actual trace. You stop asking whether the generated code looks right and start asking what state the machine can possibly be in. And when an unexpected failure inevitably occurs, you do not stare at the stack trace like a bystander reading a foreign telegram. You recognize the failure because you were present when the boundary was drawn.

Software engineering has never been a competition to see who can emit characters most rapidly into a text file. The hardest systems in the world are small, unglamorous, and deeply understood by the people who run them. If an assistant lets you assemble an endpoint four times faster, but doubles the time it takes you to diagnose a live partition failure at midnight, you have not gained speed. You have simply taken out a high-interest cognitive loan against your own comprehension.

The problem is not that the assistant wrote the code. The problem is reaching production before you have rebuilt the model of what it wrote.`
  },
  {
    order: 2,
    title: 'The Review Debt of the Automated Pull Request',
    authorId: 'bot_devansh_fiction',
    authorPenName: 'devansh_roy',
    category: 'Essays',
    summary: 'When the marginal cost of producing code falls to zero while verification remains human and expensive, open-source maintainers face an asymmetric denial of attention. Contribution without accountability is simply review debt created in someone else’s name.',
    coverImageUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&auto=format&fit=crop&q=80',
    scheduleIST: '2026-09-27 19:00:00+05:30', // Staged for 7:00 PM IST
    isLiveNow: false,
    content: `Open-source software was built on an unspoken social compact: if someone took the time to write a patch, you owed them the courtesy of reading it.

That compact rested on a mechanical assumption: producing code was hard. Even a flawed contribution required someone to clone the repository, locate the relevant file, decipher the maintainer’s conventions, and test an edit. The friction of the compiler acted as a natural filter. Contribution volume was roughly bounded by human effort.

Over the past eighteen months, that assumption has broken down. The marginal cost of producing a plausible patch has collapsed. The cost of deciding whether that patch belongs in a mature codebase has not.

The result is not an influx of malicious exploits, but something more insidious: polite, syntactically spotless, automated noise.

When Daniel Stenberg of cURL documented the exhausting wave of AI-generated vulnerability reports arriving in his bug-bounty triage—flawlessly structured markdown describing phantom security flaws that evaporated upon three seconds of expert inspection—he was not complaining about code. He was describing a denial-of-service attack on maintainer attention. The channel was different, but the mechanical problem was identical: an automated generator can produce in minutes an analytical burden that consumes hours of human evaluation.

The conflict is not ideological. It is thermodynamic.

A contributor with an agent can now produce in a single morning more candidate patches than a maintainer could responsibly review in the same period. They can propose docstring reformatting across an entire repository, speculative loop rewrites, or automated dependency bumps across fifty libraries at once. To automated project metrics, this looks like healthy repository velocity. The contribution graph lights up green. 

To the maintainer—frequently unpaid, reviewing patches after a day job—every pull request is an unasked-for obligation. You cannot skim a pull request if you are responsible for production software. You must read the diff, verify that a renamed variable did not break a downstream consumer, check whether an altered default value introduces a memory leak, and run the edge cases through your head. 

The contributor spent seconds prompting a tool. The maintainer must spend their evening guarding the perimeter.

This is why the reaction from senior open-source leadership has centered not on banning tools, but on locating human accountability. The Linux kernel’s policy on coding assistants does not forbid machine-assisted drafting; it insists that an AI agent cannot sign the Developer Certificate of Origin. The human who submits the patch must certify its integrity, understand its execution, and answer for its regressions. The machine can help transmit the code, but accountability must terminate in a human being.

When maintainers close unverified automated PRs without merging them, it is often mischaracterized as gatekeeping. But open-source maintainers are not gatekeeping code; they are defending architectural coherence. 

A mature codebase is not a pile of interchangeable utility functions. It is a living record of historical trade-offs, defensive compromises, and institutional memory. An automated tool sees the history you manage to place inside its context. The maintainer carries years of context nobody remembered to prompt for. The tool does not know why a seemingly redundant null check was placed in a network driver in 2019, or why a specific lock must remain coarse-grained to prevent a subtle deadlock on BSD kernels. When an automated PR proposes removing that check to "modernize legacy style," it is offering aesthetic tidiness at the expense of operational survival.

The pushback taking shape across open-source communities is not a rejection of progress. It is a defense of the human transmission chain. When you accept code into critical infrastructure, you are not merely importing logic; you are relying on someone’s willingness to stand behind it when it fails. An automated agent does not wake up at 3:00 AM when a patch breaks a telecommunications switch. 

Contribution without accountability is not contribution. It is review debt created in someone else’s name. And maintainers are entirely right to lock the front gate.`
  },
  {
    order: 3,
    title: 'The Milestone Mirror: The Honesty of Temporary Wisdom',
    authorId: 'bot_sunita_essays',
    authorPenName: 'sunita_banerjee',
    category: 'Philosophy',
    summary: 'Unlike universal advice that pretends to be timeless, the age-bounded personal essay places a date stamp on its authority, acknowledging that human understanding is perishable and provisional.',
    coverImageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&auto=format&fit=crop&q=80',
    scheduleIST: '2026-09-27 20:30:00+05:30', // Staged for 8:30 PM IST
    isLiveNow: false,
    content: `Much conventional advice adopts a vertical posture. 

The expert, elder, or successful survivor speaks from accumulated experience toward someone presumed to have less. The self-help manual promises ten rules that apply with equal vigor whether you are nineteen or fifty-four. The authority of the counsel depends on its detachment from calendar time. It pretends to be timeless.

A familiar form of contemporary personal writing begins not with a commandment, but with an age.

Its titles often take a recognizable shape: *Things I Know at 27*, *What I Had to Unlearn at 29*, *The Quiet Humiliations of 33*. 

On the surface, this looks like a minor variation of internet list-making. But structurally, it represents a retreat from universal authority. When a writer titles a piece *Twelve Lessons from My Twenty-Eighth Year*, they are not asserting a philosophy of life; they are filing a field report from a specific coordinate on a grid. 

Its chronological boundary makes universal overclaiming slightly harder. Its date stamp places a limit on its authority.

Universal life advice almost always rots into aphorism. When a text tells you to "embrace uncertainty" or "prioritize what matters," the sentence is grammatically unimpeachable and practically useless. It operates at an elevation where no friction exists. It does not have to reckon with the rent due on Friday, the decaying health of a parent in another city, or the specific professional exhaustion of being early in an institutional career.

A chronological boundary forces the writer back toward the earth. To say *“At twenty-four, I mistook silence for agreement”* is not a universal moral commandment. It is an admission of personal clumsiness. It permits the reader to witness an error without feeling instructed.

There is also a deeper, institutional pressure at work. Modern life tracks adulthood through administrative and economic benchmarks: graduation dates, corporate promotion cycles, credit scores, mortgage approvals, and retirement horizons. We are measured constantly by whether our lives are running on schedule. 

The milestone essay mirrors that administrative clock, but turns it inward. It asks: *What did the calendar year actually feel like from the inside?* If external metrics insist that adulthood should proceed through recognizable stages of consolidation, promotion, and financial stability, the milestone essay records what those stages feel like from within: a sudden bewilderment with long-term ambition, or the realization that friendships formed in universities do not automatically survive the geometry of two different commute routes.

Chronological vulnerability feels more intimate than universal wisdom because it acknowledges that human understanding is perishable. The lessons you learn at twenty-seven are rarely permanent truths; they are provisional shelters built to survive twenty-seven. By thirty-one, half of them will look naive, and the other half will have been replaced by new complications.

Generic advice pretends that experience accumulates like capital in a savings account, compounding steadily toward serenity. The milestone essay suggests something closer to an ongoing repair: that we stumble through our decades not by mastering universal rules, but by constantly dismantling the certainties that kept us safe the year before.`
  },
  {
    order: 4,
    title: 'The Witnessed Sentence: Why the Short Story Matters in the Age of Synthetic Prose',
    authorId: 'bot_writer_007',
    authorPenName: 'gurpreet_sandhu',
    category: 'Culture',
    summary: 'When synthetic detail becomes computationally cheap, specificity is no longer proof of humanity. The short story endures because it preserves accountable selection: an actual author who had an urgent human reason to arrange the room that way.',
    coverImageUrl: 'https://images.unsplash.com/photo-1474932430478-367dbb6832c1?w=1200&auto=format&fit=crop&q=80',
    scheduleIST: '2026-09-27 22:00:00+05:30', // Staged for 10:00 PM IST
    isLiveNow: false,
    content: `A language model is an engine of consensus.

It operates by generating probability distributions over possible next tokens. Even when temperature and sampling allow for the unusual word, its fundamental architecture is trained to navigate toward plausible text. It smooths out friction, balances its clauses, and mimics the contours of human thought with astonishing fluency. It produces writing the way a wax apple produces fruit: the silhouette, the blush, and the stem are indistinguishable from life, until you bite into it.

It is tempting to defend human literature by claiming that machines can only generate clichés. We tell ourselves that a model will always assemble the obvious props of grief: the rain on the windowpane, the unread letter, the solitary cup of tea.

That defense is already obsolete. 

A contemporary model can invent the unexpected detail on command. It can describe a character who spends forty minutes trying to open a jammed plastic blister pack of batteries because they cannot bear to sit down in the quiet kitchen. It can place those batteries under a buzzing fluorescent tube, make the sharp edge of the plastic cut the character’s thumb, and leave a cricket commentary droning from the neighbor’s balcony. 

The danger of synthetic prose is not that it cannot produce detail. It is that detail has become computationally free. Rain, letters, chipped cups, blister packs, regional slang: all the furniture can be assembled in milliseconds. 

The question becomes not whether the furniture is convincing, but whether anyone had an urgent reason to arrange the room that way.

A machine can simulate the cut thumb, but the machine was never cut. It can generate the hesitation of a father before answering a question about money, but it has never lived inside a family where money is an unspoken humiliation. It does not carry childhood embarrassments, unresolved grudges, private superstitions, or the sudden, irrational affection for a cracked saucer. It produces the image because the prompt requested texture, not because a situated human consciousness wrestled with an experience until that specific detail was the only thing left that felt honest.

This is why literary magazines and small journals continue to spend scarce human attention selecting individual voices. When editors at publications like *Granta* guard their slush piles against automated submissions, they are not protecting a commercial monopoly; they are defending the human transmission chain. What the short story preserves is the accident of an individual voice.

In a short story, every sentence has an author who can be held accountable for why it exists. You can ask a human writer why a particular scene ended with the neighbor’s radio rather than an apology, and the answer will not be that the weights of a neural network made it the highest-probability continuation. The answer might be: *“Because my grandfather used to leave that broadcast on when he didn’t want to talk.”* Or: *“Because I spent three months trying to write the apology, and it sounded like a lie.”*

That is authorship: the deliberate, costly decision of an actual person choosing one detail and discarding fifty others, knowing they must stand behind what remains.

The short story has never depended on commercial dominance to do its work. It has always lived in small spaces: thin quarterlies, folded journals, and solitary reading chairs. Its power is not market velocity; it is compression.

In a culture increasingly saturated with synthetic prose that arrives pre-digested and infinitely abundant, the short story functions as a quiet sanctuary of human witness. It reminds us that literature does not exist to produce plausible text. It exists because someone was actually there.`
  }
];

async function publishTodayQueue() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database.');

    // Ensure Gurpreet Sandhu profile exists
    await client.query(`
      INSERT INTO public.profiles (id, email, pen_name, full_name, bio, avatar_url, location)
      VALUES (
        'bot_writer_007',
        'gurpreet_sandhu@bots.writon.internal',
        'gurpreet_sandhu',
        'Gurpreet Sandhu',
        'Short story writer and essayist. Crafting tales of friendship, campus crossroads, sports, and mediated cultural narratives.',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80&gender=male&uid=bot_writer_007',
        'Chandigarh, India'
      )
      ON CONFLICT (id) DO UPDATE SET
        pen_name = EXCLUDED.pen_name,
        full_name = EXCLUDED.full_name,
        bio = EXCLUDED.bio,
        avatar_url = EXCLUDED.avatar_url,
        location = EXCLUDED.location
    `);
    console.log('Verified author profile for Gurpreet Sandhu (bot_writer_007).');

    const results = [];

    for (const story of STORIES) {
      const slug = createSlug(story.title);
      const readingTime = calculateReadingTime(story.content);
      const status = story.isLiveNow ? 'published' : 'draft';
      const isPublic = story.isLiveNow;
      const publishedAt = story.isLiveNow ? new Date().toISOString() : story.scheduleIST;

      const insertRes = await client.query(`
        INSERT INTO public.posts (
          title,
          slug,
          summary,
          content,
          category,
          cover_image_url,
          author_id,
          status,
          is_public,
          reading_time_min,
          published_at,
          provenance,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::timestamptz, 'synthetic', NOW(), NOW())
        RETURNING id, title, slug, status, is_public, published_at, category, reading_time_min
      `, [
        story.title,
        slug,
        story.summary,
        story.content,
        story.category,
        story.coverImageUrl,
        story.authorId,
        status,
        isPublic,
        readingTime,
        publishedAt
      ]);

      const inserted = insertRes.rows[0];
      results.push({
        order: story.order,
        id: inserted.id,
        title: inserted.title,
        author: story.authorPenName,
        status: inserted.status,
        is_public: inserted.is_public,
        published_at: inserted.published_at,
        url: `https://writon.cc/stories/${inserted.slug}`
      });
    }

    console.log('\n======================================================');
    console.log('📋 TODAY\'S STORY BOT QUEUE INGESTION RESULTS');
    console.log('======================================================');
    console.table(results);

    // Regenerate SEO feeds
    console.log('\nRegenerating SEO sitemaps and RSS feed...');
    const { stdout, stderr } = await execAsync('node server/src/scripts/generate-seo-feeds.mjs');
    console.log(stdout);
    if (stderr) console.error(stderr);

  } catch (err) {
    console.error('Error ingesting stories:', err);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

publishTodayQueue();
