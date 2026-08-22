import { db, sqlite } from './index.js';
import { users, posts, comments, follows, likes, bookmarks } from './schema.js';
import { hashPassword } from '../auth/password.js';

export async function seedDatabase() {
  console.log('🌱 Starting WritOn database seed...');

  // Clear existing data safely
  sqlite.exec(`
    DELETE FROM comments;
    DELETE FROM likes;
    DELETE FROM bookmarks;
    DELETE FROM follows;
    DELETE FROM posts;
    DELETE FROM users;
  `);

  const defaultPassword = await hashPassword('password123');

  // Seed Authors
  const seedUsers = [
    {
      id: 'usr_maya_lin',
      penName: 'mayalin',
      fullName: 'Maya Lin',
      email: 'maya.lin@writon.dev',
      passwordHash: defaultPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      bio: 'Essayist, architectural critic, and student of quiet spaces. Writing about design systems, stillness, and human craft.',
      quoteOfDay: 'Architecture is frozen music, but prose is flowing architecture.',
      followersCnt: 1420,
      followingCnt: 34
    },
    {
      id: 'usr_elena_vance',
      penName: 'elenavance',
      fullName: 'Dr. Elena Vance',
      email: 'elena.vance@writon.dev',
      passwordHash: defaultPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
      bio: 'Cognitive scientist and AI researcher. Exploring the boundaries between human intuition and machine inference.',
      quoteOfDay: 'The mind is not a vessel to be filled, but a fire to be kindled.',
      followersCnt: 2890,
      followingCnt: 89
    },
    {
      id: 'usr_julian_ross',
      penName: 'julianross',
      fullName: 'Julian Ross',
      email: 'julian.ross@writon.dev',
      passwordHash: defaultPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      bio: 'Poet, typographer, and night-owl coder. Finding rhythm in verse and binary alike.',
      quoteOfDay: 'In typography as in life, white space gives meaning to the ink.',
      followersCnt: 980,
      followingCnt: 112
    },
    {
      id: 'usr_aiden_cross',
      penName: 'aidencross',
      fullName: 'Aiden Cross',
      email: 'aiden.cross@writon.dev',
      passwordHash: defaultPassword,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
      bio: 'Speculative fiction writer and philosopher of future histories.',
      quoteOfDay: 'The future is already here — it is just unevenly distributed.',
      followersCnt: 1750,
      followingCnt: 45
    }
  ];

  for (const u of seedUsers) {
    await db.insert(users).values(u);
  }

  // Seed Posts / Stories
  const seedPosts = [
    {
      id: 'post_001',
      authorId: 'usr_maya_lin',
      title: 'The Architecture of Solitude: Designing Spaces for Thought in a Hyper-Connected World',
      slug: 'the-architecture-of-solitude-designing-spaces-for-thought',
      summary: 'Why modern architectural density fails the human psyche, and how intentional spatial acoustics can restore deep contemplative focus.',
      category: 'Essays',
      coverImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80',
      readingTimeMin: 5,
      likesCnt: 284,
      commentsCnt: 14,
      bookmarksCnt: 89,
      isPublished: true,
      content: `## The Disappearance of Quietude

We live in an era characterized not merely by technological saturation, but by an acoustic and visual claustrophobia. The modern cityscape, engineered for commerce and throughput, leaves little room for the sacred pause. 

When we examine the monasteries of 12th-century Europe or the traditional *machiya* courtyards of Kyoto, we observe a shared architectural intuition: **space must breathe so the mind may listen.**

### Spatial Echoes and Cognitive Bandwidth

Cognitive load theory reveals that visual clutter generates ambient micro-decisions. Every open door, flashing billboard, and glass partition invites subconscious appraisal. 

> "We shape our buildings; thereafter, our buildings shape us." — Winston Churchill

To reclaim deep creative focus, we must design environments with deliberate acoustic buffers and tactile materials:

1. **Mass Timber & Raw Clay**: Natural damping coefficients that absorb harsh high-frequency noise.
2. **Threshold Sequences**: Transition zones (*genkan*) between chaotic public spaces and sanctuary chambers.
3. **Indirect Natural Illumination**: Diffused skylights that mark the passage of the sun without glare.

When our surroundings honor silence, our internal narrative finally discovers its true register.`
    },
    {
      id: 'post_002',
      authorId: 'usr_elena_vance',
      title: 'Beyond the Token Window: What Small Local Models Teach Us About Human Memory',
      slug: 'beyond-the-token-window-small-local-models-human-memory',
      summary: 'How running 2B parameter neural networks on edge devices reveals surprising parallels to human cognitive heuristics and biological memory compression.',
      category: 'Tech',
      coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
      readingTimeMin: 6,
      likesCnt: 412,
      commentsCnt: 23,
      bookmarksCnt: 145,
      isPublished: true,
      content: `## The Myth of Infinite Context

The machine learning industry has spent years chasing ever-expanding context windows — 128k, 1M, 10M tokens. Yet the human working memory operates under fierce physical constraints: Miller’s magical number seven (plus or minus two).

When we deploy quantized **Gemma-2B** or **SmolLM** on modern consumer chips, we witness a fascinating phenomenon: aggressive quantization forces structural distillation.

### On-Device Inference as a Philosophical Constraint

Running local inference is not just an engineering optimization to avoid cloud API billing; it is a profound paradigm shift:

\`\`\`typescript
// Zero cloud footprint on-device token pipeline
const engine = await CreateMLCEngine("gemma-2b-it-q4f16_1");
const summary = await engine.chat.completions.create({
  messages: [{ role: "user", content: "Distill the core premise in 3 bullets." }]
});
\`\`\`

### Key Takeaways for Builders

- **Zero-Latency Privacy**: Your words never leave your local RAM.
- **Graceful Heuristics**: Compact models generalize patterns rather than brute-forcing encyclopedic recall.
- **Energy Alignment**: Processing 40 tokens per second on 5 watts reflects the energy budget of biological brains.`
    },
    {
      id: 'post_003',
      authorId: 'usr_julian_ross',
      title: 'Cantos for the Midnight Terminal: A Suite in Four Movements',
      slug: 'cantos-for-the-midnight-terminal-four-movements',
      summary: 'Lyrical reflections on luminous phosphor, silent nocturnes, and the poetry woven into every closing parenthesis.',
      category: 'Poetry',
      coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
      readingTimeMin: 3,
      likesCnt: 198,
      commentsCnt: 8,
      bookmarksCnt: 52,
      isPublished: true,
      content: `### I. Phosphor Bloom

\`\`\`
The cursor blinks —
a green pulse against obsidian,
a lighthouse for thoughts
that arrive only when the city sleeps.
\`\`\`

### II. The Indentation

\`\`\`
We build cathedrals out of whitespace,
tab stops and carriage returns,
where every bracket holds a breath,
and every semicolon closes a covenant.
\`\`\`

### III. The Compiling Dawn

\`\`\`
Across the sill, the grey light gathers;
the fan spins down, the tests all pass.
In the cold glass of the window,
a reflection of who you were at 2 AM
dissolves into the morning.
\`\`\``
    },
    {
      id: 'post_004',
      authorId: 'usr_aiden_cross',
      title: 'The Cartography of Forgotten Ideas: Why Obsolete Systems Still Matter',
      slug: 'the-cartography-of-forgotten-ideas-obsolete-systems',
      summary: 'Exploring the abandoned philosophical pathways of computing history — from Project Xanadu to Xerox PARC Smalltalk environments.',
      category: 'Philosophy',
      coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
      readingTimeMin: 7,
      likesCnt: 320,
      commentsCnt: 19,
      bookmarksCnt: 110,
      isPublished: true,
      content: `## The Linearity Illusion

We are conditioned to view technology as a relentless, unidirectional progression. Each decade supposedly supersedes the previous. 

Yet when we study Ted Nelson’s original vision for **Project Xanadu** (two-way transclusion, visible micro-provenance, deeply non-linear document graphs), we realize that the modern web is merely one compromised branch of an expansive evolutionary tree.

### What We Lost in the Flat Web

- **Visible Interconnection**: In Xanadu, a quote never broke its umbilical cord to its source text.
- **Dynamic Malleability**: In Alan Kay's Smalltalk, every button, window, and text buffer was live, inspectable code.
- **Autonomous Archival**: Systems designed for centurial persistence rather than ephemeral 404 links.

By looking backward into these discarded computational architectures, we can design the next generation of creative tools with richer depth and permanence.`
    }
  ];

  for (const p of seedPosts) {
    await db.insert(posts).values(p);
  }

  // Seed Comments
  const seedComments = [
    {
      id: 'cmt_001',
      postId: 'post_001',
      authorId: 'usr_elena_vance',
      content: 'The point about acoustic damping and cognitive bandwidth resonates deeply with our lab’s neurological findings on cortisol levels in open-plan architecture.',
      parentId: null
    },
    {
      id: 'cmt_002',
      postId: 'post_001',
      authorId: 'usr_maya_lin',
      content: 'Thank you Elena! I would love to read more about your lab measurements on natural timber environments.',
      parentId: 'cmt_001'
    },
    {
      id: 'cmt_003',
      postId: 'post_002',
      authorId: 'usr_aiden_cross',
      content: 'Fascinating perspective on local inference as a philosophical boundary rather than a mere cost saving.',
      parentId: null
    }
  ];

  for (const c of seedComments) {
    await db.insert(comments).values(c);
  }

  // Seed Follows
  await db.insert(follows).values({
    id: 'flw_001',
    followerId: 'usr_maya_lin',
    followingId: 'usr_elena_vance'
  });
  await db.insert(follows).values({
    id: 'flw_002',
    followerId: 'usr_julian_ross',
    followingId: 'usr_maya_lin'
  });

  // Seed Likes & Bookmarks
  await db.insert(likes).values({
    id: 'lk_001',
    userId: 'usr_elena_vance',
    postId: 'post_001'
  });
  await db.insert(bookmarks).values({
    id: 'bm_001',
    userId: 'usr_elena_vance',
    postId: 'post_001'
  });

  console.log('✅ Seed completed successfully with 4 authors, 4 stories, comments, likes, and follows!');
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase().catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}
