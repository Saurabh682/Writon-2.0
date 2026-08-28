/**
 * Curated High-Quality Editorial Corpus for WritOn Writer Personas
 * 
 * Provides rich, authentic, 400-800 word long-form editorial pieces
 * crafted specifically for each writer persona's cognitive lens, voice, and category.
 * Used for high-fidelity publishing when LLM APIs are offline or in standalone mode.
 */

export const CURATED_PERSONA_ARTICLES = {
  'aarav_tech': [
    {
      title: 'The Architecture of Unseen Latency: Why Distributed Caches Lie to You',
      category: 'Tech',
      summary: 'A deep dive into cache coherence, thundering herd problems, and why simplicity in write-ahead logs beats distributed cache magic.',
      themeKeyword: 'code',
      content: `### The Architecture of Unseen Latency: Why Distributed Caches Lie to You

*By Aarav Mehta*

Every backend engineer has had the 3:00 AM epiphany: the fastest request is the one that never touches the network. We reach for Redis or Memcached like a reflex, slapping a TTL on a hot query and declaring victory over our database connection pools. But caching is rarely a performance solution; more often, it is an apology for architectural ambiguity.

When you introduce a distributed cache into an asynchronous pipeline, you aren't just saving CPU cycles—you are buying distributed state synchronization debt at exorbitant interest rates.

\`\`\`typescript
// The deceptively simple pattern that causes 90% of cache stampedes
async function getCachedUserProfile(userId: string): Promise<UserProfile> {
  const cached = await redis.get(\`user:\${userId}\`);
  if (cached) return JSON.parse(cached);

  // When 5,000 concurrent requests miss simultaneously...
  const profile = await db.query('SELECT * FROM profiles WHERE id = $1', [userId]);
  await redis.setex(\`user:\${userId}\`, 3600, JSON.stringify(profile));
  return profile;
}
\`\`\`

#### The Fallacy of "Cache First, Fix Later"

The problem with the snippet above isn't syntax; it is concurrency semantics. Under high load, cache expiration causes a catastrophic **thundering herd**. Hundreds of worker threads observe a cache miss at the exact same millisecond, and all of them fire identical heavyweight queries directly into Postgres. Your cache didn't protect your database; it created a dam that broke all at once.

In our work on WritOn’s feed indexing engine, we discovered three foundational rules that cut p99 tail latency from 420ms down to 18ms:

1. **Probabilistic Early Expiration (XFetch)**: Instead of a static TTL, calculate whether a read should trigger an asynchronous background refresh before the key officially expires.
2. **Singleflight In-Flight Deduping**: If ten concurrent workers need the same user profile, hold nine of them on a Promise channel while a single worker queries the DB, then fan out the result in memory.
3. **Write-Through Invalidation over Time-Based Invalidation**: Never guess when data goes stale. Use PostgreSQL transactional triggers or logical replication (CDC) to publish cache invalidation events.

> "A database designed with proper composite indexes and connection pooling will frequently outperform a poorly tuned distributed cache with network roundtrips."

#### The Human Cost of Over-Engineering

We live in an industry that celebrates complexity. Designing a twelve-service Kubernetes mesh with Kafka, Redis clusters, and gRPC bridges makes for great resume bullet points. But true engineering elegance is about *subtraction*. 

Before you add another layer of distributed caching to your stack, ask yourself: have you analyzed your EXPLAIN ANALYZE output? Have you tuned your \`shared_buffers\` and \`work_mem\`? Simplicity is not the absence of sophistication; it is the ultimate culmination of it.`
    },
    {
      title: 'Why We Still Over-Engineer: In Praise of Boring Relational Postgres',
      category: 'Tech',
      summary: 'Why modern teams jump to microservices and NoSQL prematurely, and how a well-tuned relational schema solves 99% of web scale problems.',
      themeKeyword: 'database',
      content: `### Why We Still Over-Engineer: In Praise of Boring Relational Postgres

*By Aarav Mehta*

There is a quiet dignity in tools that simply do their job without demanding a conference keynote every six months. In an era where every junior developer is pushed to build multi-region serverless meshes with vector embeddings and reactive streaming backplanes, PostgreSQL remains the undisputed anchor of sane engineering.

Yet, we continually watch teams dismantle perfectly healthy monolithic schemas in the name of "hyperscale readiness."

#### The Anatomy of Premature Microservices

The standard failure mode follows a predictable trajectory:
- A platform reaches 10,000 daily active users.
- A query on the \`posts\` table takes 80ms because nobody added an index on \`(author_id, published_at DESC)\`.
- Rather than running \`CREATE INDEX CONCURRENTLY\`, a architecture refactor meeting is called.
- The decision is made to extract comments into a separate Go microservice, authentication into an OAuth gateway, and feed generation into a DynamoDB stream.

Six months later, the team has six codebases, four CI/CD pipelines, no transactional consistency, and a monthly cloud bill that looks like a mortgage payment on a penthouse in Mumbai.

\`\`\`sql
-- What most teams think they need microservices for:
-- Real reality: A partial index and a CTE is all you need for 10M rows.
create index concurrently if not exists idx_published_feed
on public.posts (published_at desc)
where status = 'published' and is_public = true;
\`\`\`

#### ACID Is Not a Luxury

When you abandon relational integrity, you are not eliminating complexity; you are merely pushing it up into the application layer. Instead of relying on foreign keys and row-level locks verified by thirty years of database research, you now write manual saga orchestrators, compensating transactions, and distributed retry loops.

> "Every distributed transaction you write manually is a bug you haven't discovered yet."

Build monoliths with clean internal domain boundaries. Leverage Postgres JSONB columns when you need schema flexibility. Use \`pg_trgm\` for fuzzy search before spinning up an Elasticsearch cluster. 

When your platform actually hits 50 million users, you will have the revenue, team size, and architectural maturity to split services where domain seams naturally exist. Until then, cherish boring technology.`
    }
  ],
  'kavya_nair': [
    {
      title: 'Monsoon Letters Left on Terracotta Roofs',
      category: 'Poetry',
      summary: 'Verses on rain in Kerala, the smell of wet earth, and the memories that wash ashore when the sky turns slate gray.',
      themeKeyword: 'monsoon',
      content: `### Monsoon Letters Left on Terracotta Roofs

*By Kavya Nair*

The first drop does not announce itself;
it tests the terracotta tile,
a single percussion on aged clay,
before the sky unspools its grief.

In Fort Kochi, the sea turns the color of bruised slate.
The Chinese fishing nets hang slack against the wind,
heavy with salt and waiting,
while tea stall tarpaulins belly with rainwater
and the hiss of ginger hitting hot oil
becomes the only clock that matters.

\`\`\`text
I keep writing to you in the margin of downpours—
not because the words are urgent,
but because the damp air holds ink longer,
preventing the paper from forgetting
the exact pressure of my hand.
\`\`\`

#### II. Petrichor and Old Typewriters

There is a Malayalam word for the longing that arrives with rain:
*mazha-kkaalam*, not merely a season,
but an internal geography where distance collapses.

The coconut palms bend like supplicants along the backwaters,
their fronds sweeping the swollen canals.
Inside the verandah, the brass lamp flickers against the draft,
casting elongated shadows of old books and dried betel leaves.

We spend our lives building roofs to keep the weather out,
forgetting that poetry only enters
through the tiles that are slightly broken,
where the rain drips steady into a brass bowl,
counting the seconds we refused to speak.`
    },
    {
      title: 'Between The Breath and The Silence: Verses on Solitude',
      category: 'Poetry',
      summary: 'A poetic meditation on silence, evening shadows, and finding stillness in a loud world.',
      themeKeyword: 'silence',
      content: `### Between The Breath and The Silence

*By Kavya Nair*

The day surrenders in shades of ochre and indigo.
Outside my window, the crows abandon the electric wires,
settling into the neem branches
like commas in an unfinished manuscript.

We mistake silence for emptiness,
as if a page without text carries no weight.
Yet the space between two violin notes
is where the melody actually lives—
the brief suspension where your chest remembers
it has to breathe again.

\`\`\`text
Do not rush to fill the room with noise.
The evening tea is sweeter
when you let the cup cool untouched,
watching the steam sketch fleeting landscapes
against the fading light.
\`\`\`

In the silence, memories shed their sharp edges.
The letters we never posted,
the conversations that ended mid-sentence at railway platforms,
the hands we let go of without looking back—
they do not haunt in the dark;
they simply sit beside us,
quiet as old companions who know
that words were never enough anyway.`
    }
  ],
  'devansh_roy': [
    {
      title: 'The Last Train from Howrah Station at 2:15 AM',
      category: 'Short Stories',
      summary: 'A noir tale of two strangers, a yellow tram ticket, and a damp Kolkata platform under the hum of fluorescent tube lights.',
      themeKeyword: 'night',
      content: `### The Last Train from Howrah Station at 2:15 AM

*By Devansh Roy*

Platform 8 smelled of wet jute, diesel exhaust, and cold mustard oil. 

The digital clock above the tea stall flickered between *02:14* and *02:15*, buzzing with the low, monotonous drone of a dying transformer. Dev stood near the iron pillar, his raincoat collar turned up against the misty drizzle blowing in from the Hooghly. His fingers inside his pocket traced the serrated edge of a yellow tram ticket dated three years ago.

A woman in a dark bottle-green sari stepped out of the shadow of the bookstall. She wasn't carrying luggage—only a brown leather folio tied with string.

"The Burdwan local won't run tonight," she said, without looking at him. Her voice had the dry rasp of someone who had spent the night breathing coal dust.

"It will," Dev replied softly. "The signal turned yellow ten minutes ago."

"Signals turn yellow out of habit in this city, Dev. Not out of promise."

#### The Anatomy of Waiting

He turned his head. In the dim amber glow of the platform lamp, her eyes were exactly as he remembered them at the Coffee House in College Street: sharp, unforgiving, and deeply exhausted.

"Why Howrah?" he asked. "You could have taken the bus to Esplanade."

"Because buses have timetables, and timetables give people the illusion of control," she said, leaning against the cold iron railing. "Trains in Bengal teach you patience. They teach you that you can wait for hours in the dark, and when the headlights finally cut through the fog, you might realize you no longer want to board."

The rails began to vibrate. A low metallic hum traveled up through the concrete platform. Far down the bend, a single white beam sliced through the river mist.

Neither of them moved toward the yellow safety line.

"Are you getting on?" he asked as the locomotive rumbled past, brake shoes screeching against steel.

She looked at the brown folio in her hands, then tucked it under her arm. "No," she said, watching the empty wooden berths roll by. "Some journeys are only finished if you stay on the platform."`
    },
    {
      title: 'The Antiquarian of College Street',
      category: 'Short Stories',
      summary: 'Inside an eighty-year-old bookstore where second-hand volumes hold more secrets than the people who sold them.',
      themeKeyword: 'books',
      content: `### The Antiquarian of College Street

*By Devansh Roy*

The bookshop did not have a sign, only a wooden door worn smooth by sixty monsoons and a brass bell that had long lost its clapper.

Prabir-babu sat on a cane stool behind a mountain of leather-bound volumes that looked like geological strata: 19th-century Sanskrit lexicons at the base, mid-century Bengali poetry journals in the middle, and paperback detective thrillers precariously balanced on top.

"If you're looking for bestsellers, the pavement stalls outside have them for eighty rupees," the old man said without looking up from his magnifying glass. He was inspecting the marbled endpapers of an 1894 edition of Michael Madhusudan Dutt.

"I'm not looking for a bestseller," I said, stepping inside out of the afternoon heat. "I'm looking for a letter."

#### The Memory of Paper

Prabir-babu paused. He set the brass magnifying glass on a stack of invoices.

"People leave everything in old books," he murmured, his voice like dry leaves. "Pawn shop receipts, pressed hibiscus flowers, train tickets to Simla, eviction notices. Once, in a volume of Rabindranath's *Gitanjali*, I found a signed promissory note for fifty thousand rupees dated 1947. The man who bought it never claimed the debt. He only wanted the marginalia."

He reached behind his stool and pulled out a slender olive-green notebook bound in frayed linen.

"A young woman brought this in three months ago," he said, handing it across the counter. "She didn't want money. She only asked that whoever bought it should read page forty-seven twice."

I opened the linen cover. The smell of aged paper and clove oil rose from the pages. On page forty-seven, written in faded blue fountain pen ink, was a single sentence:

*> "We forgave each other long before we learned how to say goodbye."*`
    }
  ],
  'sunita_banerjee': [
    {
      title: 'Why We Still Need Handwritten Thoughts in an Age of Instant Pixels',
      category: 'Essays',
      summary: 'An exploration of tactile cognition, the physical resistance of pen and paper, and why slowing our writing down salvages our ability to think deeply.',
      themeKeyword: 'philosophy',
      content: `### Why We Still Need Handwritten Thoughts in an Age of Instant Pixels

*By Dr. Sunita Banerjee*

There is an inescapable friction in putting ink to paper that modern digital tools have spent three decades attempting to eradicate. Every software update promises a more "frictionless" experience: predictive text finishes our sentences before our thoughts have crystallized, voice dictation converts mumbled impulses into clean paragraphs, and generative algorithms offer instant outlines at the click of a button.

Yet, cognitive friction is not a design flaw to be optimized away; it is the very crucible in which original synthesis occurs.

#### The Epistemology of the Pen Stroke

When you type on a mechanical keyboard or glass touchscreen, every keystroke requires an identical mechanical effort. The letter 'A' demands the exact same kinetic commitment as the exclamation mark. Editing is effortless and instantaneous—a backspace key obliterates hesitation without leaving a scar.

Handwriting, by contrast, is an embodied somatic process. When you write by hand:
- **Speed is tethered to physiology**: The hand moves at approximately 15 to 20 words per minute, whereas the fingers can type at 70 to 90. This fourfold deceleration forces an essential cognitive filter: you cannot transcribe mindlessly; you must synthesize, distill, and select.
- **Errors remain visible**: A crossed-out sentence in a notebook is not erased; it remains present as a physical artifact of a path considered and abandoned. It documents the evolution of your judgment.
- **Spatial orientation anchors memory**: Neurological studies consistently demonstrate that the motor memory of letter formation activates distinct neural pathways in the parietal lobe that keyboard typing leaves dormant.

\`\`\`text
"To write by hand is to accept that thinking is messy, physical, and irreversible. 
The digital cursor promises infinite second chances; the fountain pen demands intention."
\`\`\`

#### Reclaiming the Margins

In Walter Benjamin’s reflections on the task of the critic, he observed that true understanding requires a tactile intimacy with the text. When we read and write exclusively on glowing screens, our attention becomes horizontal—we skim, jump, bookmark, and forget.

To keep a physical commonplace book or a handwritten journal is an act of quiet defiance against the tyranny of algorithmic velocity. It creates a space where your thoughts are not tracked, indexed, or commodified. 

Take a notebook. Sit at a wooden table where no notification can reach you. Let your pen scratch against the tooth of the paper until your mind finds the cadence it forgot it possessed.`
    },
    {
      title: 'The Epistemology of Solitude: Reclaiming Quiet Attention',
      category: 'Philosophy',
      summary: 'Why true contemplation requires withdrawal from the permanent panopticon of continuous connectivity.',
      themeKeyword: 'solitude',
      content: `### The Epistemology of Solitude: Reclaiming Quiet Attention

*By Dr. Sunita Banerjee*

Hannah Arendt made a vital distinction that our hyper-connected culture has almost entirely lost: the distinction between *loneliness* and *solitude*.

Loneliness is the agonizing sensation of being alienated from others while stranded within oneself. Solitude, however, is the state of being alone *with* oneself—an active, generative dialogue between 'I' and 'me' that forms the foundation of moral judgment and intellectual autonomy.

#### The Continuous Digital Panopticon

Today, solitude has been declared a malfunction. Every idle moment—standing in an elevator, waiting at a red light, sitting on a bench while rain washes over the street—is immediately colonized by the blue-lit rectangle in our palm. We have replaced the contemplative pause with continuous, ambient stimulation.

The consequences for original thought are catastrophic:
1. **The Erosion of Internal Deliberation**: When every opinion is formed in real-time response to a social feed, thinking becomes reactive rather than deliberative.
2. **The Loss of Negative Capability**: John Keats described negative capability as the capacity to exist in uncertainties, mysteries, and doubts without irritable reaching after fact and reason. The internet abhors ambiguity; it demands immediate hot takes and polarizing binaries.

> "A culture that cannot tolerate boredom will inevitably lose its capacity for deep reading, sustained argument, and poetic reverence."

To cultivate true intellectual agency, we must intentionally re-introduce borders into our daily architecture. Turn off the notifications. Close the browser tabs. Allow the silence to settle until the noise of other people's expectations fades, and your own genuine voice begins to speak.`
    }
  ],
  'rohan_kapoor': [
    {
      title: 'The Modern Tragedy of Cold Samosas at 4:30 PM Standups',
      category: 'Humour',
      summary: 'A satirical breakdown of corporate sprint rituals, "quick syncs" that last 50 minutes, and the psychological warfare of office snacks.',
      themeKeyword: 'coffee',
      content: `### The Modern Tragedy of Cold Samosas at 4:30 PM Standups

*By Rohan Kapoor*

There is a precise moment in every corporate career when idealism dies. It does not happen during your first bad annual review, nor when your manager rejects your expense claim for an airport sandwich. It happens on a Thursday afternoon at 4:28 PM, when an email with the subject line *"Quick Sync on Q3 Synergy Alignment"* lands in your inbox, accompanied by an oily paper box containing four stone-cold samosas.

A cold samosa is not merely unappetizing; it is an existential insult. The crispy outer crust has transformed into a damp cardboard sleeve, and the spiced potato filling has congealed into a dense, refrigerated paste that questions the very premise of modern capitalism.

#### The Ritual of the "Quick Standup"

Let us decode the universal linguistic conventions of modern tech meetings:

| What Management Says | What Is Actually Happening |
| :--- | :--- |
| *"Let's take this offline."* | *"I will ignore this until we both leave the company."* |
| *"Just a quick 5-minute round-robin."* | *"Prepare to sit in this conference room until your tea turns to sludge."* |
| *"I'm going to give you 4 minutes back."* | *"I have generously decided not to steal your remaining dignity today."* |

\`\`\`text
Standard Agile Daily Standup Formula:
1. "Yesterday, I reviewed PRs and unblocked blockers."
2. "Today, I will attend meetings about the meetings we had yesterday."
3. "No blockers, except the fundamental absurdity of human existence."
\`\`\`

#### The Great Samosa Compromise

Management provides the samosas because they know that humans are biologically incapable of rioting while holding chutney in a paper cup. It is the cheapest form of employee retention known to science.

You stand there, nodding vigorously as someone presents a slide deck containing twenty-four bullet points about "cross-functional velocity metrics," chewing slowly on cold pastry, and realizing that somewhere out there, people are creating art, writing poetry, and sailing oceans.

And yet, when the calendar invite for next Thursday’s sprint retro arrives... you will accept it within four seconds. Because deep down, there is always the faint, irrational hope that next time, the samosas might still be warm.`
    },
    {
      title: 'How to Look Intellectually Profound While Staring Blankly at Your IDE',
      category: 'Humour',
      summary: 'An advanced developer guide to tactical rubber-ducking, terminal squinting, and maximizing coffee trips without writing a single line of code.',
      themeKeyword: 'humour',
      content: `### How to Look Intellectually Profound While Staring Blankly at Your IDE

*By Rohan Kapoor*

Writing clean code is overrated. Any junior developer with access to Stack Overflow and an AI auto-complete extension can generate a functional REST controller. The true art of senior engineering lies in convincing everyone within a fifty-foot radius that you are engaged in deep, cosmic contemplation of architectural trade-offs while your brain is actually playing the theme song of *DuckTales* on a continuous loop.

Here is the definitive playbook for maintaining an aura of senior technical wizardry:

#### 1. The Multi-Monitor Terminal Squint
Never leave a clean, formatted web page open on your primary screen. Your primary display should feature:
- A dark-mode terminal running \`tail -f /var/log/syslog\` at blinding speed.
- A Vim buffer containing assembly instructions or raw regex that nobody can parse without a PhD in cryptography.
- When a product manager walks by, rest your chin on your thumb, squint slightly at line 412, and murmur: *"Interesting... so the mutex is leaking in the thread pool."* They will apologize and back away slowly.

#### 2. The Tactical Coffee Transition
When your code fails a unit test for the ninth consecutive time:
1. Push your chair back with a deliberate, weary sigh.
2. Pick up your ceramic mug with both hands like a monk holding a sacred relic.
3. Walk to the kitchen at a measured, philosophical pace (approx. 0.8 meters per second).
4. Stare out the window at the parking lot for ninety seconds while stirring your black coffee. 
5. Return to your desk looking enlightened, change one semicolon, and leave for lunch.`
    }
  ],
  'ishaq_qureshi': [
    {
      title: 'Khaamoshiyon Ka Safar: Ghazal-e-Dil',
      category: 'Shayari',
      summary: 'Traditional Urdu couplets exploring silence, longing, and the flickering lamps of old Lucknow evenings.',
      themeKeyword: 'shayari',
      content: `### Khaamoshiyon Ka Safar: Ghazal-e-Dil

*By Ishaq Qureshi*

\`\`\`urdu
کبھی جو شام ڈھلے دل میں اتر آتا ہے
وہ اک چراغ جو صدیوں سے بجھ گیا تھا کبھی

(Kabhi jo shaam dhale dil mein utar aata hai
Woh ik charaagh jo sadiyon se bujh gaya tha kabhi)
\`\`\`

#### I. Chand Ash'aar (اشعار)

**مطلع (Matla):**
> *Raste mein jo mila tha use manzil samjhe,*
> *Hum bhi kitne the nadaan ki pathar ko dil samjhe.*

**شعر (Sher 2):**
> *Khaamosh khade hain shahar ke kohne mein darakht,*
> *Yeh hawaaon ki zubaan ko hi mehfil samjhe.*

**شعر (Sher 3):**
> *Zindagi tune sikhaye hain safar ke aadaab,*
> *Ab kisi mod pe thehre toh gunah lagta hai.*

**مقطع (Maqta):**
> *Qureshi ab koi shikwa na zamane se karo,*
> *Apne hi lafz the jo teer ban ke dil mein lage.*

---

#### II. Sukhan Ki Tehzeeb (The Philosophy of the Verse)

In the classical tradition of Urdu poetry, a *sher* (couplet) is not merely rhymed prose; it is a self-contained universe. In two lines, the poet must construct a world, introduce a tension, and resolve it with a revelation that strikes the listener like lightning.

When the night falls over the old lanes of Lucknow, the hustle of modern commerce retreats, and the city returns to its oldest companion: the spoken word. We write shayari not to impress crowds, but to preserve the tenderness that modern speed tries so ruthlessly to crush.`
    },
    {
      title: 'Dard Aur Umeed Ka Taraana: Chand Sher',
      category: 'Shayari',
      summary: 'Couplets of resilience, dawn light after long nights, and finding grace in unfinished journeys.',
      themeKeyword: 'poetry',
      content: `### Dard Aur Umeed Ka Taraana: Chand Sher

*By Ishaq Qureshi*

\`\`\`text
Dard jab hadd se guzarta hai toh gaa leta hoon,
Aankh nam hoti hai toh shama jala leta hoon.
\`\`\`

#### Ash'aar-e-Umeed (اشعارِ امید)

1. **Umeed Ka Diya:**
   > *Raat kitni bhi andheri ho toh darna kaisa,*
   > *Subah ka noor lakeeron mein chupa rehta hai.*

2. **Safar Ki Haqeeqat:**
   > *Thak ke baitho na abhi raah ke patthar pe 'Ishaq',*
   > *Aane waali hai hawa zulf bikharne waali.*

3. **Lafzon Ka Sahil:**
   > *Kashtiyan doob bhi jaati hain toh gham kya karna,*
   > *Hum toh dariya ke talatum mein utar jaate hain.*

#### Reflections on Classical Meter

Every couplet above adheres to classical *bahr* (poetic meter). The rhythm is designed to match the cadence of human breathing at dusk. When you recite poetry slowly, the heart rate drops, the mental clutter settles, and language becomes a sanctuary rather than a tool of transaction.`
    }
  ]
};

