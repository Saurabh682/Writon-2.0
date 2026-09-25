/**
 * publish-sept22-editorial-slate.mjs
 * 
 * Publishes 4 Sept 22 editorial stories at staggered intervals throughout the day.
 * Schedule (IST):
 *   10:00 AM - The Death of the Pull Request        (Tech  / Aarav Mehta)
 *   01:00 PM - The Feeds We Chose: Why RSS...       (Culture / Gopal Krishnan)
 *   04:00 PM - The Geometry of the Chai Bench       (Culture / Gopal Krishnan)
 *   07:00 PM - The Sovereignty Stack                (Tech  / Aarav Mehta)
 */

import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import pg from 'pg';
import dotenv from 'dotenv';
import { validateZeroAISlopEngineBlockers, validateGeneratedArticleIntegrity } from '../bot-engine/editorial-intelligence-service.js';
import { getCoverImageForCategory } from '../bot-engine/image-service.js';
import { recordLedgerEntry } from '../bot-engine/editorial-ledger-service.js';

dotenv.config({ path: 'D:/VibeCode/WritOn-PowerUp/server/.env' });

// ─── helpers ────────────────────────────────────────────────────────────────

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
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 140)); // 140 WPM literary pace
}

/** Remove markdown heading markers (## / **) for clean plain-text storage,
 *  but keep em-dashes, italics markers stripped, and paragraph spacing. */
function formatContent(md) {
  return md
    .replace(/^#{1,3}\s+/gm, '')        // strip ## headings
    .replace(/\*\*(.*?)\*\*/g, '$1')    // strip **bold**
    .replace(/\*(.*?)\*/g, '$1')        // strip *italic*
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')         // collapse excess blanks
    .trim();
}

/** ms until next occurrence of HH:MM IST */
function msUntilIST(hour, minute) {
  const now = new Date();
  const target = new Date();
  // IST = UTC+5:30
  target.setUTCHours(hour - 5, minute - 30, 0, 0);
  if (target <= now) target.setUTCDate(target.getUTCDate() + 1); // tomorrow if past
  return target - now;
}

function scheduleAt(hourIST, minuteIST, label, fn) {
  const ms = msUntilIST(hourIST, minuteIST);
  const hh = String(hourIST).padStart(2, '0');
  const mm = String(minuteIST).padStart(2, '0');
  const fireAt = new Date(Date.now() + ms).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`⏰ "${label}" scheduled for ${hh}:${mm} IST  (fires in ${Math.round(ms/60000)} min — ${fireAt})`);
  setTimeout(fn, ms);
}

// ─── editorial slate ─────────────────────────────────────────────────────────

