#!/usr/bin/env node
/**
 * Dispatch "The Cognitive Fast" post live to LinkedIn
 */

import dotenv from 'dotenv';
import pg from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LinkedInDb } from '../services/linkedin-db.js';
import { LinkedInClient } from '../services/linkedin-client.js';
import { LinkedInMediaClient } from '../services/linkedin-media-client.js';
import { LinkedInPublisherService } from '../services/linkedin-publisher-service.js';
import { LinkedInValidatorService } from '../services/linkedin-validator-service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const commentary = `The Cognitive Fast: What Happens When We Skip the Thinking?

AI coding assistants have made one thing dramatically easier: getting to an answer.

But some engineers are starting to question what happens when we skip too much of the thinking that used to happen on the way there.

When you solve a problem yourself, you build a mental model of the system:
• You remember why an abstraction exists.
• You understand where the fragile assumptions live.
• You develop debugging intuition.
• You learn the architecture by wrestling with it.

AI can compress that process—sometimes usefully, sometimes too effectively.

That is why the idea of a “cognitive fast” is interesting: deliberately stepping away from AI assistance for a period of time, not because the tools are bad, but because comprehension is a skill that still needs exercise.

The risk is not that AI makes developers incapable. The risk is that speed becomes so convenient that deep understanding starts to feel inefficient.

And in complex systems, the person with the strongest internal model often becomes the person everyone needs when something strange happens.

AI can increase output. But some forms of engineering judgment are built slowly.

Would you ever spend a week coding without AI just to see what changed?

#SoftwareEngineering #DeveloperExperience #ArtificialIntelligence #Coding #FutureOfWork`;

async function main() {
  console.log('🚀 Initiating Live LinkedIn Dispatch for "The Cognitive Fast"...');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = new LinkedInDb(pool);
  const client = new LinkedInClient({ log: console });
  const mediaClient = new LinkedInMediaClient({ client, db, log: console });
  const publisher = new LinkedInPublisherService({ client, mediaClient, db, log: console });
  const validator = new LinkedInValidatorService({ db, log: console });

  const recentPubs = await db.getRecentPublications(10);

  // 1. Evaluate Gates
  const gateEval = validator.evaluateGates({
    commentary,
    format: 'TEXT_ONLY',
    recentPublications: recentPubs,
    ignoreScheduleWindow: true
  });

  if (!gateEval.allPassed) {
    console.error('❌ Quality gates failed:');
    gateEval.results.filter(r => !r.passed).forEach(r => console.error(` - [${r.gateCode}] ${r.failureReason}`));
    process.exit(1);
  }
  console.log('🛡️ All 20 Quality Gates Passed.');

  // 2. Create Candidate & Version in PostgreSQL
  const { candidate, version } = await db.createCandidate({
    format: 'TEXT_ONLY',
    commentary,
    hashes: {
      brainHash: 'ai_cognitive_fast',
      contentHash: 'hash_cognitive_fast_20260927'
    }
  });
  console.log(`📝 Created Candidate ${candidate.id}, Version ${version.id}`);

  // 3. Approve Candidate Version
  await db.approveCandidateVersion(version.id);
  console.log('🔒 Candidate Version approved and frozen.');

  // 4. Live Dispatch via LinkedIn Posts API
  console.log('⚡ Publishing to LinkedIn Posts API (/rest/posts)...');
  const pubOutcome = await publisher.publishCandidateVersion({
    candidateVersionId: version.id,
    isDryRun: false,
    ignoreScheduleWindow: true
  });

  console.log('🏁 Publication Result:');
  console.log(JSON.stringify(pubOutcome, null, 2));

  await pool.end();
}

main().catch(err => {
  console.error('Fatal dispatch error:', err);
  process.exit(1);
});
