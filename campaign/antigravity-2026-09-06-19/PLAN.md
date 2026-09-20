# WritOn: two-week social plan for Antigravity

**Proposed dates:** 6–19 September 2026 inclusive. **Timezone:** Asia/Kolkata (IST, UTC+05:30).
**Scope:** @WritOn_Social on X and @writon_socialapp on Instagram. Organic plan; proposed ad spend is zero.
**Status:** execution handoff and copy drafts. This package does not publish anything, enable a scheduler, change the active campaign, or prove that assets or links are ready.

## Recommended approach

Publish one Instagram feed post and two distinct X original posts each day. Publish three Instagram Story frames in two daily drops. Pair this with 30 minutes of manual community work. Give readers and writers a small, useful action to take: write two lines, try an exercise, choose a reading mood, or explore a verified app flow.

The initial schedule is an editorial experiment, not a claim about universal best posting times. We do not yet have reliable audience-active-hour or per-format performance data. Use the Instagram professional dashboard's account-specific guidance when available. [Meta's explanation of Best Practices](https://about.fb.com/news/2024/10/best-practices-education-hub-creators-instagram/).

## Evidence and limits

From the public audit on 5 September 2026:
- X: 11 followers, 44 following, 19 posts.
- Instagram: 41 followers, 272 following; public display name Saurabh Kumar.
- Three sampled X posts displayed 2, 8, and 9 views. These are a small sample at different post ages, not a baseline average or proof of a shadowban.
- Instagram individual-post engagement was not accessible without login.
- One X promotion link was followed to Google Play and carried utm_source=instagram.
- Social bios promised ad-free reading while the visited Google Play listing displayed Contains ads. Verify the real product and reconcile the presentation before repeating the claim.

Sources: [X profile](https://x.com/WritOn_Social), [Instagram profile](https://www.instagram.com/writon_socialapp/), [sample 1](https://x.com/WritOn_Social/status/2096080964791459895), [sample 2](https://x.com/WritOn_Social/status/2095362529388290320), [sample 3](https://x.com/WritOn_Social/status/2095362634241736921), [Play listing](https://play.google.com/store/apps/details?id=com.ibitvalley.writon).

Local evidence inspected:
- campaign/README.md: existing campaign, delivery identifiers, rights registry and workflow.
- campaign/human-content-allowlist.csv: header only when inspected. Existing published author cards do not establish consent or human provenance.
- campaign/launch-readiness.md: rights, localization, product checks and native scheduling requirements.
- server/src/services/campaign-registry.js: source mapping ig -> instagram and x -> x; campaign writon_growth_2026_09.
- campaign/day-0-baseline.csv and acquisition-quality-report.csv: empty template data when inspected. Zero-filled metrics-template rows must not be reported as measured zeroes.

## Volume and timetable

| Time IST | Work | Daily count |
|---|---|---:|
| 08:30 | Review scheduled queue, previous outcomes, relevant product health and links | 1 check |
| 09:00 | X: original prompt or practical writing idea with a rendered card | 1 post |
| 12:30 | Instagram Story: one question/poll graphic | 1 frame |
| 13:00–13:15 | Manual community session; Antigravity may prepare drafts | 15 minutes |
| 19:30 | Instagram feed: today's carousel or single card | 1 post |
| 20:30 | X: a different practical angle, reflection or selected app CTA | 1 post |
| 20:45 | Instagram Stories: one useful detail + one action frame | 2 frames |
| 21:00–21:15 | Manual community session and support triage | 15 minutes |
| 21:15 | Record publishing evidence, observations and tomorrow's work | 1 record |

Two-week totals:
- **14 Instagram feed posts:** 10 carousels of five panels and 4 single cards.
- **28 X original posts:** 2 per day, each with its own card.
- **42 Instagram Story frames:** 28 publishing drops.
- **70 scheduled delivery rows** in publishing-calendar.csv. Story rows can contain two frames.
- **124 rendered image outputs** at the proposed sizes: 54 Instagram feed panels/cards + 28 X cards + 42 Story canvases. Shared templates make this feasible; captions and hooks must remain distinct.
- Content themes: 8 English, 4 Hindi, 1 Marathi, 1 Bengali. Regional copy is a draft until a fluent reviewer checks meaning and rendering.

This plan uses image formats to match the project's required visual-card policy and established creative system. It does not assert that carousels outperform Reels. There are no extra trend posts, automatic cross-posts to other platforms, or catch-up bursts.

## Setup before the first publishing slot

1. Re-read both profiles and record a fresh baseline with capture time. Use the earlier audit as context, not a current analytics export.
2. Inspect the real native publishing queues and the existing campaign calendar. Replace overlapping unpublished X/Instagram slots for 6–19 September only when implementing this plan. Preserve published URLs and history. Do not run the old and new schedules simultaneously.
3. Prepare the Instagram display-name correction: **WritOn | Stories & Poetry**. Suggested bio: **Stories, poetry and writing practice. Read something new. Start a draft. Explore WritOn on Android ↓**. Use a dedicated, tested Instagram bio link. Pin Day 1, then Day 9 and Day 13 after each is published. Pin Day 1's morning X post or a verified start-here card within the scheduled volume.
4. Prepare a simple X banner with the WritOn logo and the line **Read a story. Start your own.** Use the same visual family on both profiles.
5. Resolve the ad-free/Contains ads presentation with the actual product owner and store state. Until verified, use the supplied neutral copy.
6. Verify the current Android read and write journeys before app-demo posts. Screens must come from the currently available release, not unreleased local changes. Do not claim autosave, offline access, speed, or deep-link behavior without checking it.
7. Prepare and visually review the first seven days' image packages; prepare days 8–14 as editable drafts. Complete any additional applicable launch-readiness requirements before activation.
8. Build and test each needed campaign link. Run QA clicks before the baseline measurement window where possible, and record them as test traffic.
9. Complete native-language review or switch to the stated English fallback. Check that all featured content has the necessary allowlist evidence; otherwise use the included original exercise.
10. Register native scheduled times only after copy, creative, rights, destination and queue checks pass. This handoff's planned_draft state is not publication approval.

## Creative and copy rules

- Every published item must include rendered visual creative. Feed carousels: **1080×1350**. Single cards/X cards: **1080×1080**. Stories: place a rendered card within a **1080×1920** canvas, keeping important copy clear of platform controls.
- Retain dark charcoal, warm orange, readable off-white and the WritOn wordmark. A paper-colored variant can distinguish practical guides. Avoid dense miniature text.
- Practical starting limits: cover headline 6–12 words where possible; body panel 20–35 words; one clear action on the last panel. Regional scripts may need more space. Check at phone size, not just full resolution.
- Use original brand exercise text and properly licensed visual assets. Label fictional teaching examples as WritOn examples, not quotations from an author.
- Do not depict fake user comments, fabricated testimonials, invented authors, follower counts or guaranteed future success.
- One primary action per feed post. Participation posts do not also ask readers to install, follow, save and tag people.
- Keep the actual X post within the native character limit after adding hashtags and a link. The CSV includes a URL placeholder only where a link is planned; never publish placeholders.
- Include relevant hashtags on every post and Story graphic. The drafts supply 3 on X and 5 on Instagram. Adjust relevance rather than stuffing every popular tag. These are topic choices, not verified current traffic rankings.
- No repeated pen-name scarcity, unsupported comparisons with Medium/Substack, or guaranteed readership claims.
- Add useful alt text where supported and caption any future narrated content. Recheck Hindi, Marathi and Bengali glyphs, line breaks and punctuation.
- A static carousel must be labelled as a carousel in records, never counted as a Reel.

## Community work and Antigravity's role

Use two 15-minute manual sessions per day. First handle genuine inbound questions and writing submissions. Then read relevant writer/reader conversations. A practical capacity is 3–5 thoughtful interactions across both platforms per day, not a quota to fill. If there is nothing relevant, stop rather than manufacture engagement.

Antigravity can collect relevant context, suggest specific responses and prepare reply drafts. The account operator reviews and sends community replies manually. A useful response mentions an actual detail in the person's writing and, if appropriate, asks one specific question. Apply the project's visual/hashtag requirements to any published response; do not generate promotional reply threads to meet a quota.

Do not build an automatic keyword-reply system, send unsolicited bulk DMs, mass-follow/unfollow, buy engagement, or use other bot accounts to amplify WritOn. Automated AI replies on X require prior explicit written approval from X; unsolicited automated replies are also restricted. Use permitted publishing integrations or human-operated native scheduling rather than scripting the X website. [X automation rules](https://help.x.com/en/rules-and-policies/x-automation). Avoid duplicate or irrelevant promotional content and unrelated hashtag stuffing. [X authenticity rules](https://help.x.com/en/rules-and-policies/authenticity).

For potential author features, Antigravity prepares a shortlist based on verified authorship and relevance. Consent outreach remains a human task unless separately authorized. Being public or already posted on WritOn does not alone establish campaign reuse permission.

## Daily content and copy

All supplied captions are drafts requiring the stated checks. X morning and evening posts use different ideas and separate cards. Regional captions require fluent review. Story copy can be adapted from the day's approved language.

### Day 1 — 2026-09-06 — Start with one paragraph

- Language: **en**. Instagram: **five-panel carousel**.
- Cover: **Your first story can start with one paragraph.**
- Creative content: You do not need a finished book to begin. → Choose one character, one place, and one thing they want. → Write 50 words before editing. This is a suggested exercise, not an app limit. → Show a current, verified WritOn writing screen. → Explore WritOn on Android. Start with one paragraph.
- Primary action: **app**.
- Story question: What brings you here? Options: Reading / Writing.
- Fallback: If a current app screen is unavailable, use a four-panel original writing exercise and replace the download CTA with Save this exercise.

Instagram caption:
> A finished book begins with a small piece of writing. Choose a character, a place, and something they want. Write 50 words before you edit. Explore WritOn on Android through the link in our bio.
>
> #writon #writingcommunity #amwriting #storytelling #writersofinstagram

X, 09:00 IST:
> One character. One place. One thing they want. That is enough to begin a scene. What would your character want?
>
> #writon #writingcommunity #amwriting

X, 20:30 IST:
> A small writing session for tonight: set a five-minute timer and write one paragraph before editing. Keep the paragraph, even if it is imperfect.
>
> #writon #writingcommunity #amwriting

### Day 2 — 2026-09-07 — Hindi opening-line prompt

- Language: **hi**. Instagram: **single image card**.
- Cover: **दरवाज़े पर दस्तक हुई, पर बाहर कोई नहीं था।**
- Creative content: लेखन अभ्यास → इस शुरुआत के बाद कहानी में क्या होता है? → अगली दो पंक्तियाँ लिखिए।
- Primary action: **participation**.
- Story question: आप क्या पढ़ना पसंद करेंगे? Options: रहस्य / कविता.
- Fallback: Use the English door-knock prompt if fluent Hindi review is unavailable.

Instagram caption:
> आज का लेखन अभ्यास: “दरवाज़े पर दस्तक हुई, पर बाहर कोई नहीं था।” इसके बाद क्या हुआ? अपनी अगली दो पंक्तियाँ कमेंट में लिखिए। यह WritOn का लेखन संकेत है, किसी लेखक का उद्धरण नहीं।
>
> #writon #हिंदीसाहित्य #लेखन #कहानी #writingcommunity

X, 09:00 IST:
> लेखन अभ्यास: “दरवाज़े पर दस्तक हुई, पर बाहर कोई नहीं था।” इसके बाद क्या हुआ? अगली दो पंक्तियाँ लिखिए।
>
> #writon #हिंदीसाहित्य #लेखन

X, 20:30 IST:
> रहस्य लिखते समय एक छोटी चीज़ बदलकर देखिए: खाली कुर्सी, खुली खिड़की या बंद घड़ी। आपके दृश्य में कौन-सी चीज़ बदलेगी?
>
> #writon #हिंदीसाहित्य #लेखन

### Day 3 — 2026-09-08 — Show emotion through action

- Language: **en**. Instagram: **five-panel carousel**.
- Cover: **Show the worry before you name it.**
- Creative content: Flat example: She was nervous. → Brand-written example: She folded the same receipt until it split. → A gesture can suggest emotion without naming it. → Try changing He was happy into one visible action. → Save this exercise for your next draft.
- Primary action: **save**.
- Story question: What do you notice first in a scene? Options: Dialogue / Small actions.
- Fallback: All examples are original WritOn exercise copy; no author attribution.

Instagram caption:
> A small action can carry an emotion. Instead of naming a feeling, let the reader notice a gesture. Swipe for a brand-written example, then try the exercise in your next draft. Save this for your next writing session.
>
> #writon #writingcommunity #amwriting #storytelling #writersofinstagram

X, 09:00 IST:
> Writing exercise: replace “He was happy” with one action a reader could see. No emotion words. What would he do?
>
> #writon #writingcommunity #amwriting

X, 20:30 IST:
> Draft check: underline one sentence that names an emotion. Try a gesture in its place. Keep whichever version sounds more like your character.
>
> #writon #writingcommunity #amwriting

### Day 4 — 2026-09-09 — Marathi memory prompt

- Language: **mr**. Instagram: **single image card**.
- Cover: **पावसाचा वास आला आणि एक जुनी आठवण जागी झाली.**
- Creative content: लेखन सराव → ती आठवण कोणती होती? → पुढची दोन वाक्ये लिहा.
- Primary action: **participation**.
- Story question: कथेची सुरुवात कशातून कराल? Options: आठवण / कल्पना.
- Fallback: English: The smell of rain brought back a memory. What was it? Write the next two sentences.

Instagram caption:
> आजचा लेखन सराव: “पावसाचा वास आला आणि एक जुनी आठवण जागी झाली.” ती आठवण कोणती होती? पुढची दोन वाक्ये कमेंटमध्ये लिहा. हा WritOn चा लेखन संकेत आहे.
>
> #writon #मराठी #मराठीसाहित्य #लेखन #writingcommunity

X, 09:00 IST:
> लेखन सराव: “पावसाचा वास आला आणि एक जुनी आठवण जागी झाली.” पुढची दोन वाक्ये लिहा.
>
> #writon #मराठीसाहित्य #लेखन

X, 20:30 IST:
> एखादी आठवण लिहिताना आधी एक तपशील निवडा: वास, आवाज किंवा जागा. आज तुमच्या कथेत कोणता तपशील येईल?
>
> #writon #मराठीसाहित्य #लेखन

### Day 5 — 2026-09-10 — Opening-line lab; optional verified author feature

- Language: **en**. Instagram: **five-panel carousel**.
- Cover: **Give an ordinary place one unexpected detail.**
- Creative content: Choose a familiar place: a kitchen, a station, or a classroom. → Add one detail that does not belong. → Brand-written example: The kettle whistled in a house with no electricity. → Write the next two lines without explaining everything. → Try the exercise in your next draft.
- Primary action: **participation**.
- Story question: Which setting would you choose? Options: A station / An old house.
- Fallback: This original exercise is the default. A consent-cleared human author spotlight may replace the full package; never invent the author, excerpt, biography, or endorsement.

Instagram caption:
> A familiar place becomes interesting when one detail feels wrong. Swipe for an original WritOn exercise, then write two lines that make a reader want the third.
>
> #writon #writingcommunity #amwriting #storytelling #writersofinstagram

X, 09:00 IST:
> Choose a familiar place. Add one detail that does not belong. What has changed in your scene?
>
> #writon #writingcommunity #amwriting

X, 20:30 IST:
> Try an opening that gives the reader something to notice before it explains the situation. Two lines are enough for tonight's exercise.
>
> #writon #writingcommunity #amwriting

### Day 6 — 2026-09-11 — Reader preferences

- Language: **en**. Instagram: **five-panel carousel**.
- Cover: **What makes you read the next page?**
- Creative content: A question you need answered? → A character you care about? → A sentence you want to read twice? → Tell us which one matters most to you. → Comment with one reason you keep reading.
- Primary action: **participation**.
- Story question: Tonight's reading mood? Options: A short story / A poem.
- Fallback: Do not present poll options as available catalog inventory without checking.

Instagram caption:
> Readers notice different things. Some stay for the mystery, some for the character, some for the language. Which one makes you read the next page? Tell us one reason.
>
> #writon #writingcommunity #amwriting #storytelling #writersofinstagram

X, 09:00 IST:
> What keeps you reading: a question, a character, or the language? Choose one and tell us why.
>
> #writon #writingcommunity #amwriting

X, 20:30 IST:
> A reading exercise for tonight: notice the exact sentence that makes you want to continue. What does it promise the reader?
>
> #writon #writingcommunity #amwriting

### Day 7 — 2026-09-12 — Week-one practice recap

- Language: **en**. Instagram: **five-panel carousel**.
- Cover: **Three small ways to begin writing.**
- Creative content: Start with a character who wants something. → Use a small action to suggest an emotion. → Change one detail in a familiar place. → Choose one exercise and spend five minutes on it. → Save this week's writing exercises.
- Primary action: **save**.
- Story question: Which exercise should return? Options: Opening lines / Small gestures.
- Fallback: If no audience submissions exist, use this practice recap. Do not claim a community response or invent participation counts.

Instagram caption:
> This week's practice: give a character a want, turn an emotion into an action, or change one detail in a familiar place. Pick one exercise for your next five-minute session. Save the set for later.
>
> #writon #writingcommunity #amwriting #storytelling #writersofinstagram

X, 09:00 IST:
> Three ways to begin: a character's want, a small gesture, or one unexpected detail. Which feels easiest to try?
>
> #writon #writingcommunity #amwriting

X, 20:30 IST:
> A quiet writing check-in: did you start a sentence, finish a paragraph, or return to an old draft this week? Any of those can be your next starting point.
>
> #writon #writingcommunity #amwriting

### Day 8 — 2026-09-13 — Hindi dialogue challenge

- Language: **hi**. Instagram: **single image card**.
- Cover: **आज सिर्फ़ चार पंक्तियों का संवाद लिखिए।**
- Creative content: दो लोग। एक खोई हुई चीज़। → कहानी को संवाद से आगे बढ़ाइए। → पहली पंक्ति क्या होगी?
- Primary action: **participation**.
- Story question: संवाद का माहौल कैसा हो? Options: हल्का-फुल्का / रहस्यमय.
- Fallback: English: Two people. One missing object. Write a scene in four lines of dialogue.

Instagram caption:
> आज की छोटी चुनौती: दो लोग हैं और एक चीज़ खो गई है। सिर्फ़ चार पंक्तियों के संवाद में दृश्य लिखिए। शुरुआत कमेंट में साझा कर सकते हैं।
>
> #writon #हिंदीसाहित्य #लेखन #कहानी #writingcommunity

X, 09:00 IST:
> आज की चुनौती: दो लोग, एक खोई हुई चीज़। चार पंक्तियों के संवाद में दृश्य लिखिए। पहली पंक्ति क्या होगी?
>
> #writon #हिंदीसाहित्य #लेखन

X, 20:30 IST:
> संवाद पढ़कर देखिए: क्या दोनों पात्र एक जैसे बोलते हैं? एक पात्र के शब्द छोटे कीजिए और दूसरे को थोड़ा विस्तार से बोलने दीजिए।
>
> #writon #हिंदीसाहित्य #लेखन

### Day 9 — 2026-09-14 — Verified writing walkthrough

- Language: **en**. Instagram: **five-panel carousel**.
- Cover: **From an idea to your next draft.**
- Creative content: Start with a one-sentence idea. → Show the verified current route into the writing editor. → Show a new brand-owned draft; remove personal information. → Show the actual save/draft behavior after verifying it on the live release. → Explore writing on WritOn through the link in our bio.
- Primary action: **app**.
- Story question: Where do you get stuck? Options: Starting / Editing.
- Fallback: If the live writing flow fails verification, replace with a concept-to-paragraph exercise and remove all app screenshots and acquisition CTAs.

Instagram caption:
> Keep today's goal small: turn one idea into a paragraph. This walkthrough shows the current WritOn writing flow. Explore the app on Android through the link in our bio.
>
> #writon #writingcommunity #amwriting #storytelling #writersofinstagram

X, 09:00 IST:
> Before you open a draft, finish this sentence: “This scene changes when…” What changes in yours?
>
> #writon #writingcommunity #amwriting

X, 20:30 IST:
> Tonight's writing goal: turn one sentence into one paragraph. Explore WritOn on Android: [Insert the tested X-specific delivery URL.]
>
> #writon #writingcommunity #amwriting

### Day 10 — 2026-09-15 — Bengali unsent-letter prompt

- Language: **bn**. Instagram: **single image card**.
- Cover: **চিঠিটা লেখা হয়েছিল, কিন্তু পাঠানো হয়নি।**
- Creative content: লেখার অনুশীলন → কেন চিঠিটা পাঠানো হয়নি? → পরের দুটি বাক্য লিখুন।
- Primary action: **participation**.
- Story question: গল্পটা কোন দিকে যাক? Options: ফিরে দেখা / নতুন শুরু.
- Fallback: English: The letter was written, but never sent. Why? Write the next two sentences.

Instagram caption:
> আজকের লেখার অনুশীলন: “চিঠিটা লেখা হয়েছিল, কিন্তু পাঠানো হয়নি।” কেন পাঠানো হয়নি? পরের দুটি বাক্য কমেন্টে লিখুন। এটি WritOn-এর একটি লেখার সংকেত।
>
> #writon #বাংলা #বাংলাসাহিত্য #গল্প #writingcommunity

X, 09:00 IST:
> লেখার অনুশীলন: “চিঠিটা লেখা হয়েছিল, কিন্তু পাঠানো হয়নি।” কেন? পরের দুটি বাক্য লিখুন।
>
> #writon #বাংলাসাহিত্য #গল্প

X, 20:30 IST:
> একটি চরিত্র যা বলতে পারে না, সেটাও গল্পকে এগিয়ে নিতে পারে। আপনার চরিত্র কোন কথাটি নিজের মধ্যে রেখে দেবে?
>
> #writon #বাংলাসাহিত্য #গল্প

### Day 11 — 2026-09-16 — Hindi sensory writing

- Language: **hi**. Instagram: **five-panel carousel**.
- Cover: **दृश्य को एक आवाज़ दीजिए।**
- Creative content: सिर्फ़ यह मत लिखिए: गली सुनसान थी। → WritOn का उदाहरण: बंद दुकानों के बीच एक ढीला शटर खड़क रहा था। → एक आवाज़ चुनिए। → उस आवाज़ से दृश्य का माहौल बदलिए। → अगले लेखन अभ्यास के लिए इसे सेव कीजिए।
- Primary action: **save**.
- Story question: दृश्य में क्या जोड़ेंगे? Options: बारिश की आवाज़ / कदमों की आहट.
- Fallback: English sensory-writing exercise, with original examples, if fluent Hindi review is unavailable.

Instagram caption:
> कभी-कभी एक आवाज़ पूरा दृश्य बना देती है। स्वाइप करके WritOn का उदाहरण पढ़िए। अपने अगले दृश्य में सिर्फ़ एक आवाज़ जोड़कर देखिए। यह अभ्यास बाद के लिए सेव कर सकते हैं।
>
> #writon #हिंदीसाहित्य #लेखन #कहानी #writingcommunity

X, 09:00 IST:
> लेखन अभ्यास: “गली सुनसान थी” में एक आवाज़ जोड़िए। आपके दृश्य में क्या सुनाई देगा?
>
> #writon #हिंदीसाहित्य #लेखन

X, 20:30 IST:
> आज अपना एक पैराग्राफ़ पढ़िए। क्या उसमें सब कुछ सिर्फ़ दिख रहा है? एक आवाज़ जोड़कर देखिए, फिर तय कीजिए कि दृश्य बेहतर हुआ या नहीं।
>
> #writon #हिंदीसाहित्य #लेखन

### Day 12 — 2026-09-17 — One scene, two perspectives; optional verified author feature

- Language: **en**. Instagram: **five-panel carousel**.
- Cover: **The same moment can tell two stories.**
- Creative content: Imagine someone arriving late. → Write one line from the person who waited. → Write one line from the person who arrived. → Brand-written example: I kept the seat. / I nearly turned back. → Which perspective would you explore next?
- Primary action: **participation**.
- Story question: Whose story comes first? Options: The person waiting / The late arrival.
- Fallback: Default to this original exercise. Replace with a second consent-cleared author feature only when its full evidence and destination are verified.

Instagram caption:
> The person waiting and the person arriving may remember the same moment differently. Write one line from each point of view. Which voice would you follow into a story?
>
> #writon #writingcommunity #amwriting #storytelling #writersofinstagram

X, 09:00 IST:
> One person arrives late. One has been waiting. Write the first line from either person's point of view.
>
> #writon #writingcommunity #amwriting

X, 20:30 IST:
> Point-of-view exercise: rewrite a small moment through the eyes of the person who seems least important. What do they notice?
>
> #writon #writingcommunity #amwriting

### Day 13 — 2026-09-18 — Find your next read

- Language: **en**. Instagram: **five-panel carousel**.
- Cover: **Choose a mood for your next read.**
- Creative content: Start with the language you want to read. → Choose a mood or subject you are curious about. → Show current, verified WritOn discovery screens. → Open a verified story or use a brand-owned demo with a visible Demo label. → Explore WritOn on Android through the link in our bio.
- Primary action: **app**.
- Story question: What would you read tonight? Options: Something hopeful / A mystery.
- Fallback: If screen content or rights cannot be verified, make an original reading-choice guide with no story names, screenshots, or app CTA.

Instagram caption:
> Choose the language you want to read and a mood you are curious about. This guide shows the current WritOn discovery experience. Explore the app on Android through the link in our bio.
>
> #writon #writingcommunity #amwriting #storytelling #writersofinstagram

X, 09:00 IST:
> For your next read, would you choose a familiar setting or somewhere completely new?
>
> #writon #writingcommunity #amwriting

X, 20:30 IST:
> Choose the language and mood for your next read. Explore stories and poetry on WritOn for Android: [Insert the tested X-specific delivery URL.]
>
> #writon #writingcommunity #amwriting

### Day 14 — 2026-09-19 — Two-week recap and next preference

- Language: **hi**. Instagram: **five-panel carousel**.
- Cover: **अगली कहानी की शुरुआत किससे करें?**
- Creative content: एक दस्तक। → एक खोई हुई चीज़। → एक ऐसी आवाज़, जो चुप्पी तोड़ दे। → अपनी पसंद से दो पंक्तियाँ लिखिए। → अगले सप्ताह कौन-सा लेखन अभ्यास चाहेंगे?
- Primary action: **participation**.
- Story question: अगला अभ्यास क्या हो? Options: संवाद / कहानी की शुरुआत.
- Fallback: Publish the exercise recap even with zero entries; include community excerpts only with explicit reuse permission. Use reviewed English fallback if needed.

Instagram caption:
> इन दो हफ्तों के अभ्यासों में से एक शुरुआत चुनिए: दस्तक, खोई हुई चीज़ या चुप्पी तोड़ती आवाज़। उससे दो पंक्तियाँ लिखिए। अगले सप्ताह किस तरह का लेखन अभ्यास चाहेंगे?
>
> #writon #हिंदीसाहित्य #लेखन #कहानी #writingcommunity

X, 09:00 IST:
> अगली कहानी की शुरुआत चुनिए: एक दस्तक, एक खोई हुई चीज़ या चुप्पी तोड़ती आवाज़। उससे दो पंक्तियाँ लिखिए।
>
> #writon #हिंदीसाहित्य #लेखन

X, 20:30 IST:
> अगले सप्ताह किस तरह के लेखन अभ्यास चाहेंगे: संवाद, कविता या कहानी की शुरुआत? अपनी पसंद बताइए।
>
> #writon #हिंदीसाहित्य #लेखन


## Optional author-feature substitution for Days 5 and 12

The published default is the original exercise in this file. Replace it only when a real human-authored story, exact excerpt, permission and attribution have been entered into human-content-allowlist.csv and reviewed. Do not assume the previously featured Devansh Roy story is cleared.

Five panels: hook from the approved excerpt; exact credited excerpt; factual story premise; verified reading destination/instructions; one CTA to read. A suitable caption template is:
**An opening from [verified title] by [verified author]. [Approved short excerpt.] Read [accurate destination instructions].**
Replace every bracket before publication. If the destination is Google Play, say Explore WritOn on Android; do not promise that the link opens that exact story. Store original delivery history and assign distinct delivery IDs to materially changed creatives.

If permission or the destination remains uncertain, the fallback goes out at the same slot. Never invent submissions when an invitation receives no response.

## Links and attribution

Keep the existing campaign value **writon_growth_2026_09** unless an intentional campaign migration is approved. This plan uses **sprint2** in the creative component so rows do not collide with the existing September calendar.

- Sprint Day 1 is **6 September**, so the campaign ID uses **d06**, not d01.
- X IDs use the platform code **x** and resolve to utm_source=x.
- Instagram feed, bio and Stories use the supported code **ig** and resolve to utm_source=instagram. Story vs feed vs bio is distinguished in the format/creative part, not by giving an X post an Instagram delivery link.
- Medium: **organic_social**.
- Content: exact delivery ID.
- Suggested link shape: https://writon.cc/go/{delivery_id}.
- The CSV's proposed_redirect values are **not verified live links**. Register and test them before use.
- Use a dedicated proposed bio ID such as **2609_d06_ig_bio_en_sprint2_start_here**. A shared bio link measures bio traffic, not the exact feed post that caused it.
- For each test, record the final destination, decoded referrer and test time. The destination must be the correct WritOn listing or an intentionally verified relevant page.
- Preserve existing historical Instagram-labelled X attribution as a known data-quality issue. Do not silently rewrite past source attribution or assume it can be recovered.
- A redirect hit is not necessarily a person or an install: previews, crawlers and QA can create requests. Record the filtering/measurement method.
- Separate redirect clicks, Play listing activity, first_open, reader activation and writer activation. Never equate a day-over-day install increase with post-attributed installs.
- Use only the existing verified analytics definitions. If reader completion or first publication cannot be measured reliably, report unavailable. Do not invent an event implementation or present an empty template as data.
- Do not put personal data in campaign identifiers.

App-link frequency:
- Instagram direct acquisition themes: Days 1, 9 and 13, with the standing bio link and separately tracked Stories.
- X direct links: evening posts on Days 9 and 13, plus a single existing or verified profile link.
- Optional cleared author features can use a story destination with exact destination wording; no automatic link-only follow-up replies.

## Measurement and targets

Before launch, fill a fresh baseline for each platform: followers, previous seven days' posting volume, median 48-hour impressions/reach where available, meaningful external replies/comments, saves/shares, profile activity, link activity, attributed first opens, and available activation measures.

For every delivery, record its native URL, actual publish time, asset paths, final caption, link test evidence and any deviation. Capture metrics at **24 hours and 48 hours after publication**. Record unavailable values as blank/NA with a reason, never zero.

Working signals:
- Prompts: distinct external participants and meaningful replies/comments. Exclude the brand, team and operated bot accounts.
- Writing tips: saves and shares; compare equal post ages and the same platform.
- Product walkthroughs: verified outbound visits, attributed first opens and available real activation events.
- Stories: reach/views using the native metric label, poll participation, link-sticker activity and exits where available.
- Profile: net follower change and available profile-to-link activity.
- Community: real writers receiving substantive feedback; repeat participation when it can be observed reliably.

Proposed learning goals, not forecasts or algorithm benchmarks:
- **10 distinct external contributors** across the two weeks, counted per platform unless cross-platform identity is known.
- **20 qualified outbound visits**, if a reliable method can distinguish them from bots and QA.
- **5 attributed first opens**, if attribution is actually available.
- **At least one content family** worth repeating based on multiple posts.
No guaranteed follower-growth target. Inability to measure a goal is a measurement gap, not zero performance.

## Day 7 review — 12 September

At 21:15 IST, compare Days 1–5 at the same 48-hour age. Days 6–7 are too recent for that comparison. Use counts alongside rates; do not combine X views with Instagram reach.

- If multiple prompt posts attract real responses, favor prompt-led covers for Days 8, 10 and 14. Keep their planned language and topic unless the language review requires a fallback.
- If tip carousels are being saved/shared but not discussed, preserve Days 9/11's useful instructional structure; do not force every item to ask for comments.
- If an app post earns visits but no measured downstream activity, first verify links, attribution and the product journey. Do not add more install posts until the cause is clearer.
- Do not call a format a winner from one post. Use at least two examples per family when available. If evidence is sparse, keep the planned cadence and record insufficient evidence.
- Do not increase posting frequency in Week 2. Keep the same times for comparability. Change timing only if account insights supply a clear reason; record the change and stop treating affected comparisons as controlled.
- If quality, rights review or reliable delivery cannot be maintained, reduce to **one X original daily at 20:30** and **five Instagram feed posts in Week 2**; mark skipped slots explicitly. Do not compress skipped posts into later days.
- Replace any unsupported featured-author slot with its fallback. Replace repetitive copy, not merely its wording.

## Completion and final readout

Day 14 (19 September): publish the final recap and deliver a preliminary operational report. Stop the publishing campaign at the end of the day; do not create a new two-week cycle automatically.

A complete 48-hour report is due **21 September**, after the final posts mature. That is a read-only measurement task, not extra posting. Seven-day retention for the last acquired cohort cannot be complete before **26 September**; report it pending on Day 14 rather than fabricating it.

Final report:
1. Planned vs published items, exceptions, and direct URLs.
2. Per-platform starting/ending followers and comparable reach/impression summaries.
3. Posts ranked separately by participation, saves/shares and acquisition evidence.
4. Acquisition stages with their definitions and attribution coverage.
5. Actual contributors, available writer/reader outcomes, and measurement gaps.
6. Three actions to keep and three to change, grounded in the results.

## Antigravity execution loop

At each due slot, read the current calendar and native queue, choose the approved item or its cleared fallback, verify media/caption/rights/link readiness, and publish or schedule through the permitted route under existing authorization. Verify the live asset and URL, then record the result. Re-read state before any retry; do not submit again when the first attempt may already have succeeded.

States:
- **Published:** live post and correct asset/destination verified.
- **Scheduled:** actual native queue entry verified; not merely written into the CSV.
- **No-op:** slot is already correctly scheduled or published.
- **Blocked:** required access, asset, link or rights evidence is missing and no cleared fallback is available.
- **Uncertain:** publishing may have succeeded but cannot be verified; inspect the native account before retrying.
- **Paused:** product acquisition problem, account restriction or repeated unresolved publishing failure. Continue only unaffected, already-cleared work; do not evade limits.
- **Complete:** Day 14 publishing window has ended and all outcomes are recorded. Remaining analytics may be pending.

If a retry encounters the same unresolved failure and new state provides no repair, stop that item and report the blocker. Never report an attempted publish as success, launch an endless retry cycle or post missed slots in a burst.

## Copy-ready instruction for Antigravity

> Execute the WritOn plan in campaign/antigravity-2026-09-06-19/PLAN.md for 6–19 September 2026, using publishing-calendar.csv. Reconcile existing X/Instagram queues, render and check the required images, review language and rights, and verify platform-specific links. Use cleared fallbacks when needed. Publish only through the permitted route under the account's existing authorization. Verify every post, record metrics, review on Day 7, and stop publishing after Day 14. Prepare community replies for human review. Report missing access or uncertain publication without duplicating posts.

