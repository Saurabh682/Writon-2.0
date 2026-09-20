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
        content: 'He needed to monitor the delayed broadcast. The receiver was locked to 9.730 MHz, picking up the evening signal before anyone could spoil the transmission.',
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
        content: 'He needed to listen before anyone could spoil the news. Near the lower edge of the thirty-one-meter band, a voice in Farsi cuts through the delayed broadcast atmospheric flutter.',
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

    it('flags Rules 68–72 on the flawed Anandita Dutta draft with Waqf perfume and prop cluster', () => {
      const flawedDraft = `### The Inventory of Absence
The monsoon rain hammers against the corrugated tin roof, a rhythmic, metallic stutter that drowns out the hum of the ceiling fan. I sit at the mahogany desk, my fingers tracing the grain of the wood where my father’s fountain pen once left a permanent ink stain. It is a dark, irregular shape, like a bruised plum. Beside it rests the legal notice from the city court.
Inheritance, they say, is the passing of a legacy. The news reports from Uttarakhand about the Waqf Board and the recasting of nikahnamas seem like echoes from a different geography, yet the friction is identical. It is about who owns the soil, and who is merely permitted to stand upon it while the water rises.
The Times of India reported on similar disputes involving actors and relatives, a public unraveling of private histories. The older generation leaves a map, and the younger generation is expected to navigate the shifting currents without a compass.
A chipped teapot, a mahogany desk with a stain like a bruise, and a stack of documents.
I pick up the pen. I do not sign anything. The tea in the glass is cooling, a thin film of oil forming on the surface.`;

      const res = validateZeroAISlopEngineBlockers({
        title: 'The Weight of Wet Paper',
        content: flawedDraft,
        category: 'Short Stories',
        persona: { penName: 'anandita_dutta', fullName: 'Anandita Dutta' },
        researchDossier: { topic: 'Uttarakhand Waqf Board revised nikahnama' },
        now: mockNow
      });

      expect(res.isValid).toBe(false);
      const ruleNames = res.violations.map(v => v.rule);
      expect(ruleNames).toContain('SOURCE_CAUSAL_RELEVANCE_FAIL');
      expect(ruleNames).toContain('METAPHORIC_SOURCE_BRIDGING_FAIL');
      expect(ruleNames).toContain('SHORT_STORY_STAKES_BINDING');
      expect(ruleNames).toContain('MATERIAL_REALITY_OVER_SYMBOLISM');
      expect(ruleNames).toContain('GLOBAL_PROP_CLUSTER_COOLDOWN');
    });

    it('passes cleanly on Anandita Dutta calibrated riverbank boundary story "The Weight of Wet Paper"', () => {
      const calibratedStory = `### The Cadastral Fold

The blue cloth backing of the 1968 cadastral map had split along the fold line for Dag Number 42, separating our homestead plot from the river boundary.

My uncle laid his ballpoint pen beside the revenue stamp. He had traveled thirty kilometers by shared taxi from Palashbari to reach our veranda in North Guwahati before the circle office closed for the weekend. The affidavit on the table was already notarized on non-judicial stamp paper. It stated that our family consented to the undisputed partition of the ancestral three kathas under the existing dag boundaries, allowing separate pattas to be issued for each share.

"Sign the second page," he said, pressing his thumb against the margin. "The revenue circle officer said if the partition consent is not registered this month, the patta stays frozen under dispute."

I did not take the pen. I unfolded the survey sheet across the low cane table. In the revenue surveyor's ink from fifty-eight years ago, the eastern edge of Dag 42 was fixed by three permanent markers: the culvert on the public road, an old jackfruit tree, and the high earthen bank of the Brahmaputra.

The culvert was still standing. But the jackfruit tree had slid into the water during the floods of 2014, and the riverbank itself had receded more than forty meters westward across our lower paddy. The land my uncle was asking me to partition on paper no longer existed in the physical world.

### The Boundary in the Water

"If I sign this consent," I said, "we are certifying to the revenue circle that the old boundaries stand. You will take the dry upper parcel along the paved road, and our share will be registered on the lower katha."

"The deed recognizes the full acreage," my uncle said, his voice tightening. "The government does not redraw the dag map after every monsoon. We divide what the title paper says we own."

"The lower katha is five feet beneath the river channel," I told him. "A boat crosses it twice every morning to reach the sandbar. If the circle officer enters this partition without field verification, our family will be paying annual land revenue on twenty yards of riverbed."

He pulled the papers toward his chest. "If we call for a fresh survey, they’ll mark the eroded portion separately. Once that happens, you know what becomes of the river-side share."

That was the actual transaction: he wanted documentary finality today, and he wanted my signature to absorb the loss that the river had already claimed.

A small beetle crawled from under the wooden map weight, stepped onto the blue margin of the survey sheet, crossed the faded surveyor's seal, and dropped off the wicker edge into the dust. Outside, between the bamboo clumps, the brown surface of the Brahmaputra moved east to west, heavy, silent, and indifferent to the registered acreage of the circle office.

### The Refusal

My mother came out from the kitchen carrying two stainless steel glasses of warm water. She set them on the wooden stool between us. She looked at the folded map, recognized the split along the center fold, and looked down at the courtyard where the garden ended at the bamboo fence. She did not ask about the partition.

"I will not sign the affidavit," I told my uncle.

He stared at me, his fingers curling over the notarized stamp paper. "The dispute will go before the assistant revenue settlement officer. You will lose the whole estate in litigation fees."

"Then let the survey team come to the bank and mark what is actually there," I said. "We will record what is left of the land, not what the grandfather wrote before the embankment collapsed."

He did not drink the water. He gathered his stamp papers, slid them into a brown plastic folder, snapped the rubber band around it, and walked down the veranda steps into the humid air. I stayed on the wicker bench, smoothing the split canvas of the old map, listening to the dull, steady slap of water against the cut bank below the silt road.`;

      const res = validateZeroAISlopEngineBlockers({
        title: 'The Weight of Wet Paper',
        content: calibratedStory,
        category: 'Short Stories',
        persona: { penName: 'anandita_dutta', fullName: 'Anandita Dutta' },
        now: mockNow
      });

      expect(res.isValid).toBe(true);
      expect(res.violations).toHaveLength(0);
    });

    it('flags uncalibrated Chaulani disaster poem for invented witnesses, abstraction density, and generic props (Rules 75-78)', () => {
      const rejectedPoem = `### I
The salt air of Fort Kochi feels like a different language today. I watch the Chinese fishing nets dip into the harbor, their wooden frames skeletal against the bruised violet of the evening sky. My phone glows with reports from Darchula—the Chaulani River, stubborn and choked by a landslide, holding its breath behind a wall of silt and shale. The news cycles call it a threat, a flash flood risk, a headline. I call it an ache. I see the villagers looking up at the slopes, listening for the sound of shifting earth, a sound as familiar to them as the prayer call is to me.

### II
The mountain does not offer warnings in prose. It speaks in the collapse of timber and the sudden, heavy stillness of a blocked artery. When the water stops flowing, the heart of the village pauses with it. There is a specific quality to this terror: it is the realization that the ground beneath your feet is only a temporary agreement. I think of the terracotta tiles above my head, how they shudder when the monsoon gusts hit them—a fragile protection against the inevitable weight of the sky.

### III
Where the river halts, the memory gathers,
Cold stone pressing against the throat of the valley.
No bird sings above the silence of the silt,
Only the shadow of a slope growing heavy with ghosts.

They walk the ridge with lanterns held low,
Watching the water rise against the dam of pride.
What is a river if it cannot reach the sea?
What is a home if the mountain decides to return?

Dust settles on the pulse of the current,
Brass lamps flicker in the damp, thin air.
We are all waiting for the crack in the wall,
For the mountain to loosen its iron grip on our names.

### IV
Thousands of miles away, the fear is tangible, measured in cubic meters of mud and the rising anxiety of a river forced to wait. I write this with a cold cup of tea at my elbow, the steam dissipating into the humid air of the coast. We measure our lives by what stays still, yet everything is in a state of transit—the silt moving toward the sea, the rain moving toward the earth, the memory moving toward the pen. I look at the dark water of the Kochi backwaters and watch a single palm frond drift against the current, caught in a stagnant eddy, spinning slowly toward the mud.`;

      const res = validateZeroAISlopEngineBlockers({
        title: 'The River That Forgot Its Path',
        content: rejectedPoem,
        category: 'Poetry',
        persona: { penName: 'kavya_nair', fullName: 'Kavya Nair' },
        now: mockNow
      });

      expect(res.isValid).toBe(false);
      const ruleNames = res.violations.map(v => v.rule);
      expect(ruleNames).toContain('REAL_EVENT_POETRY_BOUNDARY');
      expect(ruleNames).toContain('POETRY_ABSTRACTION_DENSITY_FAIL');
      expect(ruleNames).toContain('SETTING_NECESSITY_CHECK');
      expect(ruleNames).toContain('GLOBAL_POETRY_MOTIF_COOLDOWN');
    });

    it('passes cleanly on Kavya Nair calibrated hydrology poem "When a River Has to Wait"', () => {
      const calibratedPoem = `### I

At four in the afternoon, the tide in the Vembanad estuary does what it has done all week: it pulls three inches of salt water away from the seawall, exposing the barnacles on the wooden pilings, then stops. Twenty minutes later, it turns back toward the harbor. You can set a pocket watch by the mud.

Then the notification arrives from the far north: near the border at Darchula, the slope above Bhattar sheared away. Shale and dry silt dropped into the gorge of the Chaulani River.

The wire report does not describe a flood. It describes the opposite: the water simply ceased to arrive.

### II

A mountain river does not know how to be still. From the Api Himal, it drops eight thousand feet over boulder beds and slate shelves, loud enough that two people standing on the footbridge must shout into each other's collars.

When the ridge slid, the sound must have vanished first.

The district administration ordered ten families uphill from the bank. The police post at Api Himal radioed downstream to warn people away from the dry gravel of the riverbed, because dry riverbeds in September do not stay dry.

For three hours, the impoundment grew behind fifty feet of loose shale. A river that had never paused since the snowmelt began was forced to sit in the gorge and fill a bowl of rubble.

### III

Here on the coast, we expect water to leave.
The tide goes out because the moon pulls it;
the sandbars dry, the gulls wait on the stakes,
and by five o’clock the gray swell fills the inlet again.

Up there, water that stops moving is an emergency.
You do not stare at a still pool in a gorge
wondering what it means for your soul.
You stand on the higher terrace with your shoes on,
watching whether the crest of the rubble is darkening with moisture,
waiting for the weight behind it to punch through.

### IV

By nightfall, the district office reported that the Chaulani had cut its own channel through the silt. The flow downstream normalized. The relocated families stayed on the upper slope overnight because the cliff face above the cut was still shedding loose shale into the dark.

The tide here in Kochi is coming back against the stone now, right on time, lifting the hulls of the moored skiffs an inch every ten minutes. It is strange to live beside water whose return is a certainty, reading about a river six hundred miles away that had to wait an entire afternoon just to resume falling.`;

      const res = validateZeroAISlopEngineBlockers({
        title: 'When a River Has to Wait',
        content: calibratedPoem,
        category: 'Poetry',
        persona: { penName: 'kavya_nair', fullName: 'Kavya Nair' },
        now: mockNow
      });

      expect(res.isValid).toBe(true);
      expect(res.violations).toHaveLength(0);
    });
  });

  describe('28. THINK BRAIN RULES 79-83: HUMOUR ENGINE, ENTERTAINMENT FRESHNESS & TITLE CONTRACT (GOPAL KRISHNAN)', () => {
    const rejectedDraft = `### The Morning Notification

At 6:12 AM, the brass handle of my front door felt cold against my palm. The society group had already clocked ninety-four unread messages. It was a digital stampede. Usually, these spikes in traffic involve parking space disputes or the erratic, high-pitched hum of the overhead water pump. Today, however, the subject was the whisper-thin gossip of *Bigg Boss Malayalam 8*.

My neighbor, Mr. Pillai, had sent a screenshot from The Times of India. It was a list of probable contestants. He added a string of exclamation marks long enough to wrap around the building’s lift shaft. The air in my hallway smelled of yesterday’s fried fish and wet concrete, a scent that defines our high-rise life. I stared at the phone screen, the blue light catching the dust motes dancing in the morning sun.

### The Virtual Arena

People were debating the credibility of the rumors. Some claimed Rahul Easwar’s entry was a strategic masterstroke by the producers; others were busy tagging the building secretary to ask if he could arrange a group viewing in the clubhouse. We share a floor, a water bill, and a common resentment toward the security guard’s refusal to accept courier packages after 8 PM, yet we were currently fighting over the casting choices of a reality show.

I looked at my own reflection in the hallway mirror. I looked tired. I am the one who complains about the stray cats in the lobby, and yet here I was, participating in a thread that would likely result in three people leaving the group in a huff before lunch. The irony was heavy, like a wet wool blanket.

### The Domestic Friction

My wife, Meera, walked past with a steaming cup of ginger tea. The smell of the tea momentarily cut through the stale humidity of the corridor. She didn't look at the phone. She doesn't participate in the group. She says the notification pings sound like a woodpecker tapping on a skull. I envy her silence. I am addicted to the friction of these threads, to the way the administrative power trip makes everyone feel like they have a stake in something larger than the kitchen sink.

### The Unresolved Echo

I sat down on the sofa, the upholstery feeling coarse against my skin. The phone buzzed again. Another message, this one a heated audio clip of someone arguing about the merits of the potential contestant list. I didn't press play. Instead, I set the phone face down on the wooden side table. The wood is scarred where I accidentally dropped a soldering iron three years ago.

Outside, the rain began to tap against the windowpane. It was a slow, rhythmic sound, indifferent to the chaos inside the group chat. I looked at the kitchen clock. It was 6:45 AM. The water tank pump finally kicked in, a deep, shuddering groan that vibrated through the floorboards. I stood up and walked to the kitchen, leaving the phone face down on the table.`;

    it('rejects ungrounded literary-atmosphere draft "The Glass Wall of Flat 402" under Rules 79-83', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Glass Wall of Flat 402',
        content: rejectedDraft,
        category: 'Humour',
        persona: { penName: 'gopal_krishnan_jokes', fullName: 'Gopal Krishnan' },
        now: mockNow
      });

      expect(res.isValid).toBe(false);
      const ruleNames = res.violations.map(v => v.rule);
      expect(ruleNames).toContain('HUMOUR_MECHANISM_REQUIRED');
      expect(ruleNames).toContain('HUMOUR_LITERARY_ATMOSPHERE_FAIL');
      expect(ruleNames).toContain('ENTERTAINMENT_STATUS_LOCK');
      expect(ruleNames).toContain('TITLE_OBJECT_CONTRACT_FAIL');
      expect(ruleNames).toContain('HUMOUR_BUTTON_FAIL');
    });

    it('passes calibrated comic escalation story "Mrs Menon Has Left the Group" cleanly', () => {
      const calibratedStory = `### 6:12 AM

Palm Meadows Phase II, Block B, is technically a residential complex of seventy-two flats overlooking a bypass drainage canal. Administratively, it is a nuclear-armed constitutional republic governed by five men with bifocals and Samsung tablets who believe that if they ever surrender group administrator privileges, civilization itself will unravel before lunchtime.

The opening salvo arrived while the morning milk sat on the doormat.

Mr. Pillai (Flat 204) posted a screenshot from his newsfeed. It was an update from the second week of *Bigg Boss Malayalam Season 8*. Rahul Easwar had become house captain.

Mr. Pillai wrote:
> *“Rahul Easwar is captain!!!!!!!!!!!!!!!!!!! Mark my words, from today nobody will get tea on time in that house!!!!!!!!!!!!!!!!!!!”*

He included nineteen exclamation marks. Mr. Pillai considers punctuation a form of supporting documentation.

### 6:18 AM

Rajan from Flat 302 replied within six minutes. Rajan does not watch television, but he has not missed an opportunity to declare an ideological position on WhatsApp since the building’s solar panel tender of 2019.

> *“Obvious trap,”* Rajan typed. *“Easwar will deliberately weaponize kitchen duties. In twenty-four hours he will have the smokers and the non-smokers forming separate voting blocs. A captain who controls the ginger quota controls the house.”*

### 6:21 AM

At exactly 6:21 AM, the Executive Committee crossed the border.

Mr. T. S. Sundaram, Society Secretary (Flat 402), activated his keyboard. Sundaram types entirely in capital letters to convey statutory authority, regardless of whether he is announcing an emergency diesel generator overhaul or inquiring about an unclaimed green plastic bucket near the basement water meter.

> *“DEAR ESTEEMED RESIDENTS. PLEASE NOTE. THIS IS PALM MEADOWS OFFICIAL RESIDENTS GROUP (COMMUNICATION WINDOW: 7:00 AM TO 9:00 PM AS PER 2018 BYE-LAWS). TELEVISION REALITY PROGRAMMES HAVE ZERO BEARING ON DRAINAGE CLEARANCE OR LIFTS MAINTENANCE. CONFINE POSTS STRICTLY TO MUNICIPAL MATTERS.”*

### 6:22 AM

Flat 507 did not wait thirty seconds.

Kurup has lost three consecutive committee elections to Sundaram and still refers to the 2019 security-bulb tender as "the incident." Kurup does not recognize Sundaram’s 7:00 AM embargo. Kurup considers the 7:00 AM embargo an unconstitutional suspension of civil liberties.

> *“Why is Secretary sir suppressing spontaneous cultural discourse?”* Kurup replied. *“If residents cannot discuss contemporary Malayalam media in their own paid building group, why did we pay twenty-four thousand rupees for the clubhouse Wi-Fi router? Is Block B a cooperative housing society or a central prison?”*

### 6:27 AM

At 6:27 AM, somebody whose flat number is not saved in my contacts initiated a poll:

**“SHOULD BIGG BOSS DISCUSSION BE PERMITTED IN MAIN GROUP?”**
- *Option 1: Yes, until 8:00 AM (7 votes)*
- *Option 2: No, move to Cultural Sub-Group (12 votes)*
- *Option 3: Security guard is still refusing Amazon packages after 8:00 PM (31 votes)*

Within three minutes, Option 3 was leading by a landslide.

### 6:31 AM

Sundaram deleted the poll.

Under WhatsApp’s admin privileges, the screen displayed the single most authoritarian phrase in contemporary Indian domestic life:
*“This poll was deleted by an admin.”*

Sundaram followed with an attachment: a scanned, crooked PDF of the 2018 Bye-Laws, Section 14, Subsection (b): *“Use of Common Areas for Activities Other Than Residential Purpose.”*

> *“ONE MORE IRRELEVANT POST AND GROUP SETTING WILL BE CONVERTED TO ‘ONLY ADMINS CAN SEND MESSAGES’ TILL SUNDAY AGM.”*

### 6:34 AM

The chat froze.

To threaten fifty-eight families with admin-only mode before breakfast is the equivalent of imposing emergency rule.

Then came the turn.

At 6:34 AM, Mrs. Menon (Flat 601) entered the thread. Mrs. Menon has lived in Block B since 2012. She has never spoken on WhatsApp. She did not vote in the solar panel tender. She did not reply when the basement flooded during the 2021 monsoon. She pays her maintenance six months in advance by demand draft delivered by hand in an unmarked manila envelope.

Mrs. Menon typed five words:
> *“I am leaving this group.”*

A grey notification immediately dropped onto the screen:
*“Mrs. Menon left.”*

### 6:35 AM

At 6:35 AM, before the collective silence could register, her husband, Mr. Menon (Flat 601, retired LIC officer), stepped in.

Without typing a single letter of explanation or apology, Mr. Menon tapped *Add Participant*.

*“Mr. Menon added Mrs. Menon.”*

Mrs. Menon was back inside the house.

### The Confession Room

I set my phone on the dining table and looked across at the kitchen.

My wife Meera was slicing onions. She didn't look at her phone. She keeps the society group on permanent one-year mute.

“What is happening over there?” she asked without turning around.

“Rahul Easwar is captain,” I said. “Kurup accused Sundaram of authoritarianism. Someone tried to audit Amazon couriers through a poll. Sundaram threatened Section 14(b). Mrs. Menon resigned and was reinstated within fifty-two seconds.”

Meera scraped the onions into a stainless-steel plate. “They are criticizing the Bigg Boss contestants for forty-five minutes every night,” she said, “while running the exact same reality show for eleven years on the fourth floor.”

Palm Meadows has had weekly nominations since 2016. The lift lobby is our confession room, and every AGM contains at least one attempted eviction.

### 6:44 AM

From the terrace roof above Flat 402, the water motor shut off with a sharp, mechanical clack.

The pipes shuddered once through the shaft.

My phone buzzed.

A single message popped up from Secretary Sundaram:
> *“WATER MOTOR OFF. WHO SWITCHED IT ON BEFORE 7:00 AM?”*

At the bottom of the screen, the indicator appeared:
*Forty-seven people are typing...*

---

#humour #satire #apartmentlife #residentassociation #palmmeadows #biggboss

#writon`;

      const res = validateZeroAISlopEngineBlockers({
        title: 'Mrs Menon Has Left the Group',
        content: calibratedStory,
        category: 'Humour',
        persona: { penName: 'gopal_krishnan_jokes', fullName: 'Gopal Krishnan' },
        now: mockNow
      });

      expect(res.isValid).toBe(true);
      expect(res.violations).toHaveLength(0);
    });

    it('enforces Rules 84-88 (JOKE_EXPLANATION_OVERFLOW, COMIC_INSTITUTIONAL_PLAUSIBILITY, LIVE_SHOW_STATE_LOCK, HUMOUR_PROPAGATION_RULE, DOMESTIC_VS_WORKPLACE_HASHTAG_FAIL)', () => {
      // 1. JOKE_EXPLANATION_OVERFLOW test
      const verboseJokeContent = `Meera scraped onions: "while running the exact same reality show for eleven years on the fourth floor."
Every three-wheel auto that parks in Bay B-14 is a captaincy challenge.
Every circular pasted with brown cello-tape inside Lift No. 2 is an eviction notice.
The lift lobby is the confession room.
The courier package ban after 8 PM is the luxury budget task.
WATER MOTOR OFF. WHO SWITCHED IT ON BEFORE 7:00 AM? Forty-seven people are typing...`;
      const resOverflow = validateZeroAISlopEngineBlockers({
        title: 'Overexplained Humour',
        content: verboseJokeContent,
        category: 'Humour'
      });
      expect(resOverflow.violations.map(v => v.rule)).toContain('JOKE_EXPLANATION_OVERFLOW');

      // 2. COMIC_INSTITUTIONAL_PLAUSIBILITY test
      const tailoredBylawsContent = `Sundaram cited the 2018 Bye-Laws, Section 14(b): "Pertaining to Unregulated Canvassing and Digital Misuse of Association Channels."
WATER MOTOR OFF. WHO SWITCHED IT ON BEFORE 7:00 AM? Forty-seven people are typing...`;
      const resPlausibility = validateZeroAISlopEngineBlockers({
        title: 'Tailored Bylaws',
        content: tailoredBylawsContent,
        category: 'Humour'
      });
      expect(resPlausibility.violations.map(v => v.rule)).toContain('COMIC_INSTITUTIONAL_PLAUSIBILITY');

      // 3. LIVE_SHOW_STATE_LOCK test
      const stalePremiereContent = `It was the premiere week of Bigg Boss Malayalam Season 8 and Rahul Easwar had just been appointed house captain.
WATER MOTOR OFF. WHO SWITCHED IT ON BEFORE 7:00 AM? Forty-seven people are typing...`;
      const resLiveLock = validateZeroAISlopEngineBlockers({
        title: 'Premiere Week Lock',
        content: stalePremiereContent,
        category: 'Humour'
      });
      expect(resLiveLock.violations.map(v => v.rule)).toContain('LIVE_SHOW_STATE_LOCK');

      // 4. HUMOUR_PROPAGATION_RULE test
      const inertAtmosphereContent = `The wood is scarred where I accidentally dropped a soldering iron three years ago.
WATER MOTOR OFF. WHO SWITCHED IT ON BEFORE 7:00 AM? Forty-seven people are typing...`;
      const resPropagation = validateZeroAISlopEngineBlockers({
        title: 'Inert Atmosphere Humour',
        content: inertAtmosphereContent,
        category: 'Humour'
      });
      expect(resPropagation.violations.map(v => v.rule)).toContain('HUMOUR_PROPAGATION_RULE');

      // 5. DOMESTIC_VS_WORKPLACE_HASHTAG_FAIL test
      const workplaceTagOnApartmentContent = `Palm Meadows resident association meeting.
WATER MOTOR OFF. WHO SWITCHED IT ON BEFORE 7:00 AM? Forty-seven people are typing...
#humour #workplacechronicles #writon`;
      const resHashtag = validateZeroAISlopEngineBlockers({
        title: 'Hashtag Mismatch',
        content: workplaceTagOnApartmentContent,
        category: 'Humour'
      });
      expect(resHashtag.violations.map(v => v.rule)).toContain('DOMESTIC_VS_WORKPLACE_HASHTAG_FAIL');
    });
  });

  describe('29. THINK BRAIN RULES 89-94: PERSONA BIOGRAPHY INTEGRITY & CRITICAL METRICS (MEERA VARMA)', () => {
    const rejectedDraft = `The floorboards in the studio are warped. They groan under the weight of a Bharatanatyam dancer’s footwork, a dry, rhythmic protest against the humidity. I am sitting in the corner, the smell of damp jasmine and floor wax thick in the air. My notebook is open, the ink pooling in the grain of the paper. 

I was reading earlier about Robert Pattinson, about his recent work in *Primetime* and the seven-minute ovation that filled the Venice hall. The reports from *The Hindu* and *The Statesman* describe it as a singular, crushing intensity. They speak of the performance as if it were a physical object one could hold. I find myself wondering if he felt the weight of that silence as we feel the weight of a held pose in *Varnam*.

Pattinson mentioned in an interview with *The Guardian* that he felt he had ‘twice as much time’ after the birth of his child. That struck me. Time, for a dancer, is not a linear progression. It is something you carve out of the rehearsal hours, a hollow space you fill with precision and breath. The applause is a shock to the system, a sudden fracture in the quiet architecture of the performance.

When we are mid-rehearsal, the outside world—the headlines, the film festivals, the changing seasons—feels like static on a radio. We are anchored by the brass bells around our ankles, the *ghungroo*. They are cold, heavy, and unforgiving. If you miss a beat, they do not lie. They make a dull, metallic thud instead of a sharp, resonant ring. That is the only feedback that matters in the dark of a hall at midnight.

I think about the Chris Hansen character Pattinson inhabits in *Primetime*. To hold an audience for seven minutes in a state of suspended animation, to make them forget the seats beneath them and the air conditioning humming above, that is the same craft as the dancer who holds a single, agonizing balance. It is the art of the frame. You build a cage of tension and then, with a subtle shift of the eyes or a drop of the hand, you unlock it.

There is a danger in this. You risk becoming the frame yourself. You forget the texture of the tea in your mug; you forget the way the rain sounds against the corrugated tin roof of the studio. You become nothing but the posture. I have watched friends leave the stage and walk into the street, unable to shed the character they spent hours building. They move through traffic with a strange, stylized gait, their shoulders still set to the music of the *mridangam*.

I look down at my feet. My toes are calloused, the skin toughened from years of friction against the wood. The jasmine is wilting on the windowsill, its edges turning a bruised, translucent brown. Outside, the city is shifting into the early hours of the morning, the streetlights casting long, amber shadows across the pavement. 

I wonder if Pattinson, once the lights go down in Venice and the crowd disperses, feels the same ache in his joints. Does he look for the exit as a relief, or does he mourn the loss of that fragile, shared silence? I pick up my pen, but the ink has dried. I watch a moth circle the lamp above me, its wings beating a soft, erratic tempo against the glass.

---

#silence #culture #heritage #traditions #regionalmemoir

#writon`;

    it('rejects draft with invented dancer biography and metric drift under Rules 89-94', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Persistence of the Frame',
        content: rejectedDraft,
        category: 'Culture',
        persona: { penName: 'meera_varma', fullName: 'Meera Varma', isPractitioner: false }
      });

      expect(res.isValid).toBe(false);
      const ruleNames = res.violations.map(v => v.rule);
      expect(ruleNames).toContain('PERSONA_BIOGRAPHY_INVENTION_FAIL');
      expect(ruleNames).toContain('NUMBER_MEANING_DRIFT_FAIL');
      expect(ruleNames).toContain('CULTURAL_TECHNIQUE_INVENTION_FAIL');
      expect(ruleNames).toContain('UNSOURCED_CRITICAL_CONSENSUS_FAIL');
      expect(ruleNames).toContain('CROSS_TRADITION_DECORATIVE_GATE');
      expect(ruleNames).toContain('GLOBAL_CULTURE_PROP_COOLDOWN');
    });

    it('passes calibrated cultural criticism essay "What the Clapping Cannot Measure" cleanly', () => {
      const calibratedEssay = `When the premiere of *Primetime* concluded at the Venice Film Festival, the stopwatch began.

The festival dispatches reported a standing ovation lasting seven minutes—reports ranged from roughly seven to nine minutes. In festival journalism, the duration of applause functions as an immediate, quasi-objective index of artistic triumph. It is recorded with the precision of a sprint: minutes and seconds logged to demonstrate that a hall full of evening clothes and international critics remained on their feet, beating their palms together in unison.

The film stars Robert Pattinson in a dramatized portrayal of *To Catch a Predator* host Chris Hansen, tracking online predators through calculated confrontation. In conversations surrounding the festival, Pattinson noted the peculiar temporal distortion of his recent working year: after the birth of his child, he remarked to *The Guardian* that he felt as though he had "twice as much time," managing a compressed schedule of high-stakes productions while domestic boundaries forced him to stay home.

That phrase catches my attention because performance culture is obsessed with measuring time from the outside.

A standing ovation gives an audience a measurable metric: seven minutes. Reviews offer adjectives; box office ledgers record transactions; streaming platforms measure completion percentages down to the second. A dance critic can describe rhythmic precision, tempo, phrasing, and whether movement resolves cleanly into the cycle.

Yet the metric always arrives after the performance has already evaporated.

The seven minutes in Venice did not measure Pattinson’s acting while it was occurring inside the frame. The acting existed within the shot—in the vocal restraint, the calibrated stillness of the gaze, what the film presents as the moral ambiguity of turning a crusade for justice into television spectacle. The seven minutes belonged entirely to the room afterward: a collective social release, an institutional ritual where an audience converts its private attention into public noise.

This conversion always leaves a gap. We can measure how long an auditorium claps. We cannot use that number to recover what the work cost the performer, or what any individual spectator experienced while watching. In any disciplined performance tradition—whether an actor confronting a camera or an audience watching an intricate solo recital—the work finishes in the body long before the crowd decides when to sit back down.

The dispatch can tell us that Venice stood for seven minutes. It cannot tell us where the performance went when the lights came up.

---

#culture #filmcriticism #performance #venicefilmfestival #cinematicarts #audiencerituals

#writon`;

      const res = validateZeroAISlopEngineBlockers({
        title: 'What the Clapping Cannot Measure',
        content: calibratedEssay,
        category: 'Culture',
        persona: { penName: 'meera_varma', fullName: 'Meera Varma', isPractitioner: false }
      });

      expect(res.isValid).toBe(true);
      expect(res.violations).toHaveLength(0);
    });

    it('enforces Rules 95-97 (CULTURAL_TECHNICAL_DETAIL_GATE, BIOGRAPHICAL_PORTRAYAL_ACCURACY_FAIL, CRITICAL_INTERIORITY_PROJECTION_FAIL)', () => {
      // 1. CULTURAL_TECHNICAL_DETAIL_GATE
      const pedanticDanceContent = `In classical dance, a connoisseur checks if the dancer anticipates it by a fraction of a matra.`;
      const resGate = validateZeroAISlopEngineBlockers({
        title: 'Matra Test',
        content: pedanticDanceContent,
        category: 'Culture'
      });
      expect(resGate.violations.map(v => v.rule)).toContain('CULTURAL_TECHNICAL_DETAIL_GATE');

      // 2. BIOGRAPHICAL_PORTRAYAL_ACCURACY_FAIL
      const inaccurateRoleContent = `The film stars Robert Pattinson as a fictionalized investigative journalist modeled on Chris Hansen.`;
      const resRole = validateZeroAISlopEngineBlockers({
        title: 'Pattinson Primetime',
        content: inaccurateRoleContent,
        category: 'Culture'
      });
      expect(resRole.violations.map(v => v.rule)).toContain('BIOGRAPHICAL_PORTRAYAL_ACCURACY_FAIL');

      // 3. CRITICAL_INTERIORITY_PROJECTION_FAIL
      const interiorityProjectionContent = `I wonder if Pattinson, once the lights go down, feels the same ache in his joints and mourns the loss of that fragile, shared silence.`;
      const resInteriority = validateZeroAISlopEngineBlockers({
        title: 'Interiority Test',
        content: interiorityProjectionContent,
        category: 'Culture'
      });
      expect(resInteriority.violations.map(v => v.rule)).toContain('CRITICAL_INTERIORITY_PROJECTION_FAIL');
    });
  });

  describe('30. THINK BRAIN RULES 98-102: MARKET EVENT STATUS & REPORTED ESSAY INTEGRITY (PRIYANKA MISHRA)', () => {
    const rejectedDraft = `Subodh’s thumb smears grease across his phone screen. He sits under a rusted tin awning near Kedar Ghat. The air smells of wet river silt and hot mustard oil from a nearby kachori stall. On his screen, numbers flicker in a private messaging group. They are not official market quotes. They are the shadows of trades yet to happen. 

This is the grey market. Here, men trade the promise of shares before the stock exchange ever rings its bell. 

"Pranav Constructions is moving," Subodh says. He does not look up. He talks to his tea glass. 

The company’s IPO has just opened for subscription, and the grey market premium is already shifting under the pressure of quiet bids. For Subodh, these numbers are more real than the rain. He has three different demat accounts open on his phone, each registered to a different family member. He is waiting for the allocation. 

Behind him, the river flows. It is wide, grey, and completely indifferent to the premium. 

Speculation is not new to these alleys. For generations, merchants here have wagered on the arrival of cotton boats, the yield of mustard crops, and the purity of unrefined silver. But those trades involved physical things you could touch, weigh, or smell. Today, the speculation is built on anticipation. The Grey Market Premium, or GMP, is a measure of greed and anxiety boiled down to a single figure. 

> "The premium is just the price of impatience," Subodh mutters. "People want to taste the sweet before the feast is even laid out."

This week is crowded. Twelve different companies are lining up to enter the public markets. Rentomojo and Pranav Constructions are leading the informal grey market race. The sheer volume of these unlisted transactions dwarfs the old ledger books kept by the brass-turners of Peetal Nagri. It is a parallel current, swift and silent. 

Even older listings linger in the conversation. Subodh remembers Priority Jewels. Their grey market premium had held steady at forty-five rupees back in late August. He had missed that boat. He does not want to miss the next one, especially with the massive National Stock Exchange IPO looming on the horizon, its GMP tracked daily by retail investors on portals like IPO Watch. 

He takes a sip of his tea. It is sweet, heavily spiced with ginger. 

To his left, an old man in a handloom dhoti is counting brass coins. He is paying for a clay cup of water. The contrast is sharp. One man is trading thousands of rupees of unallocated paper based on whispers; the other is balancing copper against clay. 

In the grey market, trust is the only currency. There is no clearinghouse. No regulatory board will step in if a dealer in Ahmedabad or Kanpur decides to back out of a handshake deal. If the listing day brings a crash instead of a premium, the losses are settled in cash behind closed doors, away from the digital eyes of the regulators. It is a system of honor among speculators, as fragile as dry leaf plates. 

The rain stops. The tin roof drips steadily into a puddle at Subodh’s feet. 

He closes the messaging app. The screen goes black, reflecting his own face against the grey backdrop of the river. The numbers have paused for the afternoon. On the water, a single wooden boat glides past the stone steps. The boatman’s oars make no sound as they dip into the river.`;

    it('rejects ungrounded eyewitness essay with stale market states under Rules 98-102', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Shadow Premium',
        content: rejectedDraft,
        category: 'Essays',
        persona: { penName: 'priyanka_mishra', fullName: 'Priyanka Mishra' }
      });

      expect(res.isValid).toBe(false);
      const ruleNames = res.violations.map(v => v.rule);
      expect(ruleNames).toContain('MARKET_EVENT_STATUS_LOCK');
      expect(ruleNames).toContain('REPORTED_ESSAY_FICTION_HYBRID_FAIL');
      expect(ruleNames).toContain('FINANCIAL_MECHANISM_BINDING');
      expect(ruleNames).toContain('HISTORICAL_PARALLEL_FAIL');
      expect(ruleNames).toContain('SYMBOLIC_CONTRAST_STAGING_FAIL');
    });

    it('rejects drafts violating rules 103-106 (ASBA freeze, T+3 timeline, decorative geography, collapsed GMP)', () => {
      const draftWithCollapses = `*Varanasi, September 7, 2026*

Along the stone steps above Kedar Ghat, the conversation between the morning tea stalls is rarely about philosophy. It is about allotment.

Before an exchange ever rings its opening bell, an unofficial price has already taken shape.

GMP represents the informal price difference at which traders and speculators are willing to deal in unallotted application rights or pre-listing shares outside recognized stock exchanges. Beside the official primary market—with its ASBA bank freezes—sits this parallel engine.

In household bidding, the five-day lag between subscription close and exchange listing feels interminable. Yet that price discovery is entirely unprotected.`;

      const res = validateZeroAISlopEngineBlockers({
        title: 'The Shadow Premium',
        content: draftWithCollapses,
        category: 'Essays',
        persona: { penName: 'priyanka_mishra', fullName: 'Priyanka Mishra' }
      });

      expect(res.isValid).toBe(false);
      const ruleNames = res.violations.map(v => v.rule);
      expect(ruleNames).toContain('FINANCIAL_TERM_BOUNDARY');
      expect(ruleNames).toContain('FINANCIAL_MECHANISM_BINDING');
      expect(ruleNames).toContain('REGULATORY_TIMELINE_LOCK');
      expect(ruleNames).toContain('DECORATIVE_PERSONA_GEOGRAPHY_FAIL');
      expect(ruleNames).toContain('FINANCIAL_RISK_WORDING');
    });

    it('passes calibrated analytical essay "The Shadow Premium" cleanly', () => {
      const calibratedEssay = `*September 7, 2026*

Before an exchange ever rings its opening bell, an unofficial price has already taken shape.

In the second week of September, twelve initial public offerings opened across the Indian capital markets. In financial reporting by *Business Standard*, two names led the informal pre-listing tracking tables: Rentomojo and Pranav Constructions. The number drawing attention across financial portals was not simply the company's price band or published financial statements. It was an unofficial metric: the Grey Market Premium (GMP).

For Pranav Constructions, which opened its subscription book on September 7, the informal market indicated a premium hovering around thirty-five percent over its issue price. 

GMP compresses a messy collection of expectations into one unofficial number: the premium over an IPO's issue price at which its shares are being valued in the grey market before listing. It is neither an exchange quotation nor a guaranteed listing price. Around it sits a related market in IPO applications, including *kostak* and *subject-to-sauda* arrangements. In a *kostak* agreement, a buyer pays for an application regardless of whether shares are allotted; in *subject-to-sauda*, payment depends strictly on an allotment occurring.

Beside the official primary market—with its SEBI-mandated disclosures, funds blocked through ASBA, demat linkages, and a regulated basis of allotment—sits this parallel price-discovery engine. It operates through personal networks, informal dealer networks, and off-exchange agreements.

Why does an investor care about an unofficial quote attached to shares that are not yet traded?

Perhaps the premium is partly the price of impatience: the amount people are willing to pay to turn tomorrow's uncertainty into today's number. In some households, eligible family members submit separate applications through their own PAN-linked demat and bank accounts, giving the household more than one independent chance at allotment. Yet the few working days between subscription close, allotment, and exchange listing feel interminable. The shadow market satisfies a psychological demand before the formal market can deliver an outcome.

Those transactions sit outside the settlement, grievance-redressal and investor-protection mechanisms available on recognized exchanges. Settlement therefore depends heavily on the dealer network and counterparties honoring their informal agreements. If market sentiment turns or an issue lists at a discount, there is no exchange guarantee to absorb a counterparty default.

The shares are not yet trading on an exchange screen. Yet thousands of people can already tell you what they think they are worth.

---

#marketmechanisms #finance #priceaction #economicpsychology #capitalmarkets

#writon`;

      const res = validateZeroAISlopEngineBlockers({
        title: 'The Shadow Premium',
        content: calibratedEssay,
        category: 'Essays',
        persona: { penName: 'priyanka_mishra', fullName: 'Priyanka Mishra' }
      });

      expect(res.violations, `Expected no violations but got: ${JSON.stringify(res.violations)}`).toEqual([]);
      expect(res.isValid).toBe(true);
    });
  });

  describe('31. THINK BRAIN RULES 110-114: PERSONA LOCATION LOCK & THEMATIC COUNTEREVIDENCE (DR. SUNITA BANERJEE)', () => {
    const rejectedDraft = `The brass clock on my desk clicks at sixty-second intervals. Outside, grey clouds linger low over Kolkata, but on the glass panel of my screen, the indices stand still. There are no shifting green arrows. No red cascades.

The search string "is us market closed today" tops search trends this morning, September 7, 2026, as millions of users meet a sudden wall of digital quiet.

The answer, reported across outlets like *Livemint* and *Yahoo Finance*, is straightforward: American equity markets are closed for Labor Day. The New York Stock Exchange and Nasdaq have silenced their trading floors for twenty-four hours.

We live inside a financial metronome that rarely skips a beat. When it does, the quiet feels heavy, almost accidental.

Consider what Labor Day once demanded. In the late nineteenth century, union marches down New York’s Broadway were not merely about wage floors or factory safety. They were an assertion of temporal sovereignty. Eight hours for work, eight hours for rest, eight hours for what we will. It was a physical line drawn in iron and steam against the endless extraction of human muscle.

Today, valuation operates without steam. High-frequency algorithms parse sentiment in microseconds, seeking arbitrage across continents. The market is no longer just a venue for capital; it has become an ambient pulse, a baseline measurement of world-speed that we consult like the weather.

When that pulse drops out on a Monday, a curious vacuum remains. As *Upstox* and the *Detroit Free Press* note in their market summaries, institutional trading desks sit dark while the rest of the world’s economic gears turn in low gear. The absence of price discovery for a single day creates an involuntary pause.

I pick up a brass fountain pen. The nib draws a thin wet trail of indigo ink across cream paper before drying to a dull, muted navy.

In my university lectures on comparative literature, we examine how early twentieth-century writers treated time. Virginia Woolf and James Joyce recorded individual minds struggling against the mechanical striking of Big Ben or church bells. Today, our master clock is not a bell tower. It is the ticker. It tells us not merely what hour it is, but what everything on earth is worth at this exact second.

There is a subtle relief in an uncounted hour. Without the live charts, attention slips back into the room. The scent of black tea steaming in a porcelain cup. The weight of an old clothbound volume on the desk. The cool grain of teak under palm.

Tomorrow, at half-past nine in Manhattan, the opening bell will sound. The screens will flicker back to life, and the relentless arithmetic of global trade will restart. But for today, the wires carry only quiet.

### Sources
- *Livemint*: https://news.google.com/rss/articles/CBMixwFBVV95cUxPeWY1Q2NuZ0RibnpNektPTEp2VDMwdjBjZnVlOGFna0hyNDh1Q0NpZmYySlI3X04wajBrUEc2Z1B0TG9DX2dhT2hqSXBYVEhEaXlXcElzTWJFeHY5ZGhFdU5ESVRvSVZTcjBKUWp5Ti1LLVpfeXJuaksxUkV5bkZTZGxJamhfbHlHb0VSZURnLXF1QWpiRmtxSTZTSUVuWE1HbllsLWtSYjhRTHVxa0tuVmRWSEZWZU10ZHU0YWMxUTFiNlZ2aDk00gHMAUFVX3lxTE5uVDIxeUR5bzMzcDROTXphUEJTQ1owRGRTdkVWZWJ3ZjdvOTNUWUVOTFJoY1V4d0haaDJLcWhwbXI4bkhyQTFObXNCWFVYeWFJWUFqNWF6SHRPdU0yMEljT2lRV3RiUjlNQi1CbVg0NU4xNzJhWG0xeXhVTlByT3ZmR1BzbTFBSG13ZXN2U1M0V3hpUmpkcV9XcnRMTXdiOWxNaVZvUHUyX2tEN0szeWlxMkxsRnR6ZzBXVDRfMVNLWGR1bGxGcEQtM3JJUg?oc=5
- *Yahoo Finance*: https://news.google.com/rss/articles/CBMilwFBVV95cUxPb3RIYTBubGxwUUxBRTRiNm9uTG5uampkdXpSRFJ5QkdLSGJXYU9DaDRMWHRCYUFvQlRLT3NrbGU0b3h2Y2J5U3EtSW9ydkdIb1psRG9hVTVyR1c2WTJUQzhBaW9vWVdYeURQSWxtSTFmSFpsWlkzYU9qUGxKbVQ2d1k4OW4tV1JWblNLaUgzZXV2dDVDUkpV?oc=5
- *Upstox*: https://news.google.com/rss/articles/CBMi8AFBVV95cUxQVXlKNTlTRGVHLU5SbE1pQjBsY1R3Zi1PY29TeDFPZTJhTllQa0dHdlA3dngyWGtpLXU2bmp0UEZWMDRuWHZmOGlQclNXQ1NraUdnZGFfRzBaLVdjbkpkYnB4clBfNGI4TmhreldQdG1RZmdHN196S2ZVTE1kVGFiRF9ydWYzd1VpSHhhWFNUeUZhZk95V2xJQnU1d1VBRDd1RjgzUFgwLWFNWXNiRTZEd2hHWlFxOVBHNzNPTENuX0ZlNFNTQVM0UUFYdjU4SmNHSi14NF9vWWVWZllSVU1fXzUtaFFER0ZTMlRpOW1raEg?oc=5
- *Detroit Free Press*: https://news.google.com/rss/articles/CBMiwgFBVV95cUxOU1VEcG16d1lKRTZaLU11cTdWN0pHZW0teUxIZExwdnU2UDh3d29CM3dkb1cxblc5Unl5S1lNVUZ4aUFCUWJZUFpIdGJwdFFQbFlzcDVmQldBdml6X1E5c3ZVS0ZxLU1sWWRRQTVlb2UzX0FMY2I0MVJmNnhkZ1hBeGlpZ190bXVhT3ducnpxQ0pwUHFSeVZfZmdPUnhfU0F5aGxtSXhtWEZtS0hjd0d1Rk5JY19KRDBDWU8zeTA4U3diQQ?oc=5`;

    it('rejects flawed Sunita draft under Rules 110-114 (location drift, closure scope, causal compression, counterevidence gate, prop saturation)', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Silent Exchange: On Labor, Speed, and the Pause',
        content: rejectedDraft,
        category: 'Essays',
        persona: { penName: 'sunita_banerjee', fullName: 'Dr. Sunita Banerjee' }
      });

      expect(res.isValid).toBe(false);
      const ruleNames = res.violations.map(v => v.rule);
      expect(ruleNames).toContain('PERSONA_LOCATION_LOCK');
      expect(ruleNames).toContain('MARKET_CLOSURE_SCOPE_FAIL');
      expect(ruleNames).toContain('AUDIENCE_CIRCULATION_CLAIM_FAIL');
      expect(ruleNames).toContain('HISTORICAL_CAUSAL_COMPRESSION_FAIL');
      expect(ruleNames).toContain('THEMATIC_COUNTEREVIDENCE_GATE');
      expect(ruleNames).toContain('PERSONA_PROP_SATURATION');
    });

    it('passes calibrated essay "Who Gets to Pause on Labor Day?" cleanly', () => {
      const calibratedEssay = `*September 7, 2026*

Financial outlets began the week answering a simple question: is the U.S. stock market closed today?

The answer was straightforward: regular equity trading sessions on the New York Stock Exchange and Nasdaq were suspended for Labor Day. For investors and market watchers accustomed to the second-by-second flicker of equity indices, the calendar offered an administrative interruption.

The labor movement that produced the holiday in the late nineteenth century also fought over something more fundamental than wages: control over time. The campaign for an eight-hour workday—dividing the day into work, rest, and personal life—was an effort to establish physical boundaries against uninterrupted industrial extraction. That wider labor movement eventually succeeded in turning Labor Day itself into law.

Yet the modern financial market has created its own temporal architecture. In university seminars on comparative literature, we examine how modernist writers like Virginia Woolf and James Joyce registered the tyranny of public timekeepers—the striking of Big Ben or parish bells measuring individual lives from above. Today, our master clock is no longer a municipal bell tower. It is the continuous electronic ticker. It tells us, second by second, what financial markets are willing to pay for thousands of claims on the future.

When regular trading halts on a Monday, it is tempting to treat the quiet as a shared social pause—an hour when modern acceleration relents. But that reflection quickly encounters a harder reality.

The stock exchange closes for Labor Day, yet many workers still report for shifts. Retail employees ring up purchases; grocery workers restock shelves; restaurant and travel workers serve a holiday public. The financial system pauses equity clearing while other markets, including some futures and overseas venues, continue on their own schedules. Meanwhile, consumer-facing infrastructure remains fully active because halting it would be economically inconvenient.

At half-past nine in Manhattan, no opening bell sounds. Across the country, grocery stores and retailers are already doing business. The holiday does not suspend labor. It reveals which kinds of labor our institutions are prepared to suspend.

### Sources
- *Livemint*: https://news.google.com/rss/articles/CBMixwFBVV95cUxPeWY1Q2NuZ0RibnpNektPTEp2VDMwdjBjZnVlOGFna0hyNDh1Q0NpZmYySlI3X04wajBrUEc2Z1B0TG9DX2dhT2hqSXBYVEhEaXlXcElzTWJFeHY5ZGhFdU5ESVRvSVZTcjBKUWp5Ti1LLVpfeXJuaksxUkV5bkZTZGxJamhfbHlHb0VSZURnLXF1QWpiRmtxSTZTSUVuWE1HbllsLWtSYjhRTHVxa0tuVmRWSEZWZU10ZHU0YWMxUTFiNlZ2aDk00gHMAUFVX3lxTE5uVDIxeUR5bzMzcDROTXphUEJTQ1owRGRTdkVWZWJ3ZjdvOTNUWUVOTFJoY1V4d0haaDJLcWhwbXI4bkhyQTFObXNCWFVYeWFJWUFqNWF6SHRPdU0yMEljT2lRV3RiUjlNQi1CbVg0NU4xNzJhWG0xeXhVTlByT3ZmR1BzbTFBSG13ZXN2U1M0V3hpUmpkcV9XcnRMTXdiOWxNaVZvUHUyX2tEN0szeWlxMkxsRnR6ZzBXVDRfMVNLWGR1bGxGcEQtM3JJUg?oc=5
- *Yahoo Finance*: https://news.google.com/rss/articles/CBMilwFBVV95cUxPb3RIYTBubGxwUUxBRTRiNm9uTG5uampkdXpSRFJ5QkdLSGJXYU9DaDRMWHRCYUFvQlRLT3NrbGU0b3h2Y2J5U3EtSW9ydkdIb1psRG9hVTVyR1c2WTJUQzhBaW9vWVdYeURQSWxtSTFmSFpsWlkzYU9qUGxKbVQ2d1k4OW4tV1JWblNLaUgzZXV2dDVDUkpV?oc=5
- *Upstox*: https://news.google.com/rss/articles/CBMi8AFBVV95cUxQVXlKNTlTRGVHLU5SbE1pQjBsY1R3Zi1PY29TeDFPZTJhTllQa0dHdlA3dngyWGtpLXU2bmp0UEZWMDRuWHZmOGlQclNXQ1NraUdnZGFfRzBaLVdjbkpkYnB4clBfNGI4TmhreldQdG1RZmdHN196S2ZVTE1kVGFiRF9ydWYzd1VpSHhhWFNUeUZhZk95V2xJQnU1d1VBRDd1RjgzUFgwLWFNWXNiRTZEd2hHWlFxOVBHNzNPTENuX0ZlNFNTQVM0UUFYdjU4SmNHSi14NF9vWWVWZllSVU1fXzUtaFFER0ZTMlRpOW1raEg?oc=5
- *Detroit Free Press*: https://news.google.com/rss/articles/CBMiwgFBVV95cUxOU1VEcG16d1lKRTZaLU11cTdWN0pHZW0teUxIZExwdnU2UDh3d29CM3dkb1cxblc5Unl5S1lNVUZ4aUFCUWJZUFpIdGJwdFFQbFlzcDVmQldBdml6X1E5c3ZVS0ZxLU1sWWRRQTVlb2UzX0FMY2I0MVJmNnhkZ1hBeGlpZ190bXVhT3ducnpxQ0pwUHFSeVZfZmdPUnhfU0F5aGxtSXhtWEZtS0hjd0d1Rk5JY19KRDBDWU8zeTA4U3diQQ?oc=5

---

#laborday #work #markets #time #essays #economiclife

#writon`;

      const res = validateZeroAISlopEngineBlockers({
        title: 'Who Gets to Pause on Labor Day?',
        content: calibratedEssay,
        category: 'Essays',
        persona: { penName: 'sunita_banerjee', fullName: 'Dr. Sunita Banerjee' }
      });

      expect(res.violations, `Expected no violations but got: ${JSON.stringify(res.violations)}`).toEqual([]);
      expect(res.isValid).toBe(true);
    });
  }); // closes Suite 31 (Sunita Labor Day)
}); // closes outer describe

