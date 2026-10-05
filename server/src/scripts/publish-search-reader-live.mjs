#!/usr/bin/env node
/**
 * Dispatch "A search result isn't a reader" post live to LinkedIn with official watercolor image asset.
 */

import dotenv from 'dotenv';
import pg from 'pg';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LinkedInDb } from '../services/linkedin-db.js';
import { LinkedInClient } from '../services/linkedin-client.js';
import { LinkedInMediaClient } from '../services/linkedin-media-client.js';
import { LinkedInPublisherService } from '../services/linkedin-publisher-service.js';
import { LinkedInValidatorService } from '../services/linkedin-validator-service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const commentary = `A writer can rank in search and still never gain a reader.

The trends data flags “AI search for fiction authors” as a topic worth watching. It raises a useful question: once someone discovers your story, what gives them a reason to return?

A search result can introduce the work. But a memorable character, a consistent publishing rhythm, and a place to continue the conversation build the relationship.

For fiction writers, the practical test is simple: after someone finishes one piece, is their next step clear?

What has brought readers back to your writing?

#fictionwriting #indieauthors #writingcommunity`;

async function main() {
  console.log('🚀 Initiating Live LinkedIn Dispatch with user uploaded asset...');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = new LinkedInDb(pool);
  const client = new LinkedInClient({ log: console });
  const mediaClient = new LinkedInMediaClient({ client, db, log: console });
  const publisher = new LinkedInPublisherService({ client, mediaClient, db, log: console });
  const validator = new LinkedInValidatorService({ db, log: console });

  const imagePath = path.resolve(__dirname, '../../../public/assets/linkedin-cards/search_result_isnt_a_reader.jpg');
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Asset not found at ${imagePath}`);
  }

  const fileBuffer = fs.readFileSync(imagePath);
  const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const fileStats = fs.statSync(imagePath);

  const recentPubs = await db.getRecentPublications(10);

  // 1. Evaluate Quality Gates
  const gateEval = validator.evaluateGates({
    commentary,
    format: 'SINGLE_IMAGE',
    mediaAssets: [{ id: 'search_result_isnt_a_reader.jpg' }],
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
    format: 'SINGLE_IMAGE',
    commentary,
    hashes: {
      brainHash: 'ai_search_fiction_reader',
      contentHash: fileHash
    }
  });
  console.log(`📝 Created Candidate ${candidate.id}, Version ${version.id}`);

  // 3. Attach Image Asset to Candidate Version
  await db.addAsset({
    candidateVersionId: version.id,
    sequenceOrder: 1,
    kind: 'IMAGE',
    mimeType: 'image/jpeg',
    fileSizeBytes: fileStats.size,
    sha256: fileHash,
    storageUri: 'https://writon.cc/assets/linkedin-cards/search_result_isnt_a_reader.jpg',
    localPath: imagePath,
  });
  console.log('📎 Attached image asset to candidate version.');

  // 4. Approve Candidate Version (triggers DB immutability freeze)
  await db.approveCandidateVersion(version.id);
  console.log('🔒 Candidate Version approved and frozen.');

  // 5. Live Dispatch via LinkedIn Posts API
  console.log('⚡ Publishing to LinkedIn Posts API (/rest/posts) with media upload...');
  const pubOutcome = await publisher.publishCandidateVersion({
    candidateVersionId: version.id,
    isDryRun: false,
    ignoreScheduleWindow: true
  });

  console.log('\n🏁 Publication Result:');
  console.log(JSON.stringify(pubOutcome, null, 2));

  await pool.end();
}

main().catch(err => {
  console.error('Fatal dispatch error:', err);
  process.exit(1);
});