const STORY_1_TITLE = 'The Death of the Pull Request: Why Supervising AI Is Breaking Software Craft';
const STORY_1_SUMMARY = 'AI made producing code cheap. It did not make understanding code cheap. Machines have cut the cost of generating software while leaving the cost of reviewing it stubbornly human — and that imbalance is reshaping how teams work.';
const STORY_1_CONTENT = formatContent(`Perhaps AI did not break code review. Perhaps it exposed how much we were asking code review to do.

A pull request containing twelve changed lines feels manageable.

You open the diff. You understand what the author intended. You notice an unnecessary condition, leave a comment, check the tests and approve.

Then comes the machine-generated version.

Forty-seven files.

Nine hundred changed lines.

A new abstraction nobody requested.

Tests for the abstraction.

Documentation for the abstraction.

A tiny helper function with a wonderfully confident name that turns out to duplicate something the codebase has contained since 2021.

The entire thing may have been produced in minutes.

Reviewing it will not take minutes.

This is the strange imbalance emerging inside AI-assisted software development: machines have dramatically reduced the cost of producing code while leaving the cost of understanding it stubbornly human.

Yesterday's bottleneck was writing.

Tomorrow's may be reading.

## The pull request was designed for a slower world

Pull requests made sense when producing code was expensive.

A developer spent hours or days solving a problem. By the time the work reached review, the amount of new material another engineer had to inspect was constrained by the author's own typing speed, debugging time and capacity to think.

That natural throttle is disappearing.

Rachel Laycock, CTO at Thoughtworks, recently pointed to data showing significant lines of code per human-landed diff at Meta reportedly increasing 106 percent in a year, while DX data showed median pull-request size increasing 64 percent. Her argument is not simply that AI produces too much code. It is that we may be using code review to solve problems that should have been solved earlier.

That distinction matters.

The reflexive response to an overloaded review queue is: how do we review faster?

Perhaps the better question is: why did we wait until somebody had already built the thing to discuss whether it should be built this way?

## We put the important conversation at the end

Consider what teams expect a pull request to accomplish.

Catch bugs. Teach junior developers. Spread architectural knowledge. Maintain coding standards. Check security. Encourage collective ownership. Debate implementation choices. Preserve quality.

That is an extraordinary amount of institutional responsibility to place on a screen showing green and red lines after the work has already happened.

Suppose an engineer, human or machine, spends three hours implementing the wrong architecture. The reviewer now has two unpleasant options: approve something they dislike, or ask for major changes after most of the work has been completed.

AI magnifies this problem because the cost of getting to the wrong finished implementation is approaching zero. A coding agent does not resent rewriting 600 lines. The human reviewing those 600 lines certainly resents reading them twice.

## Move judgment left

Software engineering has spent decades learning a simple lesson: cheap feedback is early feedback.

Test before deployment. Validate inputs before processing them. Catch security problems before production.

Why should architectural judgment be different?

If a change affects an important subsystem, perhaps the most valuable review happens before the agent writes anything. Five minutes at a whiteboard. A short design note. A conversation about constraints. A statement of what must not change.

Then the agent can operate inside those boundaries.

Laycock's argument is essentially to move many of the benefits associated with code review earlier — through pairing, collective design, automated testing, static analysis, fitness functions and other short feedback loops. Human review remains valuable, but becomes an exception for changes where judgment is genuinely scarce.

That is a very different philosophy from asking a senior engineer to inspect every line simply because a machine can produce every line.

## Review by exception

Not every change deserves equal scrutiny.

Renaming an internal variable and modifying an authentication boundary should not enter the same ceremonial queue. Neither should an automatically generated dependency update and a redesign of the payment system.

An AI-native engineering workflow might classify changes instead. Routine transformations could be validated automatically. Small, reversible changes could move quickly. Human attention could be reserved for changes with a large blast radius, unfamiliar architecture, sensitive data, ambiguous product behaviour, or a developer who says: I am not confident about this.

That sentence might become one of the healthiest artifacts in software development. Not every uncertainty needs another test. Some require another mind.

## The human-in-the-loop myth

Technology companies love the phrase human in the loop.

It sounds reassuring. The machine acts quickly, but somewhere inside the system sits a human with judgment, ethics and common sense, ready to catch anything dangerous.

The problem appears when that human becomes the loop.

If one engineer must approve output from five tireless agents, the architecture has not preserved human judgment. It has converted human judgment into a queue. The person who once designed software now spends the day inspecting it.

That is not collaboration between human and machine. It is supervision. And supervision at machine velocity is exhausting.

Human judgment is slow because understanding is expensive. That expense is often the feature.

## Software craft happens before the diff

There is something revealing about watching two experienced engineers discuss a problem before touching the keyboard.

They talk about what already exists. They remember the outage from three years ago. One says: we tried this once. Another points at a diagram. Someone asks what happens if the queue is delayed.

The solution gradually gets smaller.

By the time they start writing code, half the work has already happened. An AI agent sees almost none of this unless we deliberately give it that context.

So perhaps the future engineering workflow is not: prompt, generate, review. Perhaps it is: understand, design, constrain, generate, verify.

That looks less magical. It also looks much more like engineering.

## The scarce resource was never code

We may eventually produce software in which machines write the overwhelming majority of implementation code.

That does not make human engineers irrelevant. It changes where their value sits.

Knowing what the system should do. Recognizing a dangerous abstraction. Understanding which compromise will become painful next year. Knowing which constraint matters despite never appearing in the ticket. Seeing that the elegant solution is wrong for this team. Knowing when not to build.

These qualities do not appear naturally inside a pull-request diff. They exist before it.

For twenty years, software teams treated code review as the final gate of quality. AI may force us to admit that the gate was placed too late.

The future of software craft may depend less on teaching humans how to review machine output faster, and more on ensuring the important human thinking happens before there is so much machine output to review.

Maybe the pull request does not need a better AI reviewer. Maybe it needs a smaller job.`);