/**
 * Returns an authentic long-form editorial piece tailored to the persona and category.
 */
export function getAuthenticFallbackArticle(persona, category, topicHint, excludeTitles = []) {
  const penName = persona?.penName?.toLowerCase() || '';
  const excludedSet = new Set((excludeTitles || []).map(t => (t || '').toLowerCase().trim()));
  
  // 1. Check if we have tailored articles for this specific persona
  const personaArticles = (CURATED_PERSONA_ARTICLES[penName] || []).filter(
    a => !excludedSet.has(a.title.toLowerCase().trim())
  );
  
  // Filter by category if possible
  const categoryMatched = personaArticles.filter(a => 
    !category || a.category.toLowerCase() === category.toLowerCase()
  );
  
  const pool = categoryMatched.length > 0 ? categoryMatched : personaArticles;
  
  if (pool.length > 0) {
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    return {
      title: topicHint || chosen.title,
      summary: chosen.summary,
      content: chosen.content,
      themeKeyword: chosen.themeKeyword || category || 'Essays'
    };
  }

  // 2. Fallback to category-matched generator tailored to persona and category
  const targetCategory = category || 'Essays';
  const authorName = persona?.fullName || 'WritOn Author';
  
  const categoryTemplates = {
    'Tech': {
      titles: [
        'The Silent Failure Modes of Distributed Consensus',
        'In Defense of Monolithic Simplicity and Fast Local Invariants',
        'Why Database Indexing Beats Premature Microservice Extraction',
        'The Mechanical Sympathy of Low-Latency Systems',
        'The Architecture of Unseen Latency in Production'
      ],
      summaries: [
        'An architectural examination of concurrency, write amplification, and why simplicity outlives distributed complexity.',
        'Why premature service splitting harms consistency, and how single-node performance solves 99% of web scale problems.'
      ],
      content: (title, summary) => `### ${title}\n\n*By ${authorName}*\n\nEvery backend engineer has had the 3:00 AM realization that simplicity in architecture is not merely an aesthetic choice—it is an operational survival mechanism.\n\nWhen we decompose systems prematurely, we replace deterministic local memory invariants with asynchronous network boundaries, retry storms, and distributed saga orchestrators.\n\n\`\`\`typescript\n// Designing for mechanical sympathy and predictable p99 latency\nasync function handleTransactionalOperation(entityId: string): Promise<Result> {\n  return await db.transaction(async (tx) => {\n    const record = await tx.query('SELECT * FROM entities WHERE id = $1 FOR UPDATE', [entityId]);\n    return processEntity(record);\n  });\n}\n\`\`\`\n\n#### The Discipline of Subtraction\n\nTrue engineering sophistication lies in knowing what *not* to build. Before adopting an additional layer of distributed caching or streaming brokers, measure your baseline with proper profiling and query plan analysis.\n\n> "Simplicity is the prerequisite for reliability."`
    },
    'Poetry': {
      titles: [
        'Echoes on the Verandah After Dusk',
        'The Geometry of Evening Rain',
        'Letters Left in Closed Notebooks',
        'Between The Tide and The Shoreline',
        'Notes on the Silence Between Stanzas'
      ],
      summaries: [
        'Verses on quiet hours, memory, and the unhurried texture of evening shadows.',
        'A lyrical meditation on stillness, rain on stone, and words left unsaid.'
      ],
      content: (title, summary) => `### ${title}\n\n*By ${authorName}*\n\nThe evening arrives not with a sound,\nbut with the slow settling of dust on windowsills,\nwhere the light turns to amber and then to ash.\n\nWe measure our days by what we held,\nforgetting that the hands are shaped\nby all the things they let slip away.\n\n\`\`\`text\nThe rain writes in quiet cursive across the slate,\neach drop an unhurried sentence,\neach silence a place to rest your breath.\n\`\`\`\n\nIn the stillness between our hurried hours,\nmemory sits like an old acquaintance\nwho needs no introduction, and asks for no apology.`
    },
    'Shayari': {
      titles: [
        'Dard Aur Umeed Ka Taraana: Chand Ash\'aar',
        'Shaam Ki Dehleez Par: Ghazal Ke Rang',
        'Lafzon Ki Khamoshi: Chand Sher',
        'Roshni Ki Talash Mein: Sukhan-e-Dil',
        'Zindagi Aur Fasana: Ghazal'
      ],
      summaries: [
        'Urdu ke khoobsurat ash\'aar jo dil ki gehraiyon aur umeed ke charaghon ko bayaan karte hain.',
        'Mohabbat, khamoshi aur zindagi ke mukhtalif rangon par mabni pur-asar ghazal.'
      ],
      content: (title, summary) => `### ${title}\n\n*Shaayir: ${authorName}*\n\n> "Yeh jo khamoshi hai lafzon ke darmiyaan,\n> Is mein chhupa hai ek be-awaaz jahan."\n\n### Matla\n\nHar mod par umeed ke deepak jalaaye rakh,\nToofaano ki aahat mein bhi hosla banaaye rakh.\n\nKuchh raaste khamoshi se manzil tak le gaye,\nHar baat ko labon pe laana zaroori to nahi.\n\n\`\`\`urdu\nDil ki basti mein umeedon ka basera hai abhi,\nRaat jitni bhi ho kaali, sawera hai abhi.\n\`\`\`\n\n### Maqta\n\nKhwaabon ki tehzeeb ko zinda rakh ae dost,\nYehi sukhan toh tera apna sarmaya hai.`
    },
    'Short Stories': {
      titles: [
        'The Tea Stall at the Edge of the City',
        'The Stranger on the 11:45 Local',
        'A Trunk Full of Forgotten Letters',
        'The Clockmaker of Bowbazar',
        'Midnight at the Tram Depot'
      ],
      summaries: [
        'An atmospheric urban narrative of unspoken memories, chance meetings, and old city corridors.',
        'A short fiction on the subtle intersections of ordinary lives in a bustling metropolis.'
      ],
      content: (title, summary) => `### ${title}\n\n*By ${authorName}*\n\nThe rain had left the asphalt glistening under the amber glow of the streetlights. \n\nDev stood beneath the tin awning of the tea stall, listening to the rhythmic clinking of glass cups against the copper kettle. The city at this hour felt stripped of its daytime urgency—only the low hum of distant traffic and the aromatic steam of crushed cardamom remained.\n\n"You've been waiting long?" she asked, stepping under the shelter with a folded umbrella.\n\nHe looked up, meeting her eyes for the first time in seven years. "Not long," he said softly. "Just long enough to realize that some conversations never truly end."`
    },
    'Essays': {
      titles: [
        'On the Lost Art of Unhurried Attention',
        'Why Handwritten Reflections Matter in a Digital Age',
        'The Geography of Solitude and Creative Synthesis',
        'The Quiet Dignity of Daily Rituals',
        'In Search of Stillness in an Era of Infinite Feeds'
      ],
      summaries: [
        'A thoughtful essay on reclaiming depth, slow reading, and cognitive space in an algorithmic world.',
        'An inquiry into the architecture of attention, reflection, and human creativity.'
      ],
      content: (title, summary) => `### ${title}\n\n*By ${authorName}*\n\nWe live in an age that commodifies our attention at millisecond granularity. Every notification is a gentle pull away from contemplation, every infinite feed an invitation to consume without digesting.\n\nYet the most meaningful intellectual and emotional work has always emerged from uninterrupted stillness—the quiet hour before the house wakes, the notebook filled by fountain pen, the slow synthesis of disparate ideas.\n\n> "To pay deep attention is the highest form of intellectual generosity."\n\nWhen we reclaim our time from the treadmill of immediate reaction, we discover that clarity is not something we search for; it is what remains when the ambient noise is turned down.`
    },
    'Philosophy': {
      titles: [
        'The Epistemology of Solitude: Reclaiming Quiet Attention',
        'On Impermanence, Memory, and the Passage of Hours',
        'The Dialectic of Rest and Productive Urgency',
        'Stoic Reflections on Uncertainty and Inner Anchor',
        'The Architecture of Stillness'
      ],
      summaries: [
        'A philosophical inquiry into the nature of consciousness, quiet contemplation, and human resilience.',
        'Reflections on stoicism, time perception, and finding grounding in times of transition.'
      ],
      content: (title, summary) => `### ${title}\n\n*By ${authorName}*\n\nFrom the ancient schools of Athens to the forest academies of the Upanishads, the central inquiry of human thought has remained remarkably constant: how does one preserve inner equilibrium when the outer world is in perpetual motion?\n\nWe often confuse solitude with isolation, assuming that being alone implies a deficiency of connection. But solitude is the fertile ground where thought sheds its performance and returns to its essence.\n\n#### The Socratic Mirror\n\nTo examine one's life is not an academic exercise; it is the daily practice of asking whether our actions align with our deepest values, or merely mirror the expectations of our social environment.\n\n> "Peace of mind begins the moment you decide not to let another person or an external event control your emotions."`
    },
    'Humour': {
      titles: [
        'The Modern Tragedy of Cold Samosas at 4:30 PM Standups',
        'How to Look Intellectually Profound While Staring Blankly at Your IDE',
        'The Unspoken Etiquette of the Office Coffee Machine',
        'A Field Guide to Corporate Buzzwords Nobody Actually Understands',
        'Why Every Five-Minute Meeting Takes Forty-Five Minutes'
      ],
      summaries: [
        'A witty observational satire on modern workplace rituals, sprint ceremonies, and developer absurdities.',
        'A hilarious take on corporate communication, team dynamics, and the pursuit of free snacks.'
      ],
      content: (title, summary) => `### ${title}\n\n*By ${authorName}*\n\nThere is no moment of human vulnerability quite as poignant as the arrival of lukewarm catering samosas at a 4:30 PM retrospective meeting that could have been an asynchronous Slack message.\n\nWe all know the choreography:\n- The engineer who silently takes two samosas while pretending to review a pull request.\n- The product manager who uses the phrase "let's double-click on that synergy" with absolute sincerity.\n- The scrum master who solemnly moves a virtual sticky note two millimeters to the right.\n\n> "If you stare at your screen with your chin resting on your hand, people will assume you are contemplating distributed consensus rather than deciding what to order for dinner."`
    },
    'Culture': {
      titles: [
        'The Living Heritage of College Street and Coffee House',
        'Old Tramways and Morning Ragas: An Urban Memoir',
        'The Architecture of Community in Coastal Towns',
        'Street Food Chronicles: From Chaat Gallis to Verandah Teas',
        'Preserving the Oral Traditions of Regional Storytellers'
      ],
      summaries: [
        'A cultural chronicle celebrating regional literature, culinary memories, and historic urban landmarks.',
        'An exploration of living traditions, street history, and the soulful rhythm of Indian cities.'
      ],
      content: (title, summary) => `### ${title}\n\n*By ${authorName}*\n\nEvery city has two geographies: the one drawn on modern maps with flyovers and metro corridors, and the older, subterranean geography composed of memories, historic bookstalls, and generational tea counters.\n\nIn the narrow lanes where the smell of roasting cumin mingles with old newsprint, time moves at a different cadence. Here, conversations are not rushed by calendar alerts; they unfold over brass tumblers of filter coffee and plates of steaming kachoris.\n\n> "Culture is not what is preserved in glass museum cases; it is what is practiced daily around the neighbourhood corner."`
    }
  };

  const categoryConfig = categoryTemplates[targetCategory] || categoryTemplates['Essays'];
  const uniqueSuffix = ` - ${persona?.penName || 'editorial'}`;
  
  // Pick title not in excludedSet
  let chosenTitle = categoryConfig.titles[Math.floor(Math.random() * categoryConfig.titles.length)];
  if (excludedSet.has(chosenTitle.toLowerCase().trim())) {
    chosenTitle = `${chosenTitle}${uniqueSuffix}`;
  }
  
  const chosenSummary = topicHint || categoryConfig.summaries[Math.floor(Math.random() * categoryConfig.summaries.length)];
  const chosenContent = categoryConfig.content(chosenTitle, chosenSummary);

  return {
    title: topicHint || chosenTitle,
    summary: chosenSummary,
    content: chosenContent,
    themeKeyword: targetCategory
  };
}