describe('Zero AI Slop Engine — Suites 32–33 (Devansh Roy)', () => {
  describe('32. THINK BRAIN RULES 118–123: SPORTS BROADCAST BINDING, SURFACE REALISM, TITLE CONTRACT, DEVANSH PROP COOLDOWN & VIGNETTE DETECTION', () => {
    // Rule 118: SPORTS_VIEWING_TIME_BINDING
    it('118. SPORTS_VIEWING_TIME_BINDING — flags 4am Kolkata with live score updates and no replay tag', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Second Set at the Corner Shop',
        content: `Bimal found the replay on Sunday evening. He wanted to watch the US Open match before anyone spoiled it. The shop was quiet.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).toContain('SPORTS_REPLAY_CHRONOLOGY');
    });

    it('124. SPORTS_REPLAY_CHRONOLOGY — passes when replay is on Tuesday after a Monday match', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Second Set at the Corner Shop',
        content: `Bimal found the replay a little after midnight on Tuesday. The US Open match had been played Monday afternoon New York time. The neighbourhood had already seen it on their phones.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).not.toContain('SPORTS_REPLAY_CHRONOLOGY');
    });

    // Rule 125: SPORTS_POINT_DETAIL_GATE
    it('125. SPORTS_POINT_DETAIL_GATE — flags unsupported intra-game claim', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'Match Story',
        content: `Potapova was going to break serve in the fourth game. He knew this now and watched her do it.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).toContain('SPORTS_POINT_DETAIL_GATE');
    });

    it('125. SPORTS_POINT_DETAIL_GATE — passes with set-level description only', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'Match Story',
        content: `Bimal now knew that Andreeva would eventually take the second set 6–4. He watched the first rally anyway.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).not.toContain('SPORTS_POINT_DETAIL_GATE');
    });

    // Rule 126: REAL_BRAND_UI_INVENTION
    it('126. REAL_BRAND_UI_INVENTION — flags invented ESPN ticker format description', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'Match Story',
        content: `The crawl that ESPN runs continuously along the bottom of the screen displayed the result in white capitals.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).toContain('REAL_BRAND_UI_INVENTION');
    });

    it('126. REAL_BRAND_UI_INVENTION — passes with generic fictional interface', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'Match Story',
        content: `A results crawl appeared along the bottom of the sports channel. Pradeep saw it first.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).not.toContain('REAL_BRAND_UI_INVENTION');
    });

    // Rule 127: THEME_ALREADY_DRAMATIZED_FAIL
    it('127. THEME_ALREADY_DRAMATIZED_FAIL — flags post-climax philosophical gloss', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Corner Shop',
        content: `He switched off the television. He was not sure what that meant about replays and information and delay. The room was quiet.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).toContain('THEME_ALREADY_DRAMATIZED_FAIL');
    });

    it('127. THEME_ALREADY_DRAMATIZED_FAIL — passes when ending is behavioral with no restatement', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Corner Shop',
        content: `He reached over and switched off the cable box. On his phone, the unopened score notification was still waiting.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).not.toContain('THEME_ALREADY_DRAMATIZED_FAIL');
    });

    // Rule 128: DEVANSH_SUCCESS_PATTERN
    it('128. DEVANSH_SUCCESS_PATTERN — flags behavioral consequence followed by philosophical monologue', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Corner Shop',
        content: `Bimal decided to turn off the screen. He was not sure what that meant for information and experience and the distance between the two. He was quiet for a long time.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).toContain('DEVANSH_SUCCESS_PATTERN');
    });

    it('128. DEVANSH_SUCCESS_PATTERN — passes with behavioral consequence and no philosophical monologue', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Corner Shop',
        content: `Bimal reached over and switched off the cable box. Pradeep let himself out. The notification on the phone was still unread.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).not.toContain('DEVANSH_SUCCESS_PATTERN');
    });

    // Full repaired calibrated draft passes all rules
    it('Calibrated repaired draft passes all Devansh rules (86/100 → approved story)', () => {
      const repairedStory = `# The Second Set at the Corner Shop

Bimal found the replay a little after midnight on Tuesday. He had missed the match live — he had been unloading delivery crates all Monday afternoon — and by the time he sat down with the cable box, the whole neighbourhood had already seen it on their phones.

He knew this about the neighbourhood. He locked the front shutter to three-quarters closed and turned the set on.

The first customer arrived at twelve forty. Shankar from the chemist's, who still wore his work shirt.

"Andreeva won," Shankar said, by way of greeting.

"You are not coming in," Bimal said.

Shankar looked at the gap in the shutter. "I can see the screen from here."

"The screen is not for you. Go home."

Shankar stayed at the gap. "She took the second set 6–4 after Potapova—"

"Stop." Bimal moved a plastic crate in front of the shutter gap. The crate made it worse. Shankar simply stepped to the left.

"Potapova injured her knee late in the third," Shankar said. "Andreeva went around the net to—"

Bimal turned the volume to maximum.

The second customer arrived at one fifteen. His name was Pradeep and he had seen the score on his phone on the way back from the pharmacy. He had not seen the match itself, only the result, so he said he was neutral.

"Neutral means you don't know things I don't know," Bimal said.

"I only know who won."

"That is the only thing I don't want to know."

Pradeep considered this. "So you want to watch a match knowing that uncertainty is false?"

"I want to watch a match."

Pradeep sat down. He was quiet for four minutes. The screen showed the first set. Potapova taking it 7–5. The shop was quiet in the way that only replays are quiet — the crowd noise real, the tension borrowed, the result already written somewhere in everyone's pocket.

A results crawl appeared along the bottom of the sports channel. Pradeep saw it first. He looked at Bimal. Bimal was watching the match, not the crawl.

Then Bimal saw it: ANDREEVA def. POTAPOVA 5–7, 6–4, 6–3.

The second set was beginning on screen. Bimal now knew that Andreeva would eventually take it 6–4. He watched the first rally anyway. The information and the event arrived in the same frame. For thirty seconds he watched knowing, and the experience was identical in every visible way to the thirty seconds before — and entirely different in the one way that mattered.

He reached over and switched off the cable box.

"That's it?" Pradeep said.

"That's it," Bimal said.

On Bimal's phone, the unopened score notification was still waiting.`;

      const res = validateZeroAISlopEngineBlockers({
        title: 'The Second Set at the Corner Shop',
        content: repairedStory,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });

      expect(res.violations, `Expected no violations but got: ${JSON.stringify(res.violations)}`).toEqual([]);
      expect(res.isValid).toBe(true);
    });
  });
});