const STORY_2_TITLE = 'The Feeds We Chose: Why RSS Suddenly Feels Radical Again';
const STORY_2_SUMMARY = 'The strange pleasure of RSS is that eventually, there is nothing left to read. In an internet built around infinite scroll, a feed that ends feels unexpectedly like freedom.';
const STORY_2_CONTENT = formatContent(`The strange pleasure of RSS is that eventually, there is nothing left to read.

There is a tiny luxury hidden inside an old RSS reader.

You open it. Twenty-seven new items. You read four. Save two. Dismiss eleven. Skim the rest.

Then something almost impossible happens: you reach the end.

No replacement posts materialize beneath your thumb. No algorithm concludes that because you read an essay about urban planning, your deepest desire is to watch seventeen videos about badly designed airports. No stranger is inserted between two writers you deliberately chose to follow.

The feed simply ends.

For an internet increasingly built around infinite consumption, that little patch of blank screen feels strangely rebellious.

## RSS never needed to know you

The basic idea behind RSS is almost offensively simple.

A website publishes an update. Your reader notices. It appears in your feed.

That is mostly it.

There is no recommendation engine required. No behavioral dossier. No engagement score deciding whether the article deserves to reach you. No creator wondering whether an invisible ranking system will bury the thing they spent three days writing.

You subscribed. They published. You received it.

Modern platforms spent billions improving upon this arrangement until the reader somehow lost control of what appeared on the screen.

RSS now feels new precisely because it is old enough to come from a different philosophy of the web.

## The algorithm solved discovery and colonized attention

Recommendation systems are genuinely useful. Without them, discovering an obscure musician, writer, filmmaker or technical explanation can be difficult. A good algorithm can expose us to things we would never have searched for.

The problem begins when discovery becomes the entire architecture.

Your feed stops representing your choices. It represents predictions about what will keep you present.

Those goals overlap, but they are not identical.

A person may sincerely want to read thoughtful reporting about climate policy. A recommendation system may discover that the same person remains on the platform much longer when mildly irritated by strangers. The system has no philosophical obligation to prefer the first desire. It has an optimization function.

This is how a tool for finding information gradually becomes an environment for manufacturing attention.

## Chronology is a form of power

RSS possesses another unfashionable quality: time behaves normally.

New things appear above old things. That seems almost embarrassingly obvious. But chronological order gives the reader a surprising amount of power.

Nobody can quietly resurrect yesterday's outrage because it predicts engagement. A publication cannot purchase a privileged position halfway through the list. A writer's post does not become invisible because it failed to receive enough early reactions.

Chronology says only: this happened after that. The judgment about importance belongs to you.

That is not always convenient. It requires choosing good sources. It requires unsubscribing from noisy ones. It requires accepting that occasionally you will miss something.

But those inconveniences are also the price of editorial agency. An algorithmic feed is easier because someone else, or something else, keeps deciding what deserves your next thirty seconds.

## The internet once had neighborhoods

There was a period when visiting the web meant travelling between places.

A strange personal homepage. A technology blog. A forum with twelve regulars. A photography site maintained by one obsessive person. A university professor's page that looked unchanged since 2004 but contained better information than half the modern web.

These places had addresses. Textures. Owners.

RSS connected them without flattening them into one platform. The modern social feed turns every creator into a tenant occupying the same visual building — same typography, same buttons, same metrics, same rectangular box.

RSS does the opposite. It lets the reader build the aggregation layer while allowing publishers to remain independent. The publication owns its site. The reader owns the list. The protocol merely introduces them.

That is a remarkably civilized arrangement.

## The return of deliberate reading

RSS never entirely disappeared, of course.

Technical writers, researchers and journalists continued using it while social platforms declared it ancient history. In 2026, RSS readers are once again being discussed as tools for consolidating scattered information sources and escaping the overhead of jumping between platforms.

More revealing than any single growth number is the continuing behavior of independent publishers themselves. Many prominent technical and editorial sites still prominently offer RSS feeds alongside newer distribution channels.

The protocol survived because it solves a problem that never disappeared. People want to follow things without joining everything.

## An inbox for curiosity

The best RSS reader resembles an inbox designed only for things you asked to receive.

Not things your employer needs. Not promotional messages. Not password resets. Not delivery alerts.

Just curiosity.

This creates an interesting psychological shift.

An algorithmic feed asks: what should I consume now?

RSS asks: what have the people I chose published?

The first is a demand-generation system. The second is correspondence.

There is a quiet dignity in the difference.

## The open web does not need to defeat platforms

Predictions of a grand rebellion against social media are probably exaggerated. Most people will continue using recommendation systems because recommendation systems are convenient, entertaining and occasionally excellent.

RSS does not need to replace them.

Books did not disappear when radio arrived. Radio survived television. Email survived messaging apps. Old mediums often become more valuable after they stop pretending to be universal.

RSS can occupy a smaller, more deliberate role. Use social feeds for discovery. Use RSS for continuity.

Find someone interesting on a platform. Then follow their work somewhere the platform cannot decide whether you deserve to see it.

That simple habit changes the relationship.

## Choose your feed

The internet increasingly treats attention as something to be won. Perhaps the more useful response is to stop offering all of it for competition.

Choose twenty publications. Choose ten writers. Choose the obscure specialist who posts once every six weeks. Choose the blog whose design looks mildly broken.

Put them in a reader. Remove anything that repeatedly wastes your time. Add something strange.

Then read until there is nothing left.

The blank space at the bottom will feel unusual at first. We have been trained to interpret emptiness as a product failure.

It might actually be freedom.`);

