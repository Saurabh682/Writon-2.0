/**
 * Test Carousel Generator & Pre-flight Validator
 * Governed by Master Editorial Brain (campaign/EDITORIAL_BRAIN.json)
 * Generates an official 4-slide Instagram Carousel adhering to:
 * - Slide 1: 0:00 Cut Hook ("Don't Start With Weather")
 * - Slide 2: Tension ("Consequences > Temperature")
 * - Slide 3: Sensory Proof ("Tactile Grounding")
 * - Slide 4: Resolution & CTA ("Write Without Distraction")
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { loadEditorialBrain } from './editorial-brain.js';
import { generateWarmParchmentSlideSvg, renderSlidePng } from './render-warm-parchment-slide.js';
import { InstagramBrainValidator, computeSha256, computeAssetManifestHash, computeGovernanceBundleHash } from './instagram-brain-validator.js';
import { InstagramAssetStore } from './instagram-asset-store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createTestCarouselPackage({ outputDir = path.resolve(__dirname, '../../../campaign/test-carousel-output') } = {}) {
  const brain = loadEditorialBrain();
  const insight = brain.insights.find(i => i.id === 'hook_dont_start_weather') || brain.insights[0];

  const candidateSpec = {
    id: `igc_test_${Date.now().toString(36)}`,
    format: 'FEED_CAROUSEL',
    caption: `“Don’t start with weather. Start with someone deciding something they can’t undo.” 📖✨\n\nA scene begins with a consequence, not ambient temperature. Never spend the opening seconds introducing what should have been the first seconds.\n\nTake that note out of the dark. Publish your first chapter on WritOn today:\n📲 writon.cc/go/craft_dont_start_with_weather\n\n#writon #writingcommunity #storytelling #books #slowreading #amwriting`,
    brain_insight_id: insight.id,
    archetype: insight.proposition_archetype || 'contrarian_rule',
    visual_spec: {
      quoteAuthor: 'WritOn Craft Codex',
      slides: [
        {
          sequenceOrder: 1,
          role: 'hook',
          tag: 'WRITON CRAFT RULE',
          headline: "Don't Start With Weather",
          bodyText: "Start with someone deciding something they cannot undo. A scene begins with a consequence, not ambient temperature.",
          footerCta: 'Swipe to Read →'
        },
        {
          sequenceOrder: 2,
          role: 'tension',
          tag: 'THE COGNITIVE FRICTION',
          headline: "The Ambient Temperature Trap",
          bodyText: "Describing morning mist or afternoon rain feels safe. But reader attention does not wait for meteorological updates. Give them unfinished business.",
          footerCta: 'Swipe to Continue →'
        },
        {
          sequenceOrder: 3,
          role: 'proof',
          tag: 'PHYSICAL PROOF',
          headline: "The Tactile Sensory Anchor",
          bodyText: "A key turned in the lock. The cold tea left on the desk at 5:55 PM. The folded receipt with a number scribbled on the back.",
          footerCta: 'Next: The Resolution →'
        },
        {
          sequenceOrder: 4,
          role: 'cta',
          tag: 'START DRAFTING',
          headline: "Sanctuary for Unrushed Writing",
          bodyText: "Write and read in peace. 100% ad-free serif decks, offline drafting, and organic reach for thoughtful writers.",
          footerCta: 'Link in Bio • Google Play'
        }
      ]
    }
  };

  await fs.mkdir(outputDir, { recursive: true });
  const renderedAssets = [];
  const assetStore = new InstagramAssetStore();

  for (const s of candidateSpec.visual_spec.slides) {
    const svg = generateWarmParchmentSlideSvg({
      slideNumber: s.sequenceOrder,
      totalSlides: 4,
      role: s.role,
      tag: s.tag,
      headline: s.headline,
      bodyText: s.bodyText,
      authorName: 'WritOn Craft Codex',
      footerCta: s.footerCta,
    });

    const pngPath = path.join(outputDir, `slide-${s.sequenceOrder}.png`);
    await renderSlidePng(svg, pngPath);

    const assetRecord = await assetStore.processLocalImage(pngPath, {
      sequenceOrder: s.sequenceOrder,
      editorialRole: s.role,
    });

    // Simulated pre-signed public URL with 2-hour TTL
    assetRecord.id = `asset_test_${s.sequenceOrder}`;
    assetRecord.publicFetchUrl = `https://writon.cc/assets/campaign/test-carousel/slide-${s.sequenceOrder}.jpg`;
    assetRecord.urlExpiresAt = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    renderedAssets.push(assetRecord);
  }

  // Calculate manifest hash from ordered rendered assets
  const assetManifestHash = computeAssetManifestHash(renderedAssets);

  // Compute governance hashes
  const brainHash = computeSha256(JSON.stringify(brain));
  const genesisProtocolHash = computeSha256('GenesisProtocol-v1');
  const instagramEditorialRulesHash = computeSha256('InstagramEditorialRules-v1');
  const platformContractVersion = 'v26.0';
  const governanceBundleHash = computeGovernanceBundleHash({
    brainHash,
    genesisProtocolHash,
    instagramEditorialRulesHash,
    platformContractVersion,
  });

  const candidateVersion = {
    ...candidateSpec,
    revision: 1,
    content_hash: computeSha256(candidateSpec.caption + JSON.stringify(candidateSpec.visual_spec)),
    asset_manifest_hash: assetManifestHash,
    governance_bundle_hash: governanceBundleHash,
  };

  // Run 17-gate validation
  const validator = new InstagramBrainValidator({ brain });
  const validationOutcome = await validator.validateCandidate({
    candidateVersion,
    assets: renderedAssets,
  });

  return {
    candidateVersion,
    assets: renderedAssets,
    assetManifestHash,
    governanceBundleHash,
    validationOutcome,
    outputDir,
  };
}