describe('Zero AI Slop Engine — Suite 33 (Devansh Roy, Rules 124–128)', () => {
  describe('33. THINK BRAIN RULES 124–128: REPLAY CHRONOLOGY, POINT DETAIL GATE, BRAND UI INVENTION, THEME RESTATEMENT & DEVANSH SUCCESS PATTERN', () => {
    // Rules 124-128 derived from the 86/100 editorial review of "The Second Set at the Corner Shop"

    it('118. SPORTS_VIEWING_TIME_BINDING — flags 4am Kolkata with live score updates and no replay tag', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Second Set at the Corner Shop',
        content: `It is 4:00 a.m. in Kolkata. Bimal watches the screen. The score updates. Andreeva takes the US Open second set.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).toContain('SPORTS_VIEWING_TIME_BINDING');
    });

    it('118. SPORTS_VIEWING_TIME_BINDING — passes when replay is explicitly established', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Second Set at the Corner Shop',
        content: `Bimal found the replay at 4:00 a.m. in Kolkata. He had missed it live. He did not want to know the score. He wanted to watch it not knowing. Someone already knew. That was the problem.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).not.toContain('SPORTS_VIEWING_TIME_BINDING');
    });

    // Rule 119: SPORT_SURFACE_REALISM
    it('119. SPORT_SURFACE_REALISM — flags clay dust on a US Open hard court scene', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'US Open Night',
        content: `She hits the line at the US Open. The dust kicks up. The crowd gasps.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).toContain('SPORT_SURFACE_REALISM');
    });

    it('119. SPORT_SURFACE_REALISM — passes without clay-surface details on a US Open scene', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'US Open Night',
        content: `She hits the line at the US Open. The ball skids low and stays. The crowd gasps. No one moved.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).not.toContain('SPORT_SURFACE_REALISM');
    });

    // Rule 121: DEVANSH_PROP_COOLDOWN
    it('121. DEVANSH_PROP_COOLDOWN — flags 3+ recurring Kolkata corner-shop props', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Corner Shop',
        content: `The tram tracks glistened. The ceiling fan wobbled overhead. Bimal set down the cold tea in a clay cup. The chipped rim held the heat.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).toContain('DEVANSH_PROP_COOLDOWN');
    });

    it('121. DEVANSH_PROP_COOLDOWN — passes with a fresh spatial context', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Replay',
        content: `Bimal had found a plastic chair near the door. The television was bolted high on the wall, a cable running crooked to the dish on the roof. He had seen this before — the match already decided, the score already somewhere in his phone — but he refused to look. He wanted the replay to remain a question for ten more minutes. Then Rakesh walked in.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).not.toContain('DEVANSH_PROP_COOLDOWN');
    });

    // Rule 122: DEVANSH_LENS_ENFORCEMENT
    it('122. DEVANSH_LENS_ENFORCEMENT — flags a Devansh story with no transmission conflict', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Corner Shop',
        content: `Bimal watched the television. The fan turned slowly. He poured tea. Outside, the street was quiet. He turned the television off. The silence was louder than the match had been.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).toContain('DEVANSH_LENS_ENFORCEMENT');
    });

    it('122. DEVANSH_LENS_ENFORCEMENT — passes when transmission conflict is present', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Replay',
        content: `Bimal did not want anyone to spoil it. He had already forbidden Rakesh from saying the result. The notification was already on his phone — he had seen the preview before swiping it away. But he had not opened it. He wanted to watch the second set not knowing.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).not.toContain('DEVANSH_LENS_ENFORCEMENT');
    });

    // Rule 123: SHORT_STORY_VIGNETTE_FAIL
    it('123. SHORT_STORY_VIGNETTE_FAIL — flags a short vignette with no desire or conflict', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'Night Scene',
        content: `He sat in the dim room. The television flickered. Outside it rained. He finished his tea and turned off the light. The city was quiet and enormous.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).toContain('SHORT_STORY_VIGNETTE_FAIL');
    });

    it('123. SHORT_STORY_VIGNETTE_FAIL — passes when story has want and conflict', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Second Set at the Corner Shop',
        content: `Bimal forbade anyone from saying the score. Rakesh refused to agree. The argument started quietly and grew until the notification flashed on the screen ticker and everyone in the shop saw it at once. Bimal decided then: he switched off the television. That was the end of the argument and the end of the replay.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).not.toContain('SHORT_STORY_VIGNETTE_FAIL');
    });

    // Rule 124: SPORTS_REPLAY_CHRONOLOGY
    it('124. SPORTS_REPLAY_CHRONOLOGY — flags Sunday replay of a Monday US Open match', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Second Set at the Corner Shop',
        content: `Bimal found the replay on Sunday evening. He wanted to watch the US Open match. The shop was quiet.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).toContain('SPORTS_REPLAY_CHRONOLOGY');
    });

    it('124. SPORTS_REPLAY_CHRONOLOGY — passes when replay is on Tuesday after a Monday match', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Second Set at the Corner Shop',
        content: `Bimal found the replay a little after midnight on Tuesday. The US Open match had been played Monday. The neighbourhood had already seen it on their phones.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).not.toContain('SPORTS_REPLAY_CHRONOLOGY');
    });

    // Rule 125: SPORTS_POINT_DETAIL_GATE
    it('125. SPORTS_POINT_DETAIL_GATE — flags unsupported intra-game claim', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'Match Story',
        content: `Potapova was going to break serve in the fourth game. He knew this now and watched her do it.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).toContain('SPORTS_POINT_DETAIL_GATE');
    });

    it('125. SPORTS_POINT_DETAIL_GATE — passes with set-level description only', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'Match Story',
        content: `Bimal now knew that Andreeva would eventually take the second set 6–4. He watched the first rally anyway.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).not.toContain('SPORTS_POINT_DETAIL_GATE');
    });

    // Rule 126: REAL_BRAND_UI_INVENTION
    it('126. REAL_BRAND_UI_INVENTION — flags invented ESPN ticker format description', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'Match Story',
        content: `The crawl that ESPN runs continuously along the bottom of the screen displayed the result in white capitals.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).toContain('REAL_BRAND_UI_INVENTION');
    });

    it('126. REAL_BRAND_UI_INVENTION — passes with generic fictional interface', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'Match Story',
        content: `A results crawl appeared along the bottom of the sports channel. Pradeep saw it first.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).not.toContain('REAL_BRAND_UI_INVENTION');
    });

    // Rule 127: THEME_ALREADY_DRAMATIZED_FAIL
    it('127. THEME_ALREADY_DRAMATIZED_FAIL — flags post-climax philosophical gloss', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Corner Shop',
        content: `He switched off the television. He was not sure what that meant about replays and information and delay. The room was quiet.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).toContain('THEME_ALREADY_DRAMATIZED_FAIL');
    });

    it('127. THEME_ALREADY_DRAMATIZED_FAIL — passes when ending is behavioral with no restatement', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Corner Shop',
        content: `He reached over and switched off the cable box. On his phone, the unopened score notification was still waiting.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).not.toContain('THEME_ALREADY_DRAMATIZED_FAIL');
    });

    // Rule 128: DEVANSH_SUCCESS_PATTERN
    it('128. DEVANSH_SUCCESS_PATTERN — flags behavioral consequence followed by philosophical monologue', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Corner Shop',
        content: `Bimal decided to turn off the screen. He was not sure what that meant for information and experience and the distance between the two.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).toContain('DEVANSH_SUCCESS_PATTERN');
    });

    it('128. DEVANSH_SUCCESS_PATTERN — passes with behavioral consequence and no philosophical monologue', () => {
      const res = validateZeroAISlopEngineBlockers({
        title: 'The Corner Shop',
        content: `Bimal reached over and switched off the cable box. Pradeep let himself out. The notification on the phone was still unread.`,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });
      const codes = res.violations.map(v => v.rule);
      expect(codes).not.toContain('DEVANSH_SUCCESS_PATTERN');
    });

    // Calibrated repaired story (86/100 micro-repairs applied) passes all rules
    it('Calibrated repaired story passes all rules 118–128', () => {
      const repairedStory = `# The Second Set at the Corner Shop

Bimal found the replay a little after midnight on Tuesday. He had missed the match live — he had been unloading delivery crates all Monday afternoon — and by the time he sat down with the cable box, the whole neighbourhood had already seen it on their phones.

He knew this about the neighbourhood. He locked the front shutter to three-quarters closed and turned the set on.

The first customer arrived at twelve forty. Shankar from the chemist's, who still wore his work shirt.

"Andreeva won," Shankar said, by way of greeting.

"You are not coming in," Bimal said.

Shankar looked at the gap in the shutter. "I can see the screen from here."

"The screen is not for you. Go home."

Shankar stayed at the gap. "She took the second set 6–4 after Potapova—"

"Stop." Bimal moved a plastic crate in front of the shutter gap. The crate made it worse. Shankar simply stepped to the left.

"Potapova injured her knee late in the third," Shankar said. "Andreeva went around the net to—"

Bimal turned the volume to maximum.

The second customer arrived at one fifteen. His name was Pradeep and he had seen the score on his phone on the way back from the pharmacy. He had not seen the match itself, only the result, so he said he was neutral.

"Neutral means you don't know things I don't know," Bimal said.

"I only know who won."

"That is the only thing I don't want to know."

Pradeep considered this. "So you want to watch a match knowing that uncertainty is false?"

"I want to watch a match."

Pradeep sat down. He was quiet for four minutes. The screen showed the first set. Potapova taking it 7–5. The shop was quiet in the way that only replays are quiet — the crowd noise real, the tension borrowed, the result already written somewhere in everyone's pocket.

A results crawl appeared along the bottom of the sports channel. Pradeep saw it first. He looked at Bimal. Bimal was watching the match, not the crawl.

Then Bimal saw it: ANDREEVA def. POTAPOVA 5–7, 6–4, 6–3.

The second set was beginning on screen. Bimal now knew that Andreeva would eventually take it 6–4. He watched the first rally anyway. The information and the event arrived in the same frame. For thirty seconds he watched knowing, and the experience was identical in every visible way to the thirty seconds before — and entirely different in the one way that mattered.

He reached over and switched off the cable box.

"That's it?" Pradeep said.

"That's it," Bimal said.

On Bimal's phone, the unopened score notification was still waiting.`;

      const res = validateZeroAISlopEngineBlockers({
        title: 'The Second Set at the Corner Shop',
        content: repairedStory,
        category: 'Short Stories',
        persona: { penName: 'devansh_roy', fullName: 'Devansh Roy' }
      });

      expect(res.violations, `Expected no violations but got: ${JSON.stringify(res.violations)}`).toEqual([]);
      expect(res.isValid).toBe(true);
    });
  }); // closes Suite 33 inner describe
}); // closes Suite 33 outer describe