const STORY_3_TITLE = 'The Geometry of the Chai Bench';
const STORY_3_SUMMARY = 'Cities have become exceptionally good at giving us somewhere to go and surprisingly poor at giving us somewhere to stay. On adda, third places, and the ten rupees that can occasionally purchase an hour of human presence.';
const STORY_3_CONTENT = formatContent(`Cities have become exceptionally good at giving us somewhere to go and surprisingly poor at giving us somewhere to stay.

A plastic stool. A steel kettle blackened underneath. Six glasses, none quite dry. A newspaper folded into quarters. Two scooters parked at angles that would irritate a traffic engineer.

Someone has been standing near the tea stall for forty minutes despite finishing his chai thirty-five minutes ago.

Nobody asks him to leave.

That last detail matters.

In the modern city, almost every comfortable chair comes with an implied transaction. Order another coffee. Renew the coworking pass. Buy a ticket. Book a table. Keep moving.

The humble tea stall obeys a different mathematics. Ten rupees can occasionally purchase an hour of human presence.

## Home, work and the missing third place

Urban life is usually organized around two major environments: home and work.

Sociologists have long described the spaces outside them where informal public life happens as third places — parks, libraries, neighborhood cafés, community centers, barber shops, bookstores, religious courtyards, street corners.

Their value is not primarily architectural. It is social neutrality.

You do not need to host anyone. Nobody needs to clean the house beforehand. There is no agenda. You can arrive without knowing exactly why.

Recent Indian reporting has returned to this idea while examining loneliness in increasingly digitized cities, noting that third spaces derive much of their value from precisely this neutrality — while survey data consistently indicates substantial loneliness among urban Indians.

The interesting question is whether Indian cities actually need to invent such spaces. We have had versions of them for generations. We simply did not always call them third places.

## Adda has no minutes of meeting

Bengali has a particularly good word for a phenomenon that English struggles to package neatly: adda.

Conversation without a deliverable.

People gather and talk. Politics may enter. Cricket. Cinema. A neighbor. A bad poem. An excellent poem. The price of fish. Someone's new job. Someone else's refusal to get one.

The conversation has no chairperson and rarely respects its starting topic.

An adda is successful precisely because nothing measurable necessarily emerges from it. This makes it almost offensive to contemporary productivity culture. There are no KPIs for a three-hour argument beside a kettle. No one records an action item. Nobody posts a meeting summary.

The point is not what the conversation produces. The conversation is the thing.

## We optimized away accidental friendship

Modern urban systems are very good at reducing unnecessary encounters.

Groceries arrive downstairs. Meals arrive upstairs. Cars are summoned through an app. Tickets live on screens. Office work happens through laptops. Entertainment streams into bedrooms. Payments require almost no conversation.

Each innovation removes friction. Taken individually, most are excellent.

Taken together, they create a peculiar possibility: a person can live an efficient metropolitan life while barely participating in the metropolis. You can spend an entire day surrounded by millions of people and speak meaningfully to almost none of them.

Convenience shrinks the number of occasions on which strangers become familiar. And familiarity matters.

The tea seller who notices you have not appeared for three days. The retired man whose political opinions you know too well. The student who always borrows the newspaper. The office worker whose name nobody remembers but whose chair everyone saves.

These are not necessarily friendships. That is precisely what makes them important.

A healthy social life cannot consist entirely of best friends. We also need weak ties, recurring faces and people who recognize us without requiring access to our inner lives.

## The café is not automatically a third place

It would be easy to solve the problem commercially. Build prettier cafés. Add warm lighting. Put books on shelves. Call the space a community hub.

But third places are fragile because the thing that makes them valuable is often the thing that makes them economically awkward: people need permission to linger.

A café that depends on rapid table turnover cannot genuinely encourage someone to buy one tea and remain for two hours. A luxury coworking lounge may be socially pleasant but excludes anyone unwilling or unable to pay for access. A mall offers climate-controlled public space while continuously reminding everyone that they are standing inside a machine designed for consumption.

This does not make commercial spaces bad. It simply means belonging and purchasing are different activities.

A real third place tolerates unproductive presence.

## The architecture is partly psychological

A third place does not need expensive design. It needs low stakes.

You should be able to enter without preparation. You should not need an invitation. You should not feel conspicuous for being alone. You should be able to encounter the same people repeatedly. The space should allow conversation without requiring it.

Libraries often do this beautifully. So do parks. Neighborhood sports grounds. Tea stalls. Campus courtyards. Small bookstores. Certain street corners whose importance exists entirely outside municipal planning documents.

Delhi is currently seeing community-oriented spaces built around zines, music and art, with organizers explicitly emphasizing conversation and accessible participation over conventional commercial culture.

Perhaps this is the more interesting urban trend — not the return of one particular historical format, but the return of low-pressure gathering.

## The feed cannot replace the bench

Digital communities are real communities. Friendships formed online are real friendships.

But physical co-presence contains things software cannot perfectly compress: the pause before someone answers, a second conversation happening three chairs away, the ability to say nothing together, the smell of rain hitting warm pavement, somebody ordering another round of tea for everyone without opening a payment-split calculator, the fact that leaving requires physically standing up.

These details appear trivial because they are difficult to quantify. Human life is full of important things that perform badly in spreadsheets.

## Build places where nothing has to happen

Cities need infrastructure. Roads. Metro lines. Housing. Hospitals. Schools.

But cities also need places whose purpose is less obvious.

A bench beneath a tree. A library open late. A neighborhood square. A tea stall allowed to keep three mismatched chairs outside. A cultural room where attendance does not require professional networking.

A place where the answer to the question of what you are doing here can simply be: nothing.

That nothing is not empty. It is where acquaintances become familiar, where strangers become characters in one another's routines, and where loneliness occasionally loses because somebody moved over and made room on the bench.

We keep trying to engineer connection through better networks.

Sometimes the missing network is six plastic stools around a kettle.`);

