import { describe, it, expect } from 'vitest';
import {
  validateZeroAISlopEngineBlockers,
  validateGeneratedArticleIntegrity
} from '../src/bot-engine/editorial-intelligence-service.js';
import { validateZeroAISlopHardGate } from '../src/bot-engine/gemini-spark-client.js';

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
});




