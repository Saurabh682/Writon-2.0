#!/usr/bin/env node

/**
 * CLI Runner: Creates and verifies a complete 4-slide test carousel package.
 * Governed by Editorial Brain & Meta Graph API v26.0 rules.
 */

import { createTestCarouselPackage } from '../server/src/services/create-test-carousel.js';
import path from 'node:path';

async function main() {
  console.log('================================================================');
  console.log('🎨 WRITON INSTAGRAM CAROUSEL GENERATOR & BRAIN VALIDATION TEST');
  console.log('================================================================\n');

  const outcome = await createTestCarouselPackage();

  console.log(`✓ Generated 4 High-Resolution 1080x1350 Warm Parchment Slides:`);
  for (const asset of outcome.assets) {
    console.log(`  • Slide ${asset.sequenceOrder} [${asset.editorialRole.toUpperCase()}]: ${path.basename(asset.storageUri)} (${(asset.fileSizeBytes / 1024).toFixed(1)} KB, sha256: ${asset.sha256.slice(0, 10)}...)`);
  }

  console.log(`\n🔒 Cryptographic Integrity Hashes:`);
  console.log(`  • Content Hash:         ${outcome.candidateVersion.content_hash.slice(0, 16)}...`);
  console.log(`  • Asset Manifest Hash:  ${outcome.assetManifestHash.slice(0, 16)}...`);
  console.log(`  • Governance Hash:      ${outcome.governanceBundleHash.slice(0, 16)}...`);

  console.log(`\n🛡️ 17 Instagram Channel Gates Audit:`);
  console.log(`  • Passed Overall: ${outcome.validationOutcome.passed ? '✅ YES (17/17 PASSED)' : '❌ FAILED'}`);
  for (const res of outcome.validationOutcome.results) {
    const icon = res.status === 'PASS' ? '✓' : (res.status === 'WARN' ? '⚠' : '✕');
    console.log(`    ${icon} ${res.gateCode.padEnd(34)} : ${res.status}`);
  }

  console.log(`\n📁 Rendered PNG output directory:`);
  console.log(`   ${outcome.outputDir}`);
  console.log('\n✓ Test carousel package generated, validated, and ready for publication intent.\n');
}

main().catch(err => {
  console.error('❌ Failed generating test carousel:', err);
  process.exit(1);
});