const STORY_4_TITLE = 'The Sovereignty Stack: Why Builders Want Their Computers Back';
const STORY_4_SUMMARY = 'The cloud was supposed to free us from managing computers. Somewhere along the way, we began renting permission to use our own. On local AI, self-hosting, and computing on our own terms.';
const STORY_4_CONTENT = formatContent(`The cloud was supposed to free us from managing computers. Somewhere along the way, we began renting permission to use our own.

Open a modern laptop. Eight CPU cores. Maybe twelve. A fast GPU. Sixteen or thirty-two gigabytes of memory. A solid-state drive capable of moving data at absurd speed. A machine that would have looked like a small supercomputer not very long ago.

Now open a productivity application.

Wait for the spinner.

The software cannot show you the note you wrote yesterday because a server somewhere is having a difficult morning.

This contradiction has become so ordinary that we barely notice it. Our personal computers have never been more powerful. Our software has never been more dependent on computers belonging to somebody else.

That arrangement is beginning to shift.

Across open-source development, local AI, self-hosted applications and local-first software, a common instinct is becoming visible: give the machine in front of me more responsibility.

## The cloud won because it was genuinely better

There is no need to manufacture a villain.

Cloud computing solved enormous problems. Deploying servers became easier. Collaboration became normal. Files synchronized across devices. Backups improved. Small teams gained infrastructure previously available only to large companies.

The cloud won because centralization was useful.

But successful technologies often overshoot. A tool that began as an option becomes an assumption. Then the assumption becomes an architecture. Eventually even applications that handle deeply personal, inherently local information behave as though every click needs approval from a distant database.

## Developers are rediscovering locality

A September analysis of Hacker News discussions found recurring interest in open source, local AI, self-hosted back ends and privacy-oriented tooling, alongside growing skepticism toward platform dependency. It captures a recognizable direction in technical culture.

Local-first software provides another piece of the picture. Modern implementations can store application data directly on the user's device and synchronize in the background rather than treating the server as the gatekeeper for every interaction.

SQLite can run inside browsers through WebAssembly. CRDT systems can reconcile certain forms of concurrent editing. Sync tools can maintain local replicas while still providing centralized authentication, backup and collaboration.

A detailed 2026 account in Smashing Magazine describes this architecture as a strong fit for notes, documents, planning tools, field applications and other products where user-generated data benefits from instant local access and offline durability.

The machine becomes useful even when the network disappears. That should not feel revolutionary. Yet it does.

## Then AI arrived

Artificial intelligence adds another layer to this argument.

The dominant AI architecture is extraordinarily centralized. Your device sends text, images, documents or audio to infrastructure operated somewhere else. A model processes it. The answer returns.

This makes sense for extremely large models requiring enormous computational resources. But smaller models can increasingly perform useful work locally — transcription, document search, image classification, code assistance, summarization, private knowledge retrieval, simple agents.

The question is no longer merely: can this run locally?

It becomes: why should this leave the device at all?

If a model can summarize a private journal using hardware already sitting on the desk, transmitting that journal elsewhere becomes an architectural choice rather than an unavoidable requirement. That distinction may become increasingly important.

## Sovereignty is not isolation

The phrase digital sovereignty can easily become melodramatic.

Most people do not want to maintain a home data center. Most businesses do not want employees configuring databases manually. Good infrastructure should remain invisible.

So the goal is not to abandon networks. It is to preserve graceful independence.

A sovereign application might still use the cloud for backup, collaboration, large-model inference, cross-device sync, notifications, payments, authentication. But the user is not completely helpless when those services disappear.

The relationship changes from dependency to cooperation. The cloud becomes a powerful extension of the computer. Not its permission slip.

## Self-hosting is becoming less heroic

Traditional self-hosting often required a certain personality. You needed to enjoy configuration files, know what reverse proxies were, have opinions about Linux distributions, be willing to spend Sunday afternoon discovering that the certificate had expired.

That audience still exists.

But containers, managed tunnels, simple deployment platforms and increasingly polished open-source software have lowered the barrier considerably.

The interesting future is not one where everyone becomes a system administrator. It is one where ownership becomes an ordinary product option.

Use our hosted service if you want convenience. Run it yourself if you need control. Export everything in a boring, documented format. Move somewhere else if we stop deserving your trust.

That is a healthier relationship between software and customer.

## Subscription fatigue is partly architectural

People frequently complain about having too many subscriptions. Usually the complaint is framed as price. But another irritation sits underneath it.

Things that once felt owned increasingly feel contingent. Stop paying and the tool disappears. The service closes and the workflow disappears. An acquisition happens and the terms change. An API price changes and an independent application becomes economically impossible overnight.

Cloud economics turned software into a continuing relationship. Sometimes that relationship is worth paying for. Sometimes the software resembles a refrigerator demanding rent.

Local and self-hosted systems introduce another possibility: the product can continue existing even if the commercial relationship changes. That durability has value beyond saving money.

## The test is graceful failure

Perhaps the easiest way to evaluate modern software is surprisingly primitive.

Turn off the Wi-Fi. What remains? Can you read your own work? Can you create something? Can you search? Can the application preserve what you did and reconcile later?

If the answer is yes, the product has a degree of independence.

If the answer is a blank screen, then despite the extraordinary computer in your hands, you are using a terminal for somebody else's machine.

Neither architecture is automatically correct. But users should know which one they bought.

## Computing on our own terms

For twenty years, software steadily moved outward. Files moved to servers. Applications moved to browsers. Processing moved to APIs. Intelligence moved into enormous remote models.

Now some of it is moving home again.

Not because networks failed. Because local hardware became powerful enough to renegotiate the relationship.

The most interesting products may combine both worlds. Local when local is enough. Cloud when cloud is genuinely useful. Self-hostable when independence matters. Portable when trust changes. Private by default where possible. Connected by choice where valuable.

The computer on your desk is astonishingly capable.

Perhaps the next generation of software will finally let it act that way.`);

