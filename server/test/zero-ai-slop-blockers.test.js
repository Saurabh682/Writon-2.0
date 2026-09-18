import { describe, it, expect } from 'vitest';
import {
  validateZeroAISlopEngineBlockers,
  validateGeneratedArticleIntegrity
} from '../src/bot-engine/editorial-intelligence-service.js';
import { validateZeroAISlopHardGate } from '../src/bot-engine/gemini-spark-client.js';
import { buildPremiseCard, validatePremiseOriginality } from '../src/bot-engine/editorial-memory-service.js';

describe('Zero AI Slop Hard Pre-Publication Engine Blockers', () => {
  const mockNow = new Date('2026-09-16T10:00:00Z');

  describe('1. TRENDING_KEYWORD_AS_TITLE_FAIL', () => {
    it('flags titles with canned template suffix ": Reflections on a Changing World"', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'Stock market today: Reflections on a Changing World',
        content: 'Some text that has a physical setting in Varanasi with Ganga ghats.',
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'TRENDING_KEYWORD_AS_TITLE_FAIL')).toBe(true);
      expect(res.violations.find(v => v.rule === 'TRENDING_KEYWORD_AS_TITLE_FAIL').description).toContain('banned canned template formula');
    });

    it('flags titles that start with raw search queries verbatim', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'Stock market today live updates',
        content: 'Setting in a room near Varanasi ghats with mother and father.',
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'TRENDING_KEYWORD_AS_TITLE_FAIL')).toBe(true);
    });

    it('flags titles that match the research dossier topic verbatim without transformation', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'Stock Market Today',
        content: 'Setting in a room near Varanasi ghats with mother and father.',
        researchDossier: { topic: 'stock market today' },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'TRENDING_KEYWORD_AS_TITLE_FAIL')).toBe(true);
    });

    it('passes evocative, transformed literary titles', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Number That Changes Before Lunch',
        content: 'At 1:15 in the afternoon in Assi, the brass water tumbler sat near the thali by the Ganga.',
        persona: { penName: 'priyanka_mishra' },
        now: mockNow
      });
      expect(res.violations.some(v => v.rule === 'TRENDING_KEYWORD_AS_TITLE_FAIL')).toBe(false);
    });
  });

  describe('2. TOPIC_SUBSTITUTION_FAIL', () => {
    it('flags generic Mad Lib template opening paragraphs', () => {
      const content = 'There are moments when a single event or cultural development serves as a lens through which the wider currents of our society become visible. The evolving discourse around **Stock market today** is precisely such a moment.';
      const res = validateZeroAISlopEngineBlockers({
        title: 'Market Musings',
        content,
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'TOPIC_SUBSTITUTION_FAIL')).toBe(true);
    });

    it('flags interchangeable slot-in sentences', () => {
      const content = 'We often mistake velocity for progress. In our rush to quantify and react to daily developments, we risk losing the contemplative distance.';
      const res = validateZeroAISlopEngineBlockers({
        title: 'Market Musings',
        content,
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'TOPIC_SUBSTITUTION_FAIL')).toBe(true);
    });
  });

  describe('3. CURRENT_TOPIC_STALE_SOURCE_FAIL', () => {
    it('flags articles claiming "today" but citing source reports from previous years (2025 in 2026)', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'Stock market today',
        summary: 'A look at current markets today',
        content: 'As recent reports from investopedia.com highlight ("Markets News, Sept. 1, 2025: Stocks Sink"), we see changes.',
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'CURRENT_TOPIC_STALE_SOURCE_FAIL')).toBe(true);
    });

    it('flags articles when research dossier lead report is from a past year', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'Latest Developments Today',
        summary: 'Breaking news today',
        content: 'Looking at recent movements in the room.',
        researchDossier: {
          newsReports: [
            { headline: 'Stocks fall on Sept 1, 2025', source: 'investopedia.com' }
          ]
        },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'CURRENT_TOPIC_STALE_SOURCE_FAIL')).toBe(true);
    });
  });

  describe('4. ABSTRACT_CONCLUSION_WITHOUT_CAUSAL_BRIDGE_FAIL', () => {
    it('flags sweeping macro-societal claims without causal bridge', () => {
      const content = 'Oil prices rose today. As a result, we are witnessing a fundamental shift in how public institutions, markets, and communities organize their priorities.';
      const res = validateZeroAISlopEngineBlockers({
        title: 'Crude and Society',
        content,
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'ABSTRACT_CONCLUSION_WITHOUT_CAUSAL_BRIDGE_FAIL')).toBe(true);
    });
  });

  describe('5. PERSONA_ERASURE_FAIL', () => {
    it('flags Priyanka Mishra pieces that have zero Varanasi / Ganga / domestic presence', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'A Reflection on Digital Finance',
        content: 'Markets move up and down every day. Investors need to be calm and observe cycles with patience and equanimity across all domains.',
        persona: { penName: 'priyanka_mishra' },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'PERSONA_ERASURE_FAIL')).toBe(true);
    });

    it('passes Priyanka Mishra pieces with authentic Varanasi domestic grounding', () => {
      const content = 'At 1:15 in the afternoon, the dining table in our house in Assi belongs to a stainless steel thali and a brass water tumbler near the Ganga.';
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Number That Changes Before Lunch',
        content,
        persona: { penName: 'priyanka_mishra' },
        now: mockNow
      });
      expect(res.violations.some(v => v.rule === 'PERSONA_ERASURE_FAIL')).toBe(false);
    });
  });

  describe('6. GENERIC_APHORISM_FAIL', () => {
    it('flags decorative unearned quote-card philosophy', () => {
      const content = 'Markets fluctuate constantly.\n\n> "To observe the world with patience is to see patterns where others see only noise."\n\nThis matters today.';
      const res = validateZeroAISlopEngineBlockers({
        title: 'Patience in Observation',
        content,
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'GENERIC_APHORISM_FAIL')).toBe(true);
    });
  });

  describe('7. DECORATIVE_CODE_FAIL', () => {
    it('flags code blocks in Essays, Short Stories, Philosophy, Culture', () => {
      const content = 'He looked at the machine.\n\n```typescript\ninterface Mind {\n  calm: boolean;\n}\n```\n\nThen he walked away.';
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Silent Desk',
        content,
        category: 'Essays',
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'DECORATIVE_CODE_FAIL')).toBe(true);
    });

    it('flags trivial boilerplate date-subtraction code in Tech', () => {
      const content = 'Hardware cycles must be maintained.\n\n```typescript\nfunction calculateMaintenanceWindow(device: DeviceLifecycle): number {\n  const duration = device.expectedEol.getTime() - device.releaseDate.getTime();\n  return duration / (1000 * 60 * 60 * 24 * 365);\n}\n```\n\nThis matters.';
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Geometry of Diminishing Returns',
        content,
        category: 'Tech',
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'DECORATIVE_CODE_FAIL')).toBe(true);
    });
  });

  describe('8. METAPHOR_AS_CODE_FAIL', () => {
    it('flags programming constructs used as metaphors for sports or emotion', () => {
      const content = 'She swung through the ball with total certainty.\n\n```typescript\nconst pointResult = {\n  velocity: 100,\n  hesitation: false\n};\n```\n\nThe ball landed inside.';
      const res = validateZeroAISlopEngineBlockers({
        title: 'Fifty-Four Minutes on Court',
        content,
        category: 'Essays',
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'METAPHOR_AS_CODE_FAIL')).toBe(true);
    });
  });

  describe('Full Integration Test on Original Rejected Draft vs Calibrated Rewrite', () => {
    const originalDraftContent = `### Stock market today: Reflections on a Changing World

*By Priyanka Mishra (@priyanka_mishra)*

There are moments when a single event or cultural development serves as a lens through which the wider currents of our society become visible. The evolving discourse around **Stock market today** is precisely such a moment.

As recent reports from investopedia.com highlight (*"Markets News, Sept. 1, 2025: Stocks Sink to Begin September as Oil Prices, Treasury Yields Jump - investopedia.com"*), we are witnessing a fundamental shift in how public institutions, markets, and communities organize their priorities.

We often mistake velocity for progress. In our rush to quantify and react to daily developments, we risk losing the contemplative distance required to understand their second-order consequences. What does it mean for individuals when the rhythms of daily commerce and public life are re-engineered at such pace?

> "To observe the world with patience is to see patterns where others see only noise."

The real significance of Stock market today will not be measured by the headline cycle of a single afternoon, but by the quiet transformations it initiates in the habits, expectations, and relationships of ordinary people.`;

    it('reproduces ALL 6 blockers failing on the rejected draft', () => {
      const res = validateZeroAISlopHardGate({
        title: 'Stock market today: Reflections on a Changing World',
        summary: 'A timely editorial exploration of Stock market today, reflecting on recent real-world developments and cultural shifts.',
        content: originalDraftContent,
        category: 'Essays',
        persona: { penName: 'priyanka_mishra', fullName: 'Priyanka Mishra' },
        researchDossier: {
          topic: 'stock market today',
          newsReports: [
            { headline: 'Markets News, Sept. 1, 2025: Stocks Sink to Begin September as Oil Prices, Treasury Yields Jump - investopedia.com', source: 'investopedia.com' }
          ]
        },
        now: mockNow
      });

      expect(res.isValid).toBe(false);
      const ruleNames = res.violations.map(v => v.rule);
      expect(ruleNames).toContain('TRENDING_KEYWORD_AS_TITLE_FAIL');
      expect(ruleNames).toContain('TOPIC_SUBSTITUTION_FAIL');
      expect(ruleNames).toContain('CURRENT_TOPIC_STALE_SOURCE_FAIL');
      expect(ruleNames).toContain('ABSTRACT_CONCLUSION_WITHOUT_CAUSAL_BRIDGE_FAIL');
      expect(ruleNames).toContain('PERSONA_ERASURE_FAIL');
      expect(ruleNames).toContain('GENERIC_APHORISM_FAIL');
    });

    it('passes cleanly with zero violations on the rewritten "The Number That Changes Before Lunch"', () => {
      const rewrittenContent = `### The Number That Changes Before Lunch

At 1:15 in the afternoon, the dining table in our house in Assi belongs to two objects: a stainless steel thali holding yellow dal and two phulkas, and a six-year-old Android phone propped against a brass water tumbler.

My father sits with his bifocals slid halfway down his nose. The ceiling fan overhead makes a dry click on every fourth rotation. He has not touched the bread. His right index finger swipes down on the glass screen, waits two seconds for the cellular network to negotiate with the server in Mumbai, and then stays resting on the corner of the table, curled like a dried leaf.

"Nine hundred points," he says.

He does not say *Sensex*. He does not name a company, a sector, or the price of crude oil per barrel in London. He simply names the number, the way an older doctor in a district hospital names a blood pressure reading when he suspects the patient has not been taking their salt restriction seriously.

The morning papers from Godowlia had arrived folded on the stone steps before dawn with headlines about overnight missile tests in the Levant and a jump in Brent crude. At eight in the morning, my father had walked down to the vegetable vendor by the temple wall, handed over forty rupees in soiled paper currency for a bundle of fresh methi and three cucumbers, and walked back up the lane without urgency. At that hour, the household was solvent, calm, and predictable.

Now, between the time the pressure cooker whistled on the stove and the time my mother put the bowl of curd on the table, the family ledger has apparently suffered a quiet catastrophe.

Yet nothing in the room has been sold. Nothing has been bought. My father retired from the state irrigation department seven years ago. His pension arrives by direct transfer on the first day of every month, regardless of what happens to the Nikkei 225 or the ten-year sovereign bond yield in New Delhi. The mutual fund units he was looking at on the screen were purchased in 2019, through a broker named Tiwari who works out of a narrow mezzanine office near the post office. When my father bought them, he announced to the family that these were long-term holdings. They were meant for medical emergencies in our seventies or for repairs to the courtyard cistern. He explicitly told Tiwari that he would not touch the capital for ten years.

Seven years remain on that clock.

Why, then, does a man who will not sell a single unit until 2033 allow a number registered at 1:14 PM to alter the temperature of his dining room?

The screen does not show what his savings are worth to him. It shows what an impatient institutional fund or an intraday desk in Bandra-Kurla would pay for them if he were forced to liquidate everything before the closing bell at 3:30 PM. But he is not forced to liquidate anything. No one is standing at the door with an eviction notice. The gas cylinder under the counter is full. The lentils were purchased in bulk last week.

Yet the modern market apparatus works by turning patient capital into neurotic surveillance. It gives an investor a twenty-year horizon and then hands them a device that updates every four seconds.

The digit glowing on the glass collapses the distance between a distant structural shift—crude shipping insurance through the Red Sea—and a man's digestion in Varanasi. He sees the red triangle on the index card not as liquidity clearance, but as a personal deduction. He sighs into his glass of water as though a stranger had reached through the window and picked forty thousand rupees out of the wooden almirah.

"Tiwari said it would steady itself by Thursday," my mother says from the kitchen doorway, wiping her hands on an apron.

My father does not answer. He pushes his glasses up with his thumb, locks the screen, and turns the phone face down on the oilcloth. For three seconds, the room feels slightly lighter, as if a third person who had been standing uninvited by the sideboard had quietly walked out.

He breaks a piece of the roti, dips it into the dal, and begins to eat. Outside, across the alley, the horn of an afternoon tourist boat rumbles up from the river, deep and vibrating in the brickwork. The market will close in two hours. By tomorrow morning, the numbers on the screen will shift again, up or down by some fraction that will neither buy him a new winter kurta nor deny him one. But for thirty minutes over lunch, the world had succeeded in convincing him that he was poor.`;

      const res = validateZeroAISlopHardGate({
        title: 'The Number That Changes Before Lunch',
        summary: 'In a quiet dining room in Varanasi, a retired father checks his mutual fund NAV after an oil shock—revealing how daily price ticks alter the temperature of a household that has nothing to sell.',
        content: rewrittenContent,
        category: 'Essays',
        persona: { penName: 'priyanka_mishra', fullName: 'Priyanka Mishra' },
        now: mockNow
      });

      expect(res.isValid).toBe(true);
      expect(res.violations).toHaveLength(0);

      const integrity = validateGeneratedArticleIntegrity({
        title: 'The Number That Changes Before Lunch',
        content: rewrittenContent,
        summary: 'In a quiet dining room in Varanasi, a retired father checks his mutual fund NAV after an oil shock.',
        category: 'Essays',
        persona: { penName: 'priyanka_mishra', fullName: 'Priyanka Mishra' }
      });

      expect(integrity.isValid).toBe(true);
      expect(integrity.reasons).toHaveLength(0);
    });

    it('passes cleanly with zero violations on Aarav\'s calibrated "The Geometry of Diminishing Returns"', () => {
      const aaravContent = `### The Cost of the Margin

Apple has finally put numbers against the iPhone 18 Pro. In India, the entry price is ₹164,900.

Beside it sits the newly announced iPhone Duo—a folding 7.6-inch inner display, titanium hinge, and an entry sticker of ₹299,900. Both devices run on the same three-nanometer foundation: the A20 Pro silicon, equipped with a second-generation vapor chamber, a variable-aperture main sensor, and a dedicated neural engine designed to run local intelligence without round-tripping to a server farm in Oregon.

As an engineer, I do not look at these devices as lifestyle totems or luxury statements. I look at them as thermal envelopes, memory budgets, and silicon real estate. And when I look at the numbers, the question is no longer whether Apple's hardware engineering is capable. It is whether our daily workloads have moved far enough to require it.

At what point does geometry itself become the product?

### The Engineering Ceiling

The engineering behind the A20 Pro is real. The variable-aperture lens is a genuine mechanical achievement in a chassis under eight millimeters thick, and the vapor chamber addresses an actual thermal throttling ceiling that mobile chips hit under sustained graphics loads. It is lazy to pretend that hardware innovation has simply stopped.

The harder, more uncomfortable question is what percentage of our daily computing was waiting for that headroom.

In systems architecture, I evaluate optimization through a simple filter: does a change alter something the user can actually feel, or does it merely register on a synthetic benchmark graph? When moving from spinning disks to solid-state storage, every developer felt the floor move beneath their feet. Compilation times halved; local database queries stopped thrashing the heads; boot cycles became instantaneous. That was a structural leap.

Going from an A17 Pro to an A20 Pro does not move the floor. Your messaging payloads do not arrive faster. The local SQLite store on a banking app does not read your transactions with greater moral clarity. For ninety-eight percent of what humans do with handheld computers, the silicon has outrun the task by half a decade.

When you have perfected the flat glass rectangle, you have only two levers left to justify a replacement cycle: you can inflate the price, or you can bend the glass. At ₹299,900, the iPhone Duo is an extraordinary exercise in hinge tolerances and flexible OLED layering. But folding a screen in half does not solve a computational problem. It solves an inventory and renewal problem for a hardware industry that has already answered every practical demand we had of it.

### The Developer's Moral Hazard

The real casualty of continuous silicon acceleration is not the buyer's wallet; it is software discipline.

When every flagship phone carries sixteen gigabytes of unified memory and neural execution units capable of billions of operations per second, engineering teams begin to treat client hardware as an infinite dumping ground. We ship thirty-megabyte single-page application bundles to render a static blog post. We introduce recursive client-side hydration for forms that could have been handled by twenty lines of vanilla markup. We run analytics collectors that ping seven third-party telemetry endpoints on every scroll event, confident that the user's processor will absorb the thermal cost before the frame rate drops noticeably.

We use Apple's billions of dollars in silicon research to excuse our own laziness.

Faster hardware should increase the performance budget we return to users, not the waste we are allowed to hide. When a platform gives you a faster engine, your responsibility is to let the user's battery last thirty-six hours, not to consume the surplus with an extra layer of abstraction.

### The Test Device on the Desk

On the corner of my worktable sits a four-year-old test phone with scuffed aluminum edges and a battery that has seen eleven hundred cycles.

When we deploy a new build at work, that is the device I reach for first. I don't test on the latest titanium flagship plugged into a high-wattage charger. I test on the phone that is warm in the hand, connected to an unstable cellular network in a moving cab, running low on background memory.

If the interface stutters there, if the feed drops frames or the keyboard takes four hundred milliseconds to open, the software is broken. I do not shrug and assume the user will upgrade to an A20 Pro in Diwali. I fix the query, trim the bundle, and strip the decorative dependency.

Good technology has a quiet dignity: it does its work with economy and leaves the user's attention alone. If your architecture relies on the customer spending ₹164,900 just to keep your interface smooth, you are not building systems. You are hiding behind someone else's foundry.

My test phone stays on the desk. If the page feels slow there, I fix the page. I do not wait for the user's next processor to forgive me.`;

      const res = validateZeroAISlopHardGate({
        title: 'The Geometry of Diminishing Returns',
        summary: 'With the iPhone 18 Pro at ₹164,900 and iPhone Duo at ₹299,900, faster hardware should increase the performance budget we return to users, not the software bloat we are allowed to hide.',
        content: aaravContent,
        category: 'Tech',
        persona: { penName: 'aarav_tech', fullName: 'Aarav Mehta' },
        now: mockNow
      });

      expect(res.isValid).toBe(true);
      expect(res.violations).toHaveLength(0);

      const integrity = validateGeneratedArticleIntegrity({
        title: 'The Geometry of Diminishing Returns',
        content: aaravContent,
        summary: 'With the iPhone 18 Pro at ₹164,900 and iPhone Duo at ₹299,900, faster hardware should increase the performance budget we return to users, not the software bloat we are allowed to hide.',
        category: 'Tech',
        persona: { penName: 'aarav_tech', fullName: 'Aarav Mehta' }
      });

      expect(integrity.isValid).toBe(true);
      expect(integrity.reasons).toHaveLength(0);
    });
  });

  describe('4. BROKEN_SENTENCE_FAIL', () => {
    it('flags drafts starting mid-sentence with dependent clause fragments', () => {
      const content = '### Some Title\n\n through which the wider currents of our society become visible. This is a moment.';
      const res = validateZeroAISlopEngineBlockers({
        title: 'Some Title',
        content,
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'BROKEN_SENTENCE_FAIL')).toBe(true);
    });

    it('flags malformed grammatical word salad', () => {
      const content = '### Some Title\n\nIn this essay we are witnessing a their priorities across all sectors.';
      const res = validateZeroAISlopEngineBlockers({
        title: 'Some Title',
        content,
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'BROKEN_SENTENCE_FAIL')).toBe(true);
    });
  });

  describe('5. SCRAPED_DEFINITION_FAIL', () => {
    it('flags scraped encyclopedia / search snippet definitions in prose', () => {
      const content = 'Historically understood as the national association for stock car auto racing, llc (nascar) is an american auto racing sanctioning and operating company that is best known for stock car racing.';
      const res = validateZeroAISlopEngineBlockers({
        title: 'Racing Reflections',
        content,
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'SCRAPED_DEFINITION_FAIL')).toBe(true);
    });
  });

  describe('6. TRUNCATED_SOURCE_FAIL', () => {
    it('flags clipped/ellipsized search engine stems like "it is conside..."', () => {
      const content = 'In modern racing it is conside..., the modern reality is far more layered.';
      const res = validateZeroAISlopEngineBlockers({
        title: 'Racing Realities',
        content,
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'TRUNCATED_SOURCE_FAIL')).toBe(true);
    });
  });

  describe('7. EMPTY_QUOTE_FAIL', () => {
    it('flags blockquotes containing only single dots or punctuation', () => {
      const content = '### An Essay\n\nSome paragraph text here.\n\n> "."\n\nAnother paragraph follows.';
      const res = validateZeroAISlopEngineBlockers({
        title: 'An Essay',
        content,
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'EMPTY_QUOTE_FAIL')).toBe(true);
    });
  });

  describe('8. GENERIC_REFLECTION_TEMPLATE_FAIL', () => {
    it('flags multiple stock reflection template boilerplates', () => {
      const content = 'This is a moment through which the wider currents of our society become visible. We often mistake velocity for progress. In our rush to quantify and react to daily developments, we risk losing the contemplative distance required to understand their second-order consequences.';
      const res = validateZeroAISlopEngineBlockers({
        title: 'Modern Velocity',
        content,
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'GENERIC_REFLECTION_TEMPLATE_FAIL')).toBe(true);
    });
  });

  describe('9. PERSONA_ABSENCE_FAIL', () => {
    it('flags Radhika Gowda pieces that have zero Mysore/accounting/domestic anchors', () => {
      const content = 'We examine the nature of professional sport and modern entertainment spectacles across stadiums in North America.';
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Spectacle',
        content,
        persona: { penName: 'radhika_gowda', fullName: 'Radhika Gowda' },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'PERSONA_ABSENCE_FAIL')).toBe(true);
    });
  });

  describe('10. Comprehensive Broken NASCAR Generation Reproduction', () => {
    it('catches multiple simultaneous red-alert blockers on the rejected NASCAR draft', () => {
      const brokenNascarDraft = `### Nascar: Reflections on a Changing World

*By Radhika Gowda (@radhika_gowda)*

 through which the wider currents of our society become visible.  **Nascar** is precisely such a moment.

As recent reports from Bleacher Report highlight (*"NASCAR Announces 'Swear Jar' Promotion, Fan Will Win Prize Money Based on NSFW Driver Radio Messages - Bleacher Report"*), we are witnessing a  their priorities.

Historically understood as the national association for stock car auto racing, llc (nascar) is an american auto racing sanctioning and operating company that is best known for stock car racing. it is conside..., the modern reality is far more layered.

We often mistake velocity for progress. In our rush to quantify and react to daily developments, we risk losing the contemplative distance required to understand their second-order consequences. What does it mean for individuals when the rhythms of daily commerce and public life are re-engineered at such pace?

> "."

The real significance of Nascar will not be measured by the headline cycle of a single afternoon, but by the quiet transformations it initiates in the habits, expectations, and relationships of ordinary people.`;

      const res = validateZeroAISlopEngineBlockers({
        title: 'Nascar: Reflections on a Changing World',
        summary: 'A timely editorial exploration of Nascar, reflecting on recent real-world developments and cultural shifts.',
        content: brokenNascarDraft,
        category: 'Essays',
        persona: { penName: 'radhika_gowda', fullName: 'Radhika Gowda' },
        now: mockNow
      });

      expect(res.isValid).toBe(false);
      const rulesViolated = res.violations.map(v => v.rule);

      expect(rulesViolated).toContain('TRENDING_KEYWORD_AS_TITLE_FAIL');
      expect(rulesViolated).toContain('TOPIC_SUBSTITUTION_FAIL');
      expect(rulesViolated).toContain('BROKEN_SENTENCE_FAIL');
      expect(rulesViolated).toContain('SCRAPED_DEFINITION_FAIL');
      expect(rulesViolated).toContain('TRUNCATED_SOURCE_FAIL');
      expect(rulesViolated).toContain('EMPTY_QUOTE_FAIL');
      expect(rulesViolated).toContain('GENERIC_REFLECTION_TEMPLATE_FAIL');
      expect(rulesViolated).toContain('PERSONA_ABSENCE_FAIL');
    });

    it('passes cleanly with zero violations on the rewritten "The Five-Dollar Swear" by Radhika Gowda', () => {
      const rewrittenEssay = `### The Five-Dollar Swear

The pit wall at Bristol or Daytona is six thousand miles from my desk in Mysore, but the invoice arrives in the same currency: the monetization of human friction.

In September 2026, NASCAR introduced what its marketing team cheerfully christened the "Swear Jar." The premise is an exercise in contemporary brand gamification. Every time a driver, pinned inside a steel chassis at two hundred miles an hour with cabin temperatures pushing one hundred and twenty degrees, keys their steering-wheel microphone and lets fly an expletive, five dollars is deposited into a prize pool. Fans log into an app to forecast the weekend's total verbal tally; the closest guess takes the cash. By mid-September, the count had cleared four hundred and fifty expletives, and the pot was north of twenty-three hundred dollars.

On the surface, it is pitched as good-humoured spectacle—a cheeky nod to the raw, blue-collar heritage of stock car racing. But the commercial transaction underneath is far more cold-blooded: it is the total absorption of the unscripted human into the entertainment product.

For decades, the driver radio occupied an uneasy, ambiguous territory in motorsport. It was technically broadcast on public scanners, but it felt private. It was the functional nervous system of a race team: tire temperatures barked between spotter and crew chief, desperate complaints about a loose right-rear fender, the profane panic of a car spinning across four lanes of traffic. If a driver swore, it was an involuntary reflex of pure biological survival. It was the crack in the corporate armor—the moment the sponsor logos on the firesuit failed to sanitize the fact that a frightened, furious human being was wrestling two tons of metal on the edge of adhesion.

The radio was compelling precisely because it was not meant for us. We were eavesdroppers on panic.

What the "Swear Jar" does is invert that relationship. The moment you place a five-dollar bounty on an obscenity, you turn an involuntary spasm of stress into an engagement metric. Frustration becomes inventory. The spotter-to-driver frequency is no longer a tactical utility; it is a live content feed engineered to keep viewers refreshing a sponsor-branded ledger between commercial breaks.

In my work auditing small commercial accounts in Karnataka, I watch a milder version of this packaging happen every quarter. A small textile workshop or an independent fabrication unit prides itself on "transparency." They set up glass-walled production floors, install live telemetry dashboards for clients, and put cameras over the packing tables. They tell their workers that openness builds trust.

What it actually builds is fatigue. The worker quickly learns that their natural gestures—the brief slump against the counter, the exasperated sigh when a thread snaps, the whispered dispute over overtime—have ceased to be private reactions to labor. They have become performance material for someone else's surveillance. When even your frustration is on display, you are never off the clock.

If a driver knows their profanity is being tallied on a digital leaderboard for prize money, the radio communication undergoes a quiet corruption. Does an angry driver swear out of instinctive adrenaline, or do they lean into the microphone because colorful outrage drives personal brand engagement on Monday morning? Once you put a price tag on authenticity, you guarantee its performance.

Spectacle has a voracious appetite. It begins by monetizing the race, moves to monetizing the athlete's body, and ends by monetizing their cortisol. When anger becomes a sweepstakes, sport stops being an arena of athletic contest and becomes a reality television soundstage on wheels.

On the table beside my ledger sits a small brass coin bowl where my grandmother used to drop loose change from the Devaraja vegetable market. It had no rules, no app, and no lottery attached. If you dropped an eight-anna coin into it, the metal made a quiet, dull clink and stayed there until someone needed bus fare.

NASCAR's jar makes a different sound altogether: the electric hum of a brand that has figured out how to extract five dollars every time a human being loses their temper under pressure.`;

      const res = validateZeroAISlopEngineBlockers({
        title: 'The Five-Dollar Swear',
        summary: 'When NASCAR monetizes driver-radio profanity into a fan sweepstakes, unscripted human stress ceases to be a reflex and becomes packaged inventory.',
        content: rewrittenEssay,
        category: 'Essays',
        persona: { penName: 'radhika_gowda', fullName: 'Radhika Gowda' },
        now: mockNow
      });

      expect(res.isValid).toBe(true);
      expect(res.violations).toHaveLength(0);

      const integrity = validateGeneratedArticleIntegrity({
        title: 'The Five-Dollar Swear',
        content: rewrittenEssay,
        summary: 'When NASCAR monetizes driver-radio profanity into a fan sweepstakes, unscripted human stress ceases to be a reflex and becomes packaged inventory.',
        category: 'Essays',
        persona: { penName: 'radhika_gowda', fullName: 'Radhika Gowda' }
      });

      expect(integrity.isValid).toBe(true);
      expect(integrity.reasons).toHaveLength(0);
    });
  });

  describe('15. PRECISE_TECH_DETAIL_WITHOUT_SOURCE_FAIL', () => {
    it('flags unverified synthetic shortwave frequencies with decimal precision', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'Voices in the Dark',
        content: 'At 9.730 MHz on the thirty-one-meter band, a voice cuts through the atmospheric flutter.',
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' },
        researchDossier: null,
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'PRECISE_TECH_DETAIL_WITHOUT_SOURCE_FAIL')).toBe(true);
      expect(res.violations.find(v => v.rule === 'PRECISE_TECH_DETAIL_WITHOUT_SOURCE_FAIL').description).toContain('9.730 MHz');
    });

    it('flags fabricated athletic speeds without verification in research dossier', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Line at Wimbledon',
        content: 'He bent his knees, tossed the ball, and hit a 118 mph serve directly down the T.',
        category: 'Essays',
        persona: { penName: 'arsh_zee', fullName: 'Arshdeep Singh' },
        researchDossier: null,
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'PRECISE_TECH_DETAIL_WITHOUT_SOURCE_FAIL')).toBe(true);
    });

    it('passes when specific metric is explicitly corroborated in research dossier', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'Signals from Tehran',
        content: 'The receiver was locked to 9.730 MHz, picking up the evening broadcast.',
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' },
        researchDossier: { topic: 'shortwave monitoring', confirmed_frequency: '9.730 MHz' },
        now: mockNow
      });
      expect(res.isValid).toBe(true);
      expect(res.violations.some(v => v.rule === 'PRECISE_TECH_DETAIL_WITHOUT_SOURCE_FAIL')).toBe(false);
    });

    it('passes calibrated text using band descriptors instead of synthetic frequencies', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Frequency Log at Esplanade',
        content: 'Near the lower edge of the thirty-one-meter band, a voice in Farsi cuts through the atmospheric flutter.',
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' },
        researchDossier: null,
        now: mockNow
      });
      expect(res.isValid).toBe(true);
      expect(res.violations.some(v => v.rule === 'PRECISE_TECH_DETAIL_WITHOUT_SOURCE_FAIL')).toBe(false);
    });
  });

  describe('16. UNEARNED_TITLE_OCCUPATION_FAIL', () => {
    it('flags titles that name an occupation never mentioned in the content', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Projectionist at the End of the World',
        content: 'I sit in my room looking at the street and drinking cold water. The evening light dims.',
        category: 'Essays',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'UNEARNED_TITLE_OCCUPATION_FAIL')).toBe(true);
    });

    it('passes when title matches actual occupation or character role in text', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Projectionist at the Metro',
        content: 'The old projectionist threaded the 35mm acetate through the sprockets with calloused fingers.',
        category: 'Essays',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' },
        now: mockNow
      });
      expect(res.isValid).toBe(true);
      expect(res.violations.some(v => v.rule === 'UNEARNED_TITLE_OCCUPATION_FAIL')).toBe(false);
    });
  });

  describe('17. FABRICATED_SOURCE_DETAIL_FAIL', () => {
    it('flags fabricated atmospheric reporting attributed to news outlets', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'An Evening in Hollywood',
        content: 'People.com reports that the night was full of soft light and velvet fabrics.',
        category: 'Essays',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'FABRICATED_SOURCE_DETAIL_FAIL')).toBe(true);
    });

    it('flags misattributed headlines calling family crown jewels', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'An Evening in Hollywood',
        content: 'The headlines call it a "crown jewel" of the awards circuit.',
        category: 'Essays',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'FABRICATED_SOURCE_DETAIL_FAIL')).toBe(true);
    });
  });

  describe('18. PLANNER_TEXT_LEAK_FAIL', () => {
    it('flags drafts where internal planning descriptions leak into the title or content', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Living Heritage of An exploration of failure, patience, and recovery within the realm of culture.',
        content: 'The living conversation surrounding An exploration of failure, patience, and recovery within the realm of culture. connects directly to this.',
        category: 'Culture',
        persona: { penName: 'meera_varma', fullName: 'Meera Varma' },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'PLANNER_TEXT_LEAK_FAIL')).toBe(true);
    });
  });

  describe('19. TITLE_NATURALNESS_CHECK', () => {
    it('rejects titles that contain meta-prompt fragments or excessive length', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Living Heritage of An exploration of failure, patience, and recovery within the realm of culture.',
        content: 'A thoughtful essay on how local drama survives in Madras.',
        category: 'Culture',
        persona: { penName: 'meera_varma', fullName: 'Meera Varma' },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'TITLE_NATURALNESS_CHECK')).toBe(true);
    });

    it('passes concise, natural literary publication titles', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'When Streaming Memory Enters the Cinema Hall',
        content: 'The screen at the single-screen theatre in Gorakhpur flickers.',
        category: 'Culture',
        persona: { penName: 'meera_varma', fullName: 'Meera Varma' },
        now: mockNow
      });
      expect(res.isValid).toBe(true);
      expect(res.violations.some(v => v.rule === 'TITLE_NATURALNESS_CHECK')).toBe(false);
    });
  });

  describe('20. UNATTRIBUTED_APHORISM_FAIL', () => {
    it('flags canned quote-card aphorisms without historical or character attribution', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'When Streaming Memory Enters the Cinema Hall',
        content: 'The morning crowds gather outside the box office.\n\n> "Culture is what remains when everything ephemeral has been forgotten."\n\nInside, the curtains part.',
        category: 'Culture',
        persona: { penName: 'meera_varma', fullName: 'Meera Varma' },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'UNATTRIBUTED_APHORISM_FAIL')).toBe(true);
    });
  });

  describe('21. ABSTRACT_CULTURE_WITHOUT_OBJECT_FAIL', () => {
    it('flags culture articles that pile up abstract cultural tokens without concrete objects or scenes', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'A Reflection on Our Shared Roots',
        content: 'Our shared heritage represents an unbroken tradition and cultural continuum. When modern craft meets vernacular identity, the homogenization of modern life fades away, leaving the ephemeral beauty of our common heritage intact across our tradition.',
        category: 'Culture',
        persona: { penName: 'meera_varma', fullName: 'Meera Varma' },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'ABSTRACT_CULTURE_WITHOUT_OBJECT_FAIL')).toBe(true);
    });
  });

  describe('22. FIRST_PERSON_WITNESS_CLAIM_FAIL', () => {
    it('flags invented first-person eyewitness reportage and scene descriptions in non-fiction culture commentary', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'When Streaming Memory Enters the Cinema Hall',
        content: 'The projector lamp at the single-screen theatre in Gorakhpur hums for five minutes before the beam touches the white curtain. In the balcony rows, two hundred men are waiting for a character they already watched bleed to death.',
        category: 'Culture',
        persona: { penName: 'meera_varma', fullName: 'Meera Varma' },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'FIRST_PERSON_WITNESS_CLAIM_FAIL')).toBe(true);
    });
  });

  describe('23. UNVERIFIED_INDUSTRY_FIRST_FAIL', () => {
    it('flags unverified sweeping historical claims of an industry-wide first', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'When Streaming Memory Enters the Cinema Hall',
        content: 'The release on September 4 marks the first time an Indian streaming franchise has been turned backward into cinemas.',
        category: 'Culture',
        persona: { penName: 'meera_varma', fullName: 'Meera Varma' },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'UNVERIFIED_INDUSTRY_FIRST_FAIL')).toBe(true);
    });
  });

  describe('24. FICTIONAL_PRECISION_FAIL', () => {
    it('flags synthetic technical precision metrics in cultural non-fiction commentary', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'When Streaming Memory Enters the Cinema Hall',
        content: 'The sound is amplified through fifty-kilowatt surround horns until the acoustic vibration rattles the concrete floor.',
        category: 'Culture',
        persona: { penName: 'meera_varma', fullName: 'Meera Varma' },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'FICTIONAL_PRECISION_FAIL')).toBe(true);
    });
  });

  describe('25. RESULT_CONTRADICTS_PREMISE_FAIL', () => {
    it('flags drafts where thesis claims predictable march when research dossier confirms a five-set marathon', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'Four Hours Inside a Foregone Conclusion',
        content: 'This match represents a predictable march toward the third round for the higher-seeded German.',
        category: 'Essays',
        persona: { penName: 'sunita_banerjee', fullName: 'Dr. Sunita Banerjee' },
        researchDossier: {
          topic: 'Zverev vs Halys',
          newsReports: [{ headline: 'Zverev survives five-set marathon against Halys at 2 a.m.' }]
        },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'RESULT_CONTRADICTS_PREMISE_FAIL')).toBe(true);
    });
  });

  describe('26. SPORT_STYLE_GENERALIZATION_FAIL', () => {
    it('flags sweeping claims of sport-wide decline based on a single match', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'Four Hours Inside a Foregone Conclusion',
        content: 'The modern game has discarded the slow, loitering slice, the delicate drop shot. Rallies end only when someone’s lung capacity fails.',
        category: 'Essays',
        persona: { penName: 'sunita_banerjee', fullName: 'Dr. Sunita Banerjee' },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'SPORT_STYLE_GENERALIZATION_FAIL')).toBe(true);
    });
  });

  describe('27. TITLE_OBJECT_CONTRACT_FAIL', () => {
    it('flags titles promising two material objects when one is completely missing from the text', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Metronome and the Clay',
        content: 'The metronome clicks on the side table. The players move across the blue acrylic hard court.',
        category: 'Essays',
        persona: { penName: 'sunita_banerjee', fullName: 'Dr. Sunita Banerjee' },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'TITLE_OBJECT_CONTRACT_FAIL')).toBe(true);
    });
  });

  describe('28. PERSONA_LENS_CONTAMINATION_FAIL', () => {
    it('flags Sunita Banerjee borrowing Aarav Mehta systems engineering vocabulary for metaphor convenience', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Measurement of Resistance',
        content: 'Aarav and I once debated this over tea. He spoke of cache invalidation and distributed systems.',
        category: 'Essays',
        persona: { penName: 'sunita_banerjee', fullName: 'Dr. Sunita Banerjee' },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'PERSONA_LENS_CONTAMINATION_FAIL')).toBe(true);
    });
  });

  describe('29. SELF_REFERENCE_COOLDOWN', () => {
    it('flags artificial references to earlier bot essays', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Measurement of Resistance',
        content: 'In my earlier essay, "The Graded Response", I wrote about how Delhi measures its days.',
        category: 'Essays',
        persona: { penName: 'sunita_banerjee', fullName: 'Dr. Sunita Banerjee' },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'SELF_REFERENCE_COOLDOWN')).toBe(true);
    });
  });

  describe('30. UNSOURCED_SCENE_PRECISION_FAIL', () => {
    it('catches manufactured courtside eyewitness details without telemetry or source', () => {
      const content = 'At 2:15 a.m., when the ball boys on Grandstand were shaking the cramps out of their calves and the remaining seventy people in the lower bowl had stopped drinking beer and started drinking water out of necessity, Quentin Halys missed a backhand down the line by four inches.';
      const res = validateZeroAISlopEngineBlockers({
        title: 'Late Night Resistance',
        content,
        category: 'Essays',
        persona: { penName: 'sunita_banerjee', fullName: 'Dr. Sunita Banerjee' },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'UNSOURCED_SCENE_PRECISION_FAIL')).toBe(true);
    });
  });

  describe('31. EVENT_BINDING_FAIL', () => {
    it('catches Grandstand vs Arthur Ashe Stadium venue mismatch for Zverev vs Halys', () => {
      const content = 'The match between Zverev and Halys was played on Grandstand under the lights.';
      const res = validateZeroAISlopEngineBlockers({
        title: 'Four Hours',
        content,
        category: 'Essays',
        persona: { penName: 'sunita_banerjee', fullName: 'Dr. Sunita Banerjee' },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'EVENT_BINDING_FAIL')).toBe(true);
    });
  });

  describe('32. PERSONA_METAPHOR_CONTAMINATION_FAIL & 33. SIMILE_COMPLEXITY_FAIL', () => {
    it('flags cylinder head and mechanical torque metaphors when used by Sunita Banerjee', () => {
      const content = 'Alexander Zverev walked toward the net with the heavy, unhurried gait of an engineer who has spent forty-five minutes re-torquing a cylinder head that should never have vibrated loose in the first place.';
      const res = validateZeroAISlopEngineBlockers({
        title: 'Four Hours',
        content,
        category: 'Essays',
        persona: { penName: 'sunita_banerjee', fullName: 'Dr. Sunita Banerjee' },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'PERSONA_METAPHOR_CONTAMINATION_FAIL')).toBe(true);
      expect(res.violations.some(v => v.rule === 'SIMILE_COMPLEXITY_FAIL')).toBe(true);
    });
  });

  describe('34. ANALOGY_FUNCTION_MISMATCH_FAIL, 35. SYMBOLIC_ENDING_TOO_NEAT_FAIL, 36. SPORTS_SEED_BINDING_FAIL', () => {
    it('flags mismatched analogy comparing seed to a provisional grade on a paper', () => {
      const content = 'In the margin of an essay, I penciled a provisional grade: B-plus. It was an administrative prediction. A tournament seeding tells you where an athlete finishes.';
      const res = validateZeroAISlopEngineBlockers({
        title: 'Four Hours',
        content,
        category: 'Essays',
        persona: { penName: 'sunita_banerjee', fullName: 'Dr. Sunita Banerjee' },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'ANALOGY_FUNCTION_MISMATCH_FAIL')).toBe(true);
    });

    it('flags overly neat symbolic endings where the narrator draws a line through a grade', () => {
      const content = 'I pick up my fountain pen, unthread the cap, and draw a single blue line through the provisional grade on the student paper.';
      const res = validateZeroAISlopEngineBlockers({
        title: 'Four Hours',
        content,
        category: 'Essays',
        persona: { penName: 'sunita_banerjee', fullName: 'Dr. Sunita Banerjee' },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'SYMBOLIC_ENDING_TOO_NEAT_FAIL')).toBe(true);
    });

    it('flags sports fact binding error when Zverev is claimed to be seeded third', () => {
      const content = 'Alexander Zverev, seeded third, defeated Quentin Halys in five sets.';
      const res = validateZeroAISlopEngineBlockers({
        title: 'Four Hours',
        content,
        category: 'Essays',
        persona: { penName: 'sunita_banerjee', fullName: 'Dr. Sunita Banerjee' },
        now: mockNow
      });
      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'SPORTS_SEED_BINDING_FAIL')).toBe(true);
    });
  });

  describe('37–41. Legal Sensitivity & Real Tragedy Guardrails (Lindsay Clancy Case)', () => {
    const rawClancyDraft = `The radiator clanked twice.
Preet did not look up from his blue-tinted screen.
On the pine desk, a half-peeled orange was turning dry at the edges. It smelled of cheap citrus and damp wood.
"Mistrial," Preet said. His voice was flat.
I poured black tea into two mismatched ceramic mugs. We were in a drafty attic bedroom, watching the trial of Lindsay Clancy.
"The judge just declared it," Preet added. "Reddington is going for an emergency stay."
Preet reached for a printout on the floor. It was an opinion piece from the Wall Street Journal. The headline stared up at us: Lindsay Clancy Isn't an Everywoman.
"Nobody wants to look at the quiet, empty space where a mind simply breaks," Preet said.
"Reddington will argue the medical state," I said.`;

    it('flags all 5 blockers (Rules 37–41) on the fictionalized Lindsay Clancy draft', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Long Shot of a Stay',
        content: rawClancyDraft,
        category: 'Short Stories',
        persona: { penName: 'arsh_zee', fullName: 'Arshdeep Singh' },
        now: mockNow
      });

      expect(res.isValid).toBe(false);
      const ruleNames = res.violations.map(v => v.rule);
      expect(ruleNames).toContain('REAL_TRAGEDY_FICTIONALIZATION_FAIL');
      expect(ruleNames).toContain('ONGOING_LEGAL_STATUS_SYNC_FAIL');
      expect(ruleNames).toContain('LEGAL_ARGUMENT_BINDING_FAIL');
      expect(ruleNames).toContain('CONTESTED_MENTAL_STATE_SIMPLIFICATION_FAIL');
      expect(ruleNames).toContain('SOURCE_AS_PROP_FAIL');
    });
  });

  describe('42–46. Sensory Drift, Local Precision & Poetry Architecture (Southern Avenue Draft)', () => {
    const rawSouthernAvenueDraft = `### Morning on Southern Avenue

Steam rises from the steel tumbler on the balcony ledge, smelling of crushed cardamom and boiled milk. Below, the fresh blue-and-white guardrails along the avenue glisten under a sudden three-o'clock cloudburst. A salt-stained party banner flaps against an electrical pole while the route 205 bus sprays brown water onto the kerb.

The boy covers the brass kettle.
The color of salt-pans, or salt-air.
It hits the salt-crusted tin roof of the flower shop.
In the window of the s-12 minibus, a clerk rests his temple against the pane.
The rain smells of soot and wet mortar.
An old city taking its time.

### Notes from the Balcony
The municipal painting drive began four years ago across South Kolkata.`;

    it('flags all 5 blockers (Rules 42–46) on the flawed Southern Avenue poem', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'Morning on Southern Avenue',
        content: rawSouthernAvenueDraft,
        category: 'Poetry',
        persona: { penName: 'ananya_deshmukh', fullName: 'Ananya Deshmukh' },
        now: mockNow
      });

      expect(res.isValid).toBe(false);
      const ruleNames = res.violations.map(v => v.rule);
      expect(ruleNames).toContain('SCENE_TEMPORAL_CONSISTENCY_FAIL');
      expect(ruleNames).toContain('LOCAL_GEOGRAPHY_PRECISION_FAIL');
      expect(ruleNames).toContain('ENVIRONMENTAL_MOTIF_DRIFT_FAIL');
      expect(ruleNames).toContain('POETRY_OVEREXPLANATION_FAIL');
      expect(ruleNames).toContain('AUTHENTICITY_TOKEN_COOLDOWN_FAIL');
    });
  });

  describe('Full Calibrated Rewrite Verification: "When Streaming Memory Enters the Cinema Hall"', () => {
    it('passes cleanly with zero violations on the rewritten calibrated essay', () => {
      const calibratedContent = `When the creators of *Mirzapur* announced a theatrical film set between episodes six and seven of the first season, they described the transition as a deliberate wager on community viewing. Over three seasons, the fiction had lived on personal screens—propped on pillows, carried through commutes on local trains, paused at will, or replayed alone in fragments. Moving that world onto a fifty-foot cinema screen was framed not merely as an expansion, but as a test of whether an audience that built an intimate relationship with a streaming series would gather in the dark to watch it together.

The initial commercial outcome answered that practical question directly: the film recorded a ₹132 crore worldwide opening weekend, establishing that streaming familiarity could indeed be converted into box-office footfall. But the creative problem underpinning the production remains far more delicate than the revenue figures suggest.

The film is structured as an untold chapter set inside the timeline of the 2018 debut season. That temporal placement allows the production to resurrect Munna Tripathi, played by Divyendu Sharma, alongside Pankaj Tripathi's Akhandanand and Ali Fazal's Guddu Pandit. Commercially, the maneuver carries an obvious advantage: it restores widely celebrated characters to the screen without untangling the narrative knots of subsequent seasons. Yet the director, Gurmmeet Singh, acknowledged the choice as a significant gamble, precisely because the audience enters the cinema hall carrying complete foreknowledge of where these trajectories lead.

In classical dramatic tradition, foreknowledge intensifies dread. When an audience watches Oedipus inquire into the murder of Laius, or Karna prepare his chariot, the tension springs from knowing the catastrophe is already sealed. The drama derives its force from watching a protagonist advance toward an outcome the viewer cannot alter.

In modern franchise cinema, however, foreknowledge operates in reverse. It does not heighten tragic dread; it deepens audience affection. Viewers who bought tickets to *Mirzapur: The Movie* did not sit in the dark dreading Munna's fate because they already watched what waits for him in the Season 2 finale. Instead, their familiarity functions as an invitation to complicity. They watch him handle a country-made pistol, strut through provincial corridors, and issue reckless ultimatums with the particular pleasure of seeing a favourite performance re-enacted within safe temporal boundaries. The story does not have to surprise them with mortality; it only has to satisfy their recollection of an attitude.

Streaming allowed *Mirzapur* to become an unusually private possession: paused, skipped, replayed, watched alone or in fragments. The coarse idiom of Purvanchal—the dry courtesies, the unhurried cadences of regional dominance, the abrupt domestic violence—became digital currency, clipped into short video fragments and shared across messaging apps. In a cinema hall, that private vocabulary is amplified through a theatre sound system and projected across a packed auditorium. The experience shifts from solitary consumption to collective ritual, where the audience anticipates punchlines and catches familiar cadences before the actors finish delivering them.

The transition from phone screen to cinema hall proves that streaming loyalty can fill auditoriums. But it also reveals how franchise nostalgia works: it offers viewers the comfort of a world whose endings have already been settled, inviting them to pay for the privilege of remembering what they once watched alone.`;

      const res = validateZeroAISlopEngineBlockers({
        title: 'When Streaming Memory Enters the Cinema Hall',
        content: calibratedContent,
        category: 'Culture',
        persona: { penName: 'meera_varma', fullName: 'Meera Varma' },
        now: mockNow
      });

      expect(res.isValid).toBe(true);
      expect(res.violations).toHaveLength(0);
    });
  });
  describe('Rules 47–52: Disaster Fiction Boundary, Tragedy Stacking, Causal Equivalence & Ending Restraint', () => {
    const rawWetConcreteDraft = `### The River’s Ledger

The water line on the kitchen wall has dried into a jagged, salt-crusted map. It stops exactly at the height of my father’s shoulder. He stands there, staring at the stain, holding a plastic cup of lukewarm tea. The condensation drips onto his knuckles.

Down in the valley, the news reports are still cycling through the same footage. The BBC says the hydropower plants, those massive concrete lungs we built to breathe wealth into the hills, are choked with silt and debris. They bet everything on the current, and the current decided to stop playing along. My father doesn't watch the TV. He watches the ceiling fan, waiting for it to wobble into a rhythm that makes sense.

Outside, the smell of damp earth is heavy. I walk out to the porch, my slippers caked in dried gray mud that flakes off like dead skin. The road is gone. Not just washed away, but erased, replaced by a slurry of gravel and uprooted pine. A neighbor is trying to salvage a rusted bicycle frame from the muck. He pulls, the metal groans, and he stops. He just leaves it there, halfway out of the ground.

### The Logic of Loss

We spent years talking about the transition. We traded the quiet, slow harvest for the fast, humming voltage. My father believed it. He invested his pension in the local co-op, convinced that the turbines would spin long after he stopped. Now, he scrapes the mud off his boots with a rusted butter knife.

I think about the headlines coming out of the West, the reports from the news about a wedding in Iran that turned into a crater. It feels distant, yet the geometry of the tragedy is identical. A sudden, violent redistribution of space. One moment, a celebration; the next, an empty chair. One moment, a power grid; the next, a graveyard of submerged steel.

There is no grand lesson in the ruin. The silt gets into the gears, the locks, and the small, intricate spaces of our lives. It makes the hinges creak. It forces us to acknowledge that we built on a theory that assumed the earth would stay still.

### The Unfinished Afternoon

I walk back inside. The air in the house is cool, smelling of wet timber and old paper. My father has finally sat down. He isn't looking at the wall anymore. He is looking at his palms, rubbing the dirt from his creases. He looks small against the backdrop of the darkened kitchen.

"The rain has stopped," he says. His voice is flat, devoid of the frantic energy that defined the last decade of our lives.

I don't answer. I pick up the teapot from the stove. It is cold. I touch the spout, feeling the rough texture of the ceramic, the small chip near the handle where I dropped it three years ago. It’s still there. The damage is permanent, but the object still functions.

I set the pot back down. The ceramic makes a dull, final thud against the granite. We sit in the quiet, listening to the drip of water from the eaves, rhythmic and slow.`;

    it('flags Rules 47–52 on the flawed "The Weight of Wet Concrete" draft', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Weight of Wet Concrete',
        content: rawWetConcreteDraft,
        category: 'Short Stories',
        persona: { penName: 'atharv_bhav', fullName: 'Atharva Bhavsar' },
        now: mockNow
      });

      expect(res.isValid).toBe(false);
      const ruleNames = res.violations.map(v => v.rule);
      expect(ruleNames).toContain('REAL_DISASTER_FICTION_BOUNDARY_FAIL');
      expect(ruleNames).toContain('TRAGEDY_STACKING_FAIL');
      expect(ruleNames).toContain('CAUSAL_EQUIVALENCE_FAIL');
      expect(ruleNames).toContain('SYMBOL_EXPLAINS_ITSELF_FAIL');
      expect(ruleNames).toContain('ENDING_MOTIF_COOLDOWN');
      expect(ruleNames).toContain('PREMISE_TITLE_INTEGRITY_FAIL');
    });

    it('flags Rules 53–56 on the Upper Trishuli mismatched draft', () => {
      const mismatchedDraft = `### The Silt Line

The waterline on the kitchen wall has dried into a gray mark that stops level with my father's shoulder. In the corner, where the masonry meets the doorframe of our house above Rasuwa, a skim of fine mountain silt has begun to peel from the plaster like dry paper.

Inside is his share allotment certificate from the Upper Trishuli run-of-the-river hydropower project allotted under the local resident quota five years ago.

Down along the riverbed, the water left behind six feet of pulverized schist, boulders, and gravel that buried the road to the powerhouse. It came as a dense slurry moving fast enough to drown the turbine floor under two million tonnes of sediment.`;

      const res = validateZeroAISlopEngineBlockers({
        title: 'The Shares Beneath the Silt',
        content: mismatchedDraft,
        category: 'Short Stories',
        persona: { penName: 'atharv_bhav', fullName: 'Atharva Bhavsar' },
        now: mockNow
      });

      expect(res.isValid).toBe(false);
      const ruleNames = res.violations.map(v => v.rule);
      expect(ruleNames).toContain('ENTITY_FACT_BINDING_FAIL');
      expect(ruleNames).toContain('STATISTIC_SCOPE_DRIFT_FAIL');
      expect(ruleNames).toContain('PLAUSIBLE_PRECISION_FAIL');
      expect(ruleNames).toContain('GEOGRAPHIC_SETTLEMENT_PRECISION_FAIL');
    });

    it('passes cleanly with zero violations on the calibrated story "The Shares Beneath the Silt" (Rasuwagadhi)', () => {
      const calibratedNepalStory = `### The Silt Line

The waterline on the kitchen wall has dried into a gray mark that stops level with my father's shoulder. In the corner, where the masonry meets the doorframe of our house above Syabrubesi, a skim of fine mountain silt has begun to peel from the plaster like dry paper.

My father does not touch the wall. He sits on a low wooden stool, holding a blue plastic fertilizer sack across his knees. Inside are his printed Rasuwagadhi Hydropower allotment papers, bought under the project-affected residents' quota when shares were offered across the valley. The paper inside the sack is damp at the edges, but the stamp from the collection counter in Dhunche is still legible through the polyethylene.

"I still have the allotment number," he says. He speaks without looking up from the bag. "They told us the shares would be for our children."

Down along the riverbed, the water is no longer surging, but the banks and access road are buried beneath grey silt, boulders, and shattered timber. On August 26, when the glacial collapse hit the upper catchment across the border, the flood did not arrive as clean water. It came as a dense slurry moving fast enough to wedge trees into the intake gates and drive mud deep into the powerhouse. The plant had been built around predictable seasonal flow from the monsoon; it was never designed to swallow a collapsing mountain.

### The Passbook in the Kitchen

Outside, in the lane below our terrace, our neighbor is trying to haul a hand-tiller out of the ditch. The metal makes a dull clink against river stone, moves an inch, and jams. He leaves the towline slack and sits down on the mud bank to catch his breath.

My father reaches down to the floor, picks up a dull kitchen knife, and begins prying caked silt from the treads of his work boots. He works deliberately, following the deep rubber grooves around the heel.

"The cooperative office in the bazaar is submerged up to the lintel," I tell him. "They won't be certifying share transfers or dividend ledgers this quarter."

"The plant is still there," he answers.

He simply continues scraping the heel of his left boot. A dried crust of gray silt the size of a coin breaks loose and drops with a soft click against the cement floor.`;

      const res = validateZeroAISlopEngineBlockers({
        title: 'The Shares Beneath the Silt',
        content: calibratedNepalStory,
        category: 'Short Stories',
        persona: { penName: 'atharv_bhav', fullName: 'Atharva Bhavsar' },
        now: mockNow
      });

      expect(res.isValid).toBe(true);
      expect(res.violations).toHaveLength(0);
    });
  });

  describe('Rules 57–61: Planner Placeholder Leak, Source-Premise Compatibility, and Empty Atmosphere', () => {
    const rawMeloniFlawedDraft = `### The Siding

The old railway siding sat under the station clock stuck at twelve minutes past six, casting a long copper shadow across the weathered benches. Word had already spread through the tea stalls about the events surrounding A counterintuitive perspective on standard workflows and craftsmanship in short stories.

The whistle of the approaching goods train echoed through the valley, carrying with it the cold scent of the river and the quiet promise of an unwritten journey.

"Some things change overnight," the station master said, leaning against the wooden counter. "And some things take twenty years just to begin."`;

    it('flags Rules 57–61 on the flawed placeholder-leaked Meloni railway draft', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'A counterintuitive perspective on standard workflows and craftsmanship in short stories',
        content: rawMeloniFlawedDraft,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' },
        researchDossier: { topic: 'Giorgia Meloni becomes longest-serving Italian PM in postwar era' },
        now: mockNow
      });

      expect(res.isValid).toBe(false);
      const ruleNames = res.violations.map(v => v.rule);
      expect(ruleNames).toContain('PLANNER_PLACEHOLDER_LEAK_FAIL');
      expect(ruleNames).toContain('SOURCE_PREMISE_COMPATIBILITY_FAIL');
      expect(ruleNames).toContain('SOURCE_DEPENDENCY_FAIL');
      expect(ruleNames).toContain('APHORISTIC_DIALOGUE_FAIL');
      expect(ruleNames).toContain('EMPTY_ATMOSPHERE_FAIL');
    });

    it('passes cleanly on Devansh Roy calibrated transmission essay "Three Headlines for the Same 1,412 Days"', () => {
      const calibratedDevanshEssay = `### The Wire Copy and the State Release

On September 4, Giorgia Meloni’s government surpassed the 1,412-day record of Silvio Berlusconi’s second government to become Italy’s longest-serving postwar administration. Across wire services, the milestone moved under three distinct editorial geometries.

The first dispatch came from Rome’s official government channels: a commemorative graphic presenting the calendar duration as an accomplished institutional milestone. In that framing, duration became evidence of political stability, with the executive arguing that governing continuity had reinforced Italy's credibility before European institutions and financial markets. Surviving across an administration in a republic that had seen 68 governments since 1946 was positioned as an administrative fact.

From New Delhi, an external diplomatic message was released: Narendra Modi characterized the record tenure as a reflection of enduring public trust. Transmission shifted the milestone from domestic parliamentary arithmetic into bilateral rapport, emphasizing executive durability for international partners.

### The Contextual Wire and the Sourced Ledger

The third transmission, filed by Reuters from Rome, recorded the mathematical record before placing it beside unresolved domestic criticism. Reuters placed the record beside unresolved criticism over healthcare, education, public administration and weak economic performance. Longevity had preserved the cabinet room, but ongoing structural negotiations remained open across the ministries.

A tenure record is easy to report because duration is measurable. Institutional transformation is harder: it has to be argued sector by sector.

Watching wire copy move across editorial desks makes that divergence legible:
The official release counts days.
The diplomatic message turns those days into trust.
The wire report asks what changed during them.`;

      const res = validateZeroAISlopEngineBlockers({
        title: 'Three Headlines for the Same 1,412 Days',
        content: calibratedDevanshEssay,
        category: 'Essays',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' },
        researchDossier: { topic: 'Giorgia Meloni longest-serving postwar Italian PM' },
        now: mockNow
      });

      expect(res.isValid).toBe(true);
      expect(res.violations).toHaveLength(0);
    });

    it('flags Rules 64–67 on the earlier draft with fabricated civic examples and regional ledger', () => {
      const flawedDraftWithInventedSpecifics = `### The Wire Copy and the State Release
On September 4, when the Italian prime minister surpassed Silvio Berlusconi's 2001–2006 record, it was presented as proof that electoral continuity had cured parliamentary fragmentation.
Two hours later, an external diplomatic congratulation was released.
Reuters pointed out that calendar duration had left hospital waitlists, regional train delays, and low wage growth unresolved.
The regional ledger simply logs what the trains carried before the record was broken.`;

      const res = validateZeroAISlopEngineBlockers({
        title: 'Three Headlines for the Same 1,400 Days',
        content: flawedDraftWithInventedSpecifics,
        category: 'Essays',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' },
        researchDossier: { topic: 'Giorgia Meloni longest-serving postwar Italian PM' },
        now: mockNow
      });

      expect(res.isValid).toBe(false);
      const ruleNames = res.violations.map(v => v.rule);
      expect(ruleNames).toContain('UNSUPPORTED_CONCRETE_EXAMPLE_FAIL');
      expect(ruleNames).toContain('DOCUMENT_COUNT_INTEGRITY');
      expect(ruleNames).toContain('POLITICAL_ATTRIBUTION_LOCK');
      expect(ruleNames).toContain('FACTUAL_PRECISION_HISTORICAL_RECORD_FAIL');
    });

    it('flags Rule 62 DECORATIVE_SOURCE_FAIL when news topic is mentioned only as passing gossip', () => {
      const decorativeSourceDraft = `### Afternoon at the Counter
The wooden counter smelled of wet ginger and old pine. Someone mentioned at the counter that the prime minister had set a record across the ocean.
The crows perched on the tin roof, shaking rain from their wings. Outside, a cyclist steered through the brown puddles, balancing two brass cans on the carrier.`;

      const res = validateZeroAISlopEngineBlockers({
        title: 'The Rain on the Tin Roof',
        content: decorativeSourceDraft,
        category: 'Essays',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' },
        researchDossier: { topic: 'Giorgia Meloni longest-serving postwar Italian PM' },
        now: mockNow
      });

      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'DECORATIVE_SOURCE_FAIL')).toBe(true);
    });

    it('flags Rule 63 STOCK_NARRATIVE_SCAFFOLD_FAIL on railway + station clock + tea stall + goods train scaffold', () => {
      const scaffoldDraft = `### The Siding
The railway siding was quiet under the station clock stuck at six. At the tea stall, the wooden counter creaked as a distant whistle announced the goods train.
The weathered benches were damp with evening fog.`;

      const res = validateZeroAISlopEngineBlockers({
        title: 'The Evening Siding',
        content: scaffoldDraft,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' },
        now: mockNow
      });

      expect(res.isValid).toBe(false);
      expect(res.violations.some(v => v.rule === 'STOCK_NARRATIVE_SCAFFOLD_FAIL')).toBe(true);
    });

    it('correctly populates distinct internal fields in buildPremiseCard and triggers SKIP when Devansh writes political fiction', () => {
      const devanshPersona = {
        id: 'bot_devansh_fiction',
        fullName: 'Devansh Roy',
        penName: 'devansh_roy',
        bio: 'Writer and archival researcher.',
        personaPrompt: 'You examine media provenance and archival records.'
      };

      const politicalDossier = {
        topic: 'Giorgia Meloni longest-serving Italian PM',
        category: 'Short Stories',
        newsReports: [
          { headline: 'Report 1: Milestone reached' },
          { headline: 'Report 2: Modi congratulates' }
        ]
      };

      const card = buildPremiseCard(devanshPersona, 'A counterintuitive perspective on standard workflows', 'Short Stories', politicalDossier);

      // Verify internal fields are populated and topic_hint was cleansed
      expect(card.researchSubject).toBe('Giorgia Meloni longest-serving Italian PM');
      expect(card.topic_hint).toBe(null);
      expect(card.personaDomainMismatch).toBe(true);
      expect(card.whyMustWrite).toContain('Attuned to archival provenance');

      // Verify validatePremiseOriginality returns SKIP
      const check = validatePremiseOriginality(card, { persona: [], platform: [] }, []);
      expect(check.passed).toBe(false);
      expect(check.decision).toBe('SKIP');
      expect(check.reason).toContain('Devansh Roy cannot force political milestones');
    });

    it('returns SKIP if research brief has fewer than 3 indispensable source facts', () => {
      const aaravPersona = {
        id: 'bot_aarav_tech',
        fullName: 'Aarav Patel',
        penName: 'aarav_patel',
        bio: 'Systems engineer and writer.',
        personaPrompt: 'You examine systems engineering.'
      };

      const thinDossier = {
        topic: 'Postgres 18 release date',
        category: 'Tech',
        newsReports: [
          { headline: 'Postgres 18 commits merged' }
        ]
      };

      const card = buildPremiseCard(aaravPersona, 'Postgres 18 overview', 'Tech', thinDossier);
      const check = validatePremiseOriginality(card, { persona: [], platform: [] }, []);
      expect(check.passed).toBe(false);
      expect(check.decision).toBe('SKIP');
      expect(check.violations.some(v => v.includes('INSUFFICIENT_SOURCE_FACTS'))).toBe(true);
    });
  });
});




