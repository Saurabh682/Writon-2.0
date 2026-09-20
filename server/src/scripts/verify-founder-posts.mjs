import { LinkedInValidatorService } from '../services/linkedin-validator-service.js';

const validator = new LinkedInValidatorService();

const posts = [
  {
    name: 'Post 1: Hold back feed',
    commentary: `Most reading apps are built to show you more of what you already like.

It's also how taste quietly stops growing.

So I'm building WritOn differently. I want it to hold back about a fifth of what you see for writing you'd never have picked yourself. A poem when you came for a story. A voice from a city you've never been to.

I don't know yet if readers will love it or hate it. That's what the first 25 founding writers are for.

What's a piece you loved that you'd never have chosen for yourself?`,
    targetDate: new Date('2026-09-23T03:30:00.000Z') // Wed Sep 23 9:00 AM IST
  },
  {
    name: 'Post 2: Hesitated sentence',
    commentary: `Every writer has a sentence they hesitated to write.

Not because it was bad. Because it was true.

The line about the argument you never resolved. The character who is a little too much like someone you know. The ending you already knew but didn't want.

Tonight's exercise: write that sentence. One line. Then stop, and leave the next line for tomorrow.

Unfinished momentum is the easiest way to begin again.

If you're comfortable, drop just the first five words in the comments. Not the whole sentence.`,
    targetDate: new Date('2026-09-25T03:30:00.000Z') // Fri Sep 25 9:00 AM IST
  },
  {
    name: 'Post 3: Honest audit',
    commentary: `I posted about 30 times in two weeks and got roughly 1,200 impressions in total. I have 23 followers. Almost nobody commented.

Here's what I learned:

1. My best posts were the ones where I said something I actually believed. A post that was only a link got 3 impressions.
2. Posting more didn't help. Some days I posted four or five times, and the posts competed with each other.
3. Many of my captions opened with a label instead of an idea.

So I'm changing three things. One post a day at most. One idea per post. And the time I save goes into talking to writers directly.

If you're building something small: what did you change after your first two weeks?`,
    targetDate: new Date('2026-09-28T03:30:00.000Z') // Mon Sep 28 9:00 AM IST
  },
  {
    name: 'Post 4: No camera needed',
    commentary: `Somewhere along the way, writers were told to become video creators.

Post reels. Show your face. Explain your book in 30 seconds. Then, maybe, someone reads it.

I understand why. Attention is where the algorithms are. But plenty of good writers are quiet people, and the quiet is often where the work comes from.

I'm building WritOn on a simple belief: you shouldn't need a camera to be a writer. Publish under your name or a pen name. Let the sentences do the talking.

What has "building your audience" actually asked of you as a writer?`,
    targetDate: new Date('2026-10-02T03:30:00.000Z') // Fri Oct 2 9:00 AM IST
  }
];

console.log('--- VALIDATING 4 FOUNDER POSTS ---');
for (const p of posts) {
  const res = validator.evaluateGates({
    commentary: p.commentary,
    format: 'TEXT_ONLY',
    targetDate: p.targetDate,
    recentPublications: []
  });
  console.log(`${p.name}: ${res.allPassed ? '✅ ALL GATES PASSED (19/19)' : '❌ FAILED'}`);
  if (!res.allPassed) {
    res.results.filter(r => !r.passed).forEach(r => console.log(`  - [${r.gateCode}] ${r.failureReason}`));
  }
}