// ─── editorial assignments ───────────────────────────────────────────────────

const slate = [
  {
    scheduledHourIST: 10, scheduledMinIST: 0,
    title: STORY_1_TITLE, summary: STORY_1_SUMMARY, content: STORY_1_CONTENT,
    category: 'Tech', authorId: 'bot_aarav_tech', authorPenName: 'aarav_tech',
    tags: ['#SoftwareEngineering','#AICoding','#CodeReview','#AgenticAI','#DeveloperExperience'],
    batchId: '2026-09-22-slate'
  },
  {
    scheduledHourIST: 13, scheduledMinIST: 0,
    title: STORY_2_TITLE, summary: STORY_2_SUMMARY, content: STORY_2_CONTENT,
    category: 'Culture', authorId: 'bot_writer_065', authorPenName: 'gopal_krishnan_jokes',
    tags: ['#RSS','#OpenWeb','#DigitalSovereignty','#AlgorithmicFeeds','#CalmTechnology'],
    batchId: '2026-09-22-slate'
  },
  {
    scheduledHourIST: 16, scheduledMinIST: 0,
    title: STORY_3_TITLE, summary: STORY_3_SUMMARY, content: STORY_3_CONTENT,
    category: 'Culture', authorId: 'bot_writer_065', authorPenName: 'gopal_krishnan_jokes',
    tags: ['#AddaCulture','#ThirdSpaces','#IndianCulture','#CommunitySpaces','#UrbanLife'],
    batchId: '2026-09-22-slate'
  },
  {
    scheduledHourIST: 19, scheduledMinIST: 0,
    title: STORY_4_TITLE, summary: STORY_4_SUMMARY, content: STORY_4_CONTENT,
    category: 'Tech', authorId: 'bot_aarav_tech', authorPenName: 'aarav_tech',
    tags: ['#LocalAI','#SelfHosted','#LocalFirst','#DigitalSovereignty','#DataPrivacy'],
    batchId: '2026-09-22-slate'
  }
];

