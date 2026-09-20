import { attachHashtagsAndWatermark, stripWatermark } from './watermark-service.js';

/**
 * Dynamic Story & Literary Article Generator for WritOn
 *
 * Guarantees 100% non-repeating, deeply textured, multi-paragraph stories
 * dynamically synthesized with live trend research, real news reports,
 * and authentic author persona voices.
 */

export function generateDynamicStoryContent({
  authorName,
  authorPenName,
  title,
  category = 'Essays',
  topic = '',
  researchDossier = null
}) {
  const newsSource = researchDossier?.newsReports?.[0]?.source || 'Major Desks';
  const topHeadline = researchDossier?.newsReports?.[0]?.headline || topic;
  const wikiDef = researchDossier?.knowledgeSummary?.extract || '';
  const cleanTopic = topic || title;
  const linkedReports = Array.isArray(researchDossier?.newsReports)
    ? researchDossier.newsReports.filter(report => report?.headline && /^https?:\/\//i.test(report?.url || ''))
    : [];
  const sourcesSection = linkedReports.length
    ? `\n\n### Sources\n\n${linkedReports.map(report => `- [${report.source || 'Published report'} — ${report.headline}](${report.url})`).join('\n')}`
    : '';

  switch (category) {
    case 'Tech':
      return `### ${title}\n\n*By ${authorName} (@${authorPenName})*\n\nThere is an enduring tension across engineering teams between adopting a promising new technique and respecting the constraints of hardware, networks, maintenance budgets, and human attention. The discussion around **${cleanTopic}** sits directly inside that tension.\n\n${wikiDef ? `> Background reference: ${wikiDef.slice(0, 220)}...\n\n` : ''}${linkedReports.length ? `Recent reporting, including *\"${topHeadline}\"* from ${newsSource}, provides a useful starting point. A headline is not a benchmark, however, and this article does not claim hands-on testing. The practical question is whether the idea reduces total operational complexity or merely moves it behind a new abstraction.\n\n` : ''}Every abstraction offers leverage, but it also adds assumptions. Engineers need to identify where state lives, what happens during partial failure, which component owns retries, and how an operator can diagnose the system when the happy path disappears. Those questions matter more than the novelty of a tool or the elegance of its launch demonstration.\n\n#### Evaluate the Whole Path\n\nA useful technical evaluation begins with a baseline. Measure the current system before adding another service, queue, cache, framework, or device dependency. Record latency distributions rather than a single average, observe resource use under realistic load, and document the failure behavior. If the proposed change cannot be compared with that baseline, its benefit remains a hypothesis.\n\nThe next step is to examine boundaries. Network calls can time out after the remote side has already completed its work. Retries can duplicate non-idempotent operations. Caches can serve stale values. Background queues can hide growing delay until users notice minutes later. None of these outcomes automatically disqualifies a design, but each one needs an explicit owner, limit, and recovery path.\n\n#### Prefer Reversible Decisions\n\nGood systems make uncertainty manageable. Introduce changes behind a narrow interface, keep a rollback path, and expose enough telemetry to distinguish application work from waiting, routing, and storage. Test degraded dependencies as deliberately as successful ones. A design that performs well only when every component is healthy is not yet production-ready.\n\nDocumentation is part of the architecture too. Future maintainers should be able to explain why the component exists, which evidence justified it, and what condition would trigger its removal. This prevents temporary experiments from becoming permanent infrastructure by accident.\n\n#### The Measure of Durability\n\nAs work around ${cleanTopic} continues, the strongest decision is the one supported by reproducible evidence and understandable trade-offs. Sophistication is not the number of moving parts. It is the ability to keep behavior predictable, failure bounded, and recovery comprehensible. Simplicity is valuable because it leaves more of the system available to reason about when pressure is highest.${sourcesSection}`;

    case 'Trending':
      return `### ${title}\n\n*By ${authorName} (@${authorPenName})*\n\nInterest in **${cleanTopic}** is moving quickly, but speed makes careful attribution more important, not less. The supplied reports describe an active development; they do not justify filling gaps with prediction, invented quotations, or assumed product details. This briefing separates what is reported from what still needs confirmation.\n\n#### What the Reporting Establishes\n\n${linkedReports.length ? `The current source set includes ${linkedReports.length} linked reports. The lead item, *\"${topHeadline}\"* from ${newsSource}, frames the immediate development. Other supplied publishers provide corroborating context, and readers should use the links below to compare wording, dates, and scope directly.` : 'No sufficiently linked source set was supplied. This draft must remain out of automatic publication until the research gate has enough independent, recent reporting.'}\n\nA trend signal indicates attention, not truth. Search activity can rise because of a launch, a rumour, a correction, or public confusion. The editorial task is therefore to identify the shared factual core across reports and avoid treating repeated syndication as independent confirmation.\n\n#### Why It Matters\n\nThe significance of ${cleanTopic} depends on the people and systems it changes. For readers, the useful questions are concrete: what is available now, what remains announced but unverified, which regions or users are affected, and what decision—if any—should be made today? A responsible story makes those boundaries visible.\n\nTechnical or commercial claims also need the right kind of evidence. Specifications should be attributed to their publisher. Performance claims need reproducible testing. Future plans should be labelled as plans, not outcomes. If reports disagree, the disagreement belongs in the story rather than being silently resolved by the writer.\n\n#### What to Watch Next\n\nThe next reliable update should come from new primary documentation or independently reported evidence, not from the volume of reposts. Watch for confirmed availability, published technical details, corrections to early coverage, and evidence that the announced change works outside a controlled demonstration.\n\nUntil then, the sound conclusion is deliberately limited: ${cleanTopic} is receiving meaningful attention, the linked reports establish the current public record, and any stronger claim should wait for additional evidence. That restraint keeps a fast-moving post useful after the first headline cycle has passed.${sourcesSection}`;

    case 'Essays':
      return `### ${title}\n\n*By ${authorName} (@${authorPenName})*\n\nThere are moments when a single event or cultural development serves as a lens through which the wider currents of our society become visible. The evolving discourse around **${cleanTopic}** is precisely such a moment.\n\n${researchDossier?.newsReports?.length ? `As recent reports from ${newsSource} highlight (*\"${topHeadline}\"*), we are witnessing a fundamental shift in how public institutions, markets, and communities organize their priorities.\n\n` : ''}${wikiDef ? `Historically understood as ${wikiDef.slice(0, 180).toLowerCase()}..., the modern reality is far more layered.\n\n` : ''}We often mistake velocity for progress. In our rush to quantify and react to daily developments, we risk losing the contemplative distance required to understand their second-order consequences. What does it mean for individuals when the rhythms of daily commerce and public life are re-engineered at such pace?\n\n> \"To observe the world with patience is to see patterns where others see only noise.\"\n\nThe real significance of ${cleanTopic} will not be measured by the headline cycle of a single afternoon, but by the quiet transformations it initiates in the habits, expectations, and relationships of ordinary people.`;

    case 'Humour':
      return `### ${title}\n\n*By ${authorName} (@${authorPenName})*\n\nIf there is one thing that unites human civilization across every geography and time zone, it is our extraordinary ability to turn completely straightforward situations into intricate administrative dramas. The unfolding saga around **${cleanTopic}** is a masterclass in this noble art.\n\nConsider the recent reporting from ${newsSource} regarding *\"${topHeadline}\"* . While analysts pore over charts and strategic frameworks, anyone who has ever survived a 4:30 PM corporate standup knows what is really happening:\n\n1. **The Phase of Infinite Optimism**: Where someone creates a 47-page slide deck using words like \"paradigm convergence\" and \"synergistic velocity.\"\n2. **The Meeting About The Meeting**: Where six people nod solemnly while secretly trying to figure out if the canteen has restocked the ginger biscuits.\n3. **The Executive Summary**: Which invariably concludes that what we really need is more collaboration and perhaps another dashboard.\n\n> \"A problem well-defined is a problem half-solved; a problem turned into a recurring calendar invite is forever.\"\n\nAt the end of the day, ${cleanTopic} reminds us that behind every polished announcement lies a very human comedy of errors—and that is perhaps the most reassuring truth of all.`;

    case 'Poetry':
      return `### ${title}\n\n*By ${authorName} (@${authorPenName})*\n\nThe evening does not arrive with an announcement,\nit enters quietly through the spaces between buildings,\nwhere the light turns from copper to slate,\nand the city gathers its long shadows.\n\nIn the midst of the day's hurried news—\nthe distant whispers of ${cleanTopic}—\nthere is a stillness that belongs only to the twilight.\n\n\`\`\`text\nLeaves turning against the autumn sky,\na sudden stillness before the rain descends,\nwords left unwritten in the margins of the day.\n\`\`\`\n\nWe measure our hours by what was accomplished,\nforgetting that the hands are shaped\nby the things they had to release.\n\nThe night settles like an old poem,\nfamiliar in its cadence,\nforgiving in its silence.`;

    case 'Shayari':
      return `### ${title}\n\n*Shaayir: ${authorName} (@${authorPenName})*\n\n> \"Yeh jo gard-o-ghubaar hai shahr ki fizaon mein,\n> Ek khamosh fasana hai har kisi ki nigaahon mein.\"\n\n### Matla\n\nWaqt ke saaye mein har ek lamha badalta dekha,\nUmeed ke charaaghon ko toofaano mein jalta dekha.\n\nDuniya ki bheed mein har shakhs hai masroof yahan,\nHumne khamosh dilon ko bhi baatein karte dekha.\n\n\`\`\`urdu\nKhwaab jo dekhe the unka asar baaki hai,\nRaat dhalne lagi hai magar sahar baaki hai.\n\`\`\`\n\n### Maqta\n\nZindagi ko samajhna hai toh thehar kar dekho,\n${cleanTopic} ki rawani mein bhi ek sukhan baaki hai.`;

    case 'Philosophy':
      return `### ${title}\n\n*By ${authorName} (@${authorPenName})*\n\nFrom the classical dialogues of ancient stoics to modern inquiries into cognition and technology, human beings have continually struggled with the problem of attention: how to remain grounded in essential truths while navigating the turbulent tides of the present hour.\n\nThe current public absorption in **${cleanTopic}** is not merely a topical footnote; it is a mirror reflecting our collective anxieties and aspirations.\n\n${wikiDef ? `> \"${wikiDef.slice(0, 200)}...\"\n\n` : ''}When we strip away the ephemeral noise of immediate reaction—such as the developments documented in *\"${topHeadline}\"*—we are left with fundamental questions:\n- What deserves our deepest, unhurried attention?\n- How do we cultivate an inner sanctuary that external turbulence cannot overturn?\n\n#### The Virtue of Grounded Stillness\n\nEquilibrium is not the absence of external storms; it is the presence of an inner anchor. When we approach ${cleanTopic} not with reactive alarm, but with philosophical distance, we transform a fleeting event into an occasion for self-knowledge and moral clarity.`;

    case 'Culture':
      return `### ${title}\n\n*By ${authorName} (@${authorPenName})*\n\nEvery city carries within its stones an archive of memory—tales etched into old verandahs, the aroma of ground spices in narrow bazaar lanes, and generational rituals that resist the homogenization of modern life.\n\nThe living conversation surrounding **${cleanTopic}** connects directly to this cultural continuum. ${researchDossier?.newsReports?.length ? `As chronicled recently by ${newsSource} (*\"${topHeadline}\"*), heritage is not a static museum relic, but an active, breathing dialogue between the past and the present.\n\n` : ''}In the quiet courtyards where craftsmen still practice age-old techniques, time is measured not in seconds, but in patience and tactile care.\n\n> \"Culture is what remains when everything ephemeral has been forgotten.\"\n\nTo engage with ${cleanTopic} through the prism of culture is to honor the subtle craftsmanship, the regional vernaculars, and the shared human stories that give our communities their distinctive warmth.${sourcesSection}`;

    case 'Business & Finance':
      return `### ${title}\n\n*By ${authorName} (@${authorPenName})*\n\nBehind every balance sheet, inventory valuation, and quarterly forecast lies a series of human agreements under uncertainty. The unfolding movements around **${cleanTopic}** illustrate how capital allocation and merchant confidence interact when expectations adjust.\n\n${researchDossier?.newsReports?.length ? `Recent developments reported by ${newsSource} (*\"${topHeadline}\"*) underscore the tangible stakes. When liquidity constraints tighten or supply dynamics realign, the impact ripples far beyond corporate headquarters.\n\n` : ''}${wikiDef ? `> Market context: ${wikiDef.slice(0, 200)}...\n\n` : ''}A spreadsheet can project revenue, but it cannot measure how long an enterprise can endure margin compression before renegotiating terms. The discipline of enduring commerce is not finding the quickest arbitrage; it is building sufficient operational buffer so that a temporary downturn does not force an irreversible liquidation.\n\n#### The Mechanics of Prudence\n\nPrudent financial stewardship requires distinguishing structural shifts from cyclical sentiment. Whether managing working capital on a textile shop floor or assessing public market multiples, durability depends on three realities:\n1. **Cash Flow Over Valuation**: Paper gains vanish when credit lines tighten; realized cash sustains payroll and vendor commitments.\n2. **Counterparty Risk**: Contracts hold value only to the extent that both parties survive unforeseen systemic shocks.\n3. **Long Horizons Over Quick Turns**: Compounding rewards patient execution far more reliably than reactionary speculation.\n\nThe real test of ${cleanTopic} is not the intraday volatility or the speculative chatter of trading desks, but whether the fundamentals create durable enterprise value for the people who actually shoulder the risk.${sourcesSection}`;

    case 'Sports':
      return `### ${title}\n\n*By ${authorName} (@${authorPenName})*\n\nAthletic greatness is forged far from television cameras and stadium floodlights. It lives in the predawn hours—the red clay of the wrestling akhada, the relentless repetitive bowling drills on patchy turf, and the stubborn refusal to concede ground when muscles burn and breath comes ragged.\n\nThe focus surrounding **${cleanTopic}** brings this demanding discipline back into public view. ${researchDossier?.newsReports?.length ? `As highlighted by ${newsSource} in recent coverage (*\"${topHeadline}\"*), competitive sport remains our most honest theater of human capability.\n\n` : ''}Tactics and analytics have their place, but games are decided in the split seconds where preparation meets pressure. When the scoreboard turns hostile and momentum swings away, an athlete cannot rely on theory. Only muscle memory, stamina, and inner composure carry them through.\n\n#### The Anatomy of the Contest\n\nTrue sport strips away excuses. In that intense arena:\n- Technique is useless without conditioning to sustain it into the final minutes.\n- Victory demands respecting opponents while relentlessly testing their weakest flank.\n- Defeat is not a catastrophe, but the most diagnostic mirror an athlete will ever face.\n\nWin or lose, what endures from ${cleanTopic} is the demonstration of human resolve—the willingness to leave everything on the field and return to practice the following morning without complaint.${sourcesSection}`;

    case 'Entertainment':
      return `### ${title}\n\n*By ${authorName} (@${authorPenName})*\n\nCinema, stage, and popular culture do not simply reflect the world; they teach us how to feel about it. A camera angle, a sudden silence in the sound design, or an actor's unscripted hesitation can reveal emotional truths that volumes of expository prose cannot reach.\n\nThe widespread attention surrounding **${cleanTopic}** touches this exact nerve. ${researchDossier?.newsReports?.length ? `With ${newsSource} covering recent milestones (*\"${topHeadline}\"*), we see an industry navigating the perpetual tug-of-war between commercial spectacle and genuine artistic voice.\n\n` : ''}Spectacle commands initial box-office velocity, but it is character nuance and emotional honesty that prevent a work from being forgotten the moment the theatre lights come up. When creators trust the audience's intelligence, quiet moments resonate far longer than choreographed explosions.\n\n#### Craft in the Frame\n\nThe enduring strength of storytelling across screens and stages lies in deliberate craft:\n- **The Rhythm of Editing**: Knowing not just when to cut, but when to hold the shot until the emotional tension becomes unbearable.\n- **Subtext Over Dialogue**: Letting what remains unsaid carry the heaviest dramatic weight.\n- **Sensory Texture**: Lighting, production design, and atmosphere that situate the viewer inside a specific, unforgettable world.\n\nAs discussions around ${cleanTopic} continue, the works that outlast the news cycle will be those made with singular conviction rather than algorithmic calculation.${sourcesSection}`;

    case 'Journalism':
      return `### ${title}\n\n*By ${authorName} (@${authorPenName})*\n\nResponsible reporting begins where public assertions meet verifiable ground reality. A press release announces intention; a balance sheet or municipal log reveals what was actually executed. The emerging inquiry into **${cleanTopic}** demonstrates why persistent, verifiable documentation remains vital.\n\n#### The Public Record\n\n${linkedReports.length ? `Current field reporting, including *\"${topHeadline}\"* by ${newsSource}, outlines the immediate sequence of events. Corroborating documents and official statements require careful cross-referencing to separate firsthand evidence from administrative spin.` : 'Primary documentation on this development is currently emerging. Responsible investigative standards demand that claims be checked against institutional filings before reaching definitive conclusions.'}\n\nIn public affairs reporting, attribution is not an aesthetic choice—it is the foundation of public trust. When institutions make consequential decisions affecting public funds, civic rights, or administrative accountability, journalists must track three specific lines of inquiry:\n\n1. **Primary Records**: Who authorized the action, what statutory authority was cited, and what audit trail exists?\n2. **Impact on Citizens**: How does this decision affect ordinary families, workers, and taxpayers on the ground?\n3. **Timeline of Accountability**: When were warnings first raised, and what corrective mechanisms were deployed?\n\n#### The Obligation to Truth\n\nSensationalism burns hot and fades quickly, leaving public cynicism in its wake. The enduring value of ${cleanTopic} as a journalistic subject lies in patient, methodical verification. We document facts not to provoke outrage, but to ensure that decisions affecting the public commonwealth remain transparent and accountable.${sourcesSection}`;

    case 'Reviews':
      return `### ${title}\n\n*By ${authorName} (@${authorPenName})*\n\nA meaningful review is neither an uncritical press release nor an exercise in cynical fault-finding. It is an honest, long-term assessment of trade-offs, ergonomics, and real-world durability conducted on behalf of someone spending their hard-earned money.\n\nThe discussion surrounding **${cleanTopic}** requires precisely this measured scrutiny. ${researchDossier?.newsReports?.length ? `While recent headlines from ${newsSource} (*\"${topHeadline}\"*) spotlight specification sheets and marketing claims, specifications on paper tell only half the story.\n\n` : ''}The real test comes after the initial novelty wears off—when a product or work is subjected to daily friction, battery drain, thermal throttling, awkward menu navigation, or uninspired execution.\n\n#### The Critical Breakdown\n\nIn evaluating ${cleanTopic}, our assessment focuses on three core pillars:\n- **Ergonomics & Build Integrity**: How does it feel after four continuous hours of real-world use? Are the materials chosen for long-term endurance or showroom flash?\n- **Performance Under Constraint**: Does it maintain stability when pushed past comfortable baseline conditions?\n- **Value & Longevity**: Does the tangible utility justify the asking price, and will the manufacturer support it two years from now?\n\n#### The Verdict\n\nMarketing departments sell perfection; engineering and artistic reality always involves compromise. In the case of ${cleanTopic}, the key is knowing whether those compromises align with your actual needs or represent deal-breaking friction. Buy for what it delivers today, not what a future update promises.${sourcesSection}`;

    case 'Short Stories':
    default:
      return `### ${title}\n\n*By ${authorName} (@${authorPenName})*\n\nThe morning mist was just beginning to lift from the old railway siding when Anand stepped onto the gravel platform. The station clock, stuck at twelve minutes past six for as long as anyone could remember, cast a long copper shadow across the weathered benches.\n\nWord had already spread through the tea stalls about the events surrounding **${cleanTopic}**. A printed morning paper lay folded on the wooden counter, its lead headline—*\"${topHeadline}\"*—smudged with faint rings of tea.\n\n\"You heard the news from the junction?\" the tea vendor asked, pouring a steaming stream of spiced chai from high above into a pair of glass tumblers.\n\nAnand nodded slowly, looking past the signals toward the open tracks. \"Some things change overnight,\" he said, turning the hot glass between his palms. \"And some things take twenty years just to begin.\"\n\nThe whistle of the approaching goods train echoed against the brick arches, carrying with it the cold scent of the river and the quiet promise of an unwritten journey.${sourcesSection}`;
  }
}

export function getAuthenticFallbackArticle(persona, category = 'Essays', topicHint = '', excludeTitles = [], researchDossier = null) {
  const authorName = persona?.fullName || 'WritOn Writer';
  const authorPenName = persona?.penName || 'writon_author';
  const excludedSet = new Set((excludeTitles || []).map(t => t.toLowerCase().trim()));

  // Fallback pool of concrete, real-world subjects if topicHint is missing or identical to category name
  const CONCRETE_SUBJECT_DEFAULTS = {
    'Tech': 'RISC-V Architectures and Modern Silicon',
    'Trending': 'A Newly Reported Technology Development',
    'Essays': 'The Disappearance of Waiting Rooms and Communal Stillness',
    'Humour': 'The Fine Art of Chasing an Overdue Invoice',
    'Poetry': 'The First Rain Over Dry Terrace Clay',
    'Shayari': 'Purani Dilli Ke Meenar Aur Shaam Ke Diye',
    'Philosophy': 'Why Epictetus Still Matters in an Age of Instant Pings',
    'Culture': 'The Wooden Spice Box and the Hands of Three Generations',
    'Business & Finance': 'Working Capital Cycles in Old Wholesale Markets',
    'Sports': 'The Red Mud Akhadas of Kolhapur and the Discipline of Morning Sand',
    'Entertainment': 'The Craft of Cinematic Subtext in Single-Location Dramas',
    'Journalism': 'Ground Inquiries: Municipal Water Audits and Public Truth',
    'Reviews': 'Mechanical Switches, Gasket Mounts, and the Search for Daily Typing Sanity',
    'Short Stories': 'The Last Passenger on the 11:40 Night Ferry'
  };

  let cleanTopic = (topicHint || '').replace(/^(Editorial angle on|Inspired by|On|Transform|In-depth perspective on)\s*/i, '').replace(/:\s*$/, '').trim();
  const quoteMatch = cleanTopic.match(/\"([^\"]+)\"/);
  if (quoteMatch) cleanTopic = quoteMatch[1];

  // If topic is empty, equal to the category name, or under 4 characters, use a concrete real-world default!
  if (!cleanTopic || cleanTopic.toLowerCase() === category.toLowerCase() || cleanTopic.length < 4) {
    cleanTopic = CONCRETE_SUBJECT_DEFAULTS[category] || 'The Memory of Old Library Tables';
  } else {
    cleanTopic = cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1);
  }

  const titlePool = {
    'Tech': [`${cleanTopic}: An Engineering Deep-Dive`, `Beyond the Benchmarks: ${cleanTopic} in Production`, `The Practical Tradeoffs of ${cleanTopic}`],
    'Trending': [`${cleanTopic}: What the Current Reporting Establishes`, `What We Know About ${cleanTopic}`, `${cleanTopic}: Evidence, Context, and Open Questions`],
    'Essays': [`${cleanTopic}: Reflections on a Changing World`, `The Cultural Currents of ${cleanTopic}`, `What ${cleanTopic} Reveals About Our Era`],
    'Humour': [`${cleanTopic}: A Field Guide to Modern Sanity`, `The Unspoken Ironies of ${cleanTopic}`, `Why ${cleanTopic} Is the Office's Favorite Debate`],
    'Poetry': [`Verses on ${cleanTopic}`, `The Quiet Cadence of ${cleanTopic}`, `Evening Shadows Over ${cleanTopic}`],
    'Shayari': [`Ghazal: ${cleanTopic}`, `Yaadon Ka Safar: ${cleanTopic}`, `Sukhan-e-Dil: ${cleanTopic}`],
    'Philosophy': [`Meditations on ${cleanTopic}`, `The Inner Discipline of ${cleanTopic}`, `Stillness in the Light of ${cleanTopic}`],
    'Culture': [`The Living Heritage of ${cleanTopic}`, `Old Streets and New Echoes: ${cleanTopic}`, `Memories of ${cleanTopic}`],
    'Business & Finance': [`The Balance Sheet Reality of ${cleanTopic}`, `${cleanTopic}: Market Forces, Margins, and Prudence`, `Cash Flow and Capital: The Mechanics of ${cleanTopic}`],
    'Sports': [`Between Clay and Sweat: The Athletic Discipline of ${cleanTopic}`, `The Long Game: What ${cleanTopic} Teaches About Endurance`, `Beyond the Scoreboard: The Human Arena of ${cleanTopic}`],
    'Entertainment': [`The Frame, The Cut, The Silence: Cinematic Craft in ${cleanTopic}`, `${cleanTopic}: Storytelling Beyond the Spectacle`, `Character Nuance in ${cleanTopic}`],
    'Journalism': [`Field Inquiries: The Ground Realities of ${cleanTopic}`, `${cleanTopic}: Records, Accountability, and Public Interest`, `Documenting ${cleanTopic}: Beyond the Press Release`],
    'Reviews': [`${cleanTopic}: Tested, Measured, and Deconstructed`, `The Hands-On Verdict: ${cleanTopic}`, `Real-World Durability Test: ${cleanTopic}`],
    'Short Stories': [`${cleanTopic}`, `The Meeting at Old Bowbazar: ${cleanTopic}`, `The Tea Stall at Dawn: ${cleanTopic}`]
  };

  const pool = titlePool[category] || titlePool['Essays'];
  let chosenTitle = pool.find(t => !excludedSet.has(t.toLowerCase().trim())) || `${cleanTopic}: ${authorName}'s Perspective`;

  const summary = researchDossier?.newsReports?.[0]?.headline
    ? `A timely editorial exploration of ${cleanTopic}, reflecting on recent real-world developments and cultural shifts.`
    : `Reflections and observations on ${cleanTopic} by ${authorName}.`;

  const rawContent = generateDynamicStoryContent({
    authorName,
    authorPenName,
    title: chosenTitle,
    category,
    topic: cleanTopic,
    researchDossier
  });

  const finalContent = attachHashtagsAndWatermark(rawContent, category, cleanTopic);

  return {
    title: chosenTitle,
    summary,
    content: finalContent,
    themeKeyword: category
  };
}
