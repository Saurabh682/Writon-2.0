#!/usr/bin/env node
/**
 * Dispatch "AI Made Code Cheap. It Didn't Make Software Cheap." live to LinkedIn
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

const commentary = `AI Made Code Cheap. It Didn't Make Software Cheap.

There is a new software economics problem emerging from AI coding: disposable code is becoming almost free.

Need a migration script? Generate it.
Need to connect two APIs? Generate it.
Need an internal tool nobody plans to maintain? Generate it before lunch.

That is useful—until the “temporary” script is still running nine months later.

Now somebody has to understand it. Debug it. Secure it. Update it. Explain why it exists.

And suddenly the economics look very different.

AI reduces the generation cost of software. It does not automatically reduce its ownership cost.

That distinction may become increasingly important for engineering leaders. Before keeping AI-generated code, perhaps every team needs one question:

If this still exists six months from now, who owns understanding it?

Because code can now be generated almost instantly. Institutional understanding still takes time.

#softwareengineering #technicaldebt #developerexperience #softwarearchitecture #artificialintelligence`;

async function main() {
  console.log('🚀 Initiating Live LinkedIn Dispatch...');
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
      brainHash: 'ai_code_cheap_software_expensive',
      contentHash: 'hash_code_cheap_20261002'
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