// ─── DB ──────────────────────────────────────────────────────────────────────

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function publishStory(piece) {
  const label = piece.title.slice(0, 60);
  console.log(`\n🚀 Publishing: "${label}..."`);

  const slopCheck = validateZeroAISlopEngineBlockers({
    title: piece.title, content: piece.content, summary: piece.summary, now: new Date()
  });
  if (!slopCheck.isValid) {
    console.error(`❌ Slop blocker failed: ${JSON.stringify(slopCheck.violations)}`);
    return;
  }

  const integrity = validateGeneratedArticleIntegrity({
    title: piece.title, content: piece.content, category: piece.category
  });
  if (!integrity.isValid) {
    console.error(`❌ Integrity check failed: ${integrity.reasons.join('; ')}`);
    return;
  }

  const slug = createSlug(piece.title);
  const readingTime = calculateReadingTime(piece.content);
  const wordCount = piece.content.split(/\s+/).filter(Boolean).length;
  const coverImage = getCoverImageForCategory(piece.category);

  const client = await pool.connect();
  try {
    await client.query('begin');

    const existing = await client.query(
      'SELECT id, slug FROM public.posts WHERE title = $1 LIMIT 1', [piece.title]
    );

    let postId, finalSlug;

    if (existing.rowCount > 0) {
      postId = existing.rows[0].id;
      finalSlug = existing.rows[0].slug;
      console.log(`  ♻️  Already exists (${postId}) — updating content & read time`);
      await client.query(`
        UPDATE public.posts
        SET summary = $1, content = $2, category = $3,
            reading_time_min = $4, word_count = $5, updated_at = now()
        WHERE id = $6
      `, [piece.summary, piece.content, piece.category, readingTime, wordCount, postId]);
    } else {
      const res = await client.query(`
        INSERT INTO public.posts (
          slug, author_id, title, summary, content, category, cover_image_url,
          status, is_public, reading_time_min, published_at, provenance,
          language_code, language_source, language_confidence,
          word_count, word_count_source, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          'published', true, $8, now(), 'synthetic',
          'en', 'author', 1.0,
          $9, 'system', now(), now()
        ) RETURNING id, slug
      `, [slug, piece.authorId, piece.title, piece.summary, piece.content,
          piece.category, coverImage, readingTime, wordCount]);

      postId = res.rows[0].id;
      finalSlug = res.rows[0].slug;
      console.log(`  ✅ Inserted: ${postId} (${finalSlug})`);
    }

    await client.query(
      `UPDATE public.bot_configs SET last_posted_at = now(), updated_at = now() WHERE id = $1`,
      [piece.authorId]
    );

    await client.query(`
      INSERT INTO public.bot_activity_logs (bot_id, action_type, target_post_id, details, status)
      VALUES ($1, 'post', $2, $3, 'success')
    `, [piece.authorId, postId, JSON.stringify({ title: piece.title, category: piece.category, batch: piece.batchId })]);

    await client.query('commit');

    console.log(`  📖 ${wordCount} words | ${readingTime} min read | ${piece.category}`);

    await recordLedgerEntry(pool, {
      status: 'executed', entryType: 'publication',
      authorId: piece.authorId, authorPenName: piece.authorPenName,
      genre: piece.category, title: piece.title, approxWordCount: wordCount,
      targetPostId: postId,
      details: { slug: finalSlug, tags: piece.tags, editorialBatch: piece.batchId }
    }).catch(e => console.warn('  ⚠️  Ledger warning:', e.message));

    // Regenerate RSS feeds
    try {
      execSync('node server/src/scripts/generate-seo-feeds.mjs', {
        cwd: 'D:/VibeCode/WritOn-PowerUp', timeout: 60000, stdio: 'inherit'
      });
    } catch (e) {
      console.warn('  ⚠️  RSS feed regen warning:', e.message);
    }

    console.log(`  🎉 Done: "${piece.title}"`);
  } catch (err) {
    await client.query('rollback');
    console.error(`  ❌ Failed: ${err.message}`);
  } finally {
    client.release();
  }
}

// ─── main: schedule all four ─────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════════════════');
console.log('  WritOn Sept 22, 2026 — Editorial Slate Scheduler');
console.log(`  Started at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
console.log('═══════════════════════════════════════════════════════════════');

for (const piece of slate) {
  scheduleAt(piece.scheduledHourIST, piece.scheduledMinIST, piece.title.slice(0, 50), () => {
    publishStory(piece).catch(e => console.error('Publish error:', e.message));
  });
}

console.log('\nScheduler running. Process will stay alive until all stories are published.');
console.log('(Keep this terminal/process active — stories publish automatically at each time slot)\n');
