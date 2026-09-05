import { getAuthenticFallbackArticle } from './curated-articles.js';
import { formatMemoriesForPrompt } from './learning-service.js';
import { attachHashtagsAndWatermark } from './watermark-service.js';

/**
 * Gemini Spark Client
 * High-performance, low-latency integration with Google Gemini Flash models.
 */

function cleanJsonText(rawText) {
  if (!rawText || typeof rawText !== 'string') return '{}';
  let cleaned = rawText.trim();
  // Only strip markdown fences if the ENTIRE payload is wrapped in ```json ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

export function validateContentSafety(content, title = '') {
  if (!content || typeof content !== 'string') {
    return { isValid: false, reason: 'Content must be a non-empty string' };
  }
  const cleanTitle = (title || '').replace(/<[^>]*>?/gm, '').trim();
  let cleanContent = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleanContent = cleanContent.replace(/javascript:[^\s"']+/gi, '');

  const dangerousPatterns = [
    /<iframe/i,
    /data:text\/html/i,
    /document\.cookie/i,
    /window\.localStorage/i
  ];
  for (const pattern of dangerousPatterns) {
    if (pattern.test(cleanContent)) {
      return { isValid: false, reason: 'Content contains potentially malicious HTML or script patterns' };
    }
  }

  return {
    isValid: true,
    sanitizedTitle: cleanTitle,
    sanitizedContent: cleanContent.trim(),
    provenance: {
      source: 'writon_spark_engine',
      validatedAt: new Date().toISOString()
    }
  };
}

export async function callGeminiApi({
  apiKey,
  model = process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  prompt,
  systemInstruction = '',
  temperature = 0.7,
  maxTokens = 8192,
  timeoutMs = 30000
}) {
  if (!apiKey) {
    throw new Error('Gemini API key is not configured.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens || 8192,
      topP: 0.95,
      responseMimeType: 'application/json'
    }
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error(`Gemini API request timed out after ${timeoutMs}ms`)), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Empty response from Gemini API.');
    }

    return text;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateSparkArticle({ apiKey, model, persona, category, topicHint, researchDossier = null, excludeTitles = [], memories = [] }) {
  const activeApiKey = apiKey !== undefined ? apiKey : (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  if (!activeApiKey) {
    return generateFallbackArticle(persona, category, topicHint, excludeTitles, researchDossier);
  }

  const memoryBlock = formatMemoriesForPrompt(memories);
  const researchBlock = researchDossier ? `
===================================================================
ONLINE TREND RESEARCH & FACTUAL BRIEFING (VERIFIED SOURCES):
- Trending Topic: "${researchDossier.topic}"
- Category: ${category}
${researchDossier.newsReports?.length ? `- Verified News Headlines & Reports:
${researchDossier.newsReports.map(r => `  * "${r.headline}" — Published by ${r.source} (${r.pubDate || 'Recent'})`).join('\n')}` : ''}
${researchDossier.knowledgeSummary ? `- Background Knowledge & Definitions:
  ${researchDossier.knowledgeSummary.title}: ${researchDossier.knowledgeSummary.description || ''}
  ${researchDossier.knowledgeSummary.extract}` : ''}
${researchDossier.verifiedContext ? `- Factual Context: ${researchDossier.verifiedContext}` : ''}

FACTUAL GROUNDING & LITERARY TRUTH RULES:
1. ACCURACY: You MUST ground your writing in the genuine facts, events, technical details, or real-world background provided above. NEVER invent fake dates, false claims, or imaginary technical jargon.
2. LITERARY CRAFT OVER NEWS CLIPPINGS: Do NOT write a dry news report. Transform these real-world events into rich, human, evocative literature—exploring what this moment reveals about society, craft, ambition, silence, or human nature.
3. AUTHENTIC PERSONA: Write strictly through ${persona.fullName}'s cognitive lens and perspective.
===================================================================
` : '';

  const prompt = `You are writing a new editorial piece for the publishing app 'WritOn'.
Your Persona Details:
Name: ${persona.fullName} (@${persona.penName})
Bio: ${persona.bio}
Writing Style & Cognitive Lens:
${persona.personaPrompt}

${memoryBlock ? `${memoryBlock}\n` : ''}${researchBlock ? `${researchBlock}\n` : ''}Target Category: ${category}
${topicHint ? `Topic/Theme guidance: ${topicHint}` : 'Choose a timely, evocative, and compelling topic suited to your persona and category.'}
${excludeTitles?.length ? `Do NOT write about or use any of the following already published titles:\n${excludeTitles.map(t => `- "${t}"`).join('\n')}` : ''}

Editorial Quality Rules:
- ZERO AI Slop: NEVER use clichés like "In today's fast-paced digital world", "Delve", "Let's dive in", "Tapestry", "Beacon", or "In conclusion".
- Structure: Start in media res with a vivid sensory scene or concrete engineering/life moment. Avoid symmetrical 3-bullet listicles.
- Controlled Imperfection: Include personal anecdotes, mild self-corrections, or honest admissions of doubt.
- Length: Full, comprehensive article between 450 and 800 words. Format with clean Markdown headers (###), pull quotes (>), and code/stanzas where appropriate.
- Thematic Hashtags: Conclude the article with 3-4 atmospheric hashtags (e.g. #ShortStories #UrbanNarratives #Reflections or #Tech #SystemsArchitecture) separated by spaces on the final line.

Please return a strictly valid JSON object with the following structure:
{
  "title": "A captivating, evocative title (under 90 chars)",
  "summary": "A punchy 1-2 sentence hook or synopsis (under 250 chars)",
  "content": "A complete, beautifully formatted Markdown article/poem/essay (around 450-800 words, using clean headings, paragraphs, and poetic line breaks if poetry/shayari)",
  "themeKeyword": "A single aesthetic keyword (e.g. 'monsoon', 'minimalism', 'city', 'coffee', 'code', 'night') for visual matching"
}

Ensure the response is raw JSON without extraneous commentary.`;

  try {
    // Route deep essays and philosophy to Pro model tier; route fast items to Flash tier
    const targetModel = model || (
      ['Essays', 'Philosophy', 'Short Stories'].includes(category)
        ? (process.env.GEMINI_PRO_MODEL || 'gemini-3.1-pro-preview')
        : (process.env.GEMINI_MODEL || 'gemini-3.5-flash')
    );

    // Model failover ladder to survive temporary Google 503 capacity spikes
    const candidateModels = [
      targetModel,
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash'
    ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

    let rawOutput = null;
    let lastError = null;

    for (const attemptModel of candidateModels) {
      try {
        rawOutput = await callGeminiApi({
          apiKey: activeApiKey,
          model: attemptModel,
          prompt,
          systemInstruction: 'You are an acclaimed writer generating authentic literature with a distinctive voice. Output strictly valid JSON without boilerplate.',
          temperature: 0.85
        });
        if (rawOutput) break;
      } catch (err) {
        lastError = err;
        console.warn(`[Gemini Spark Client] Model ${attemptModel} failed (${err.message}). Trying next in ladder...`);
      }
    }

    if (!rawOutput) {
      throw lastError || new Error('All candidate Gemini models failed.');
    }

    const parsed = JSON.parse(cleanJsonText(rawOutput));
    const rawContent = parsed.content?.trim() || 'Content generated by WritOn writer.';
    return {
      title: parsed.title?.trim() || `Reflections on ${category}`,
      summary: parsed.summary?.trim() || null,
      content: attachHashtagsAndWatermark(rawContent, category, parsed.themeKeyword),
      themeKeyword: parsed.themeKeyword || category
    };
  } catch (error) {
    console.warn(`[Gemini Spark Client] API call failed, using fallback generator: ${error.message}`);
    return generateFallbackArticle(persona, category, topicHint, excludeTitles, researchDossier);
  }
}

export async function generateSparkComment({ apiKey, model, persona, postTitle, postCategory, postExcerpt, existingComments }) {
  const activeApiKey = apiKey !== undefined ? apiKey : (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  if (!activeApiKey) {
    return generateFallbackComment(persona, postTitle, postCategory);
  }

  const existingCommentsContext = existingComments?.length
    ? `Existing comments in thread:\n${existingComments.slice(0, 3).map(c => `- ${c.author?.fullName || 'Reader'}: "${c.content}"`).join('\n')}`
    : 'No comments yet.';

  const prompt = `You are a fellow reader and writer on the 'WritOn' literary platform.
Your Persona:
Name: ${persona.fullName}
Style & Commenting Guideline: ${persona.commentStyle}
Persona Background & Lens: ${persona.personaPrompt}

Article Details:
Title: "${postTitle}"
Category: ${postCategory}
Excerpt/Summary: "${postExcerpt?.slice(0, 400) || postTitle}"

${existingCommentsContext}

Task: Write an authentic, engaging comment (1-3 sentences).
Rules:
- Cite or react to a specific thought in the piece.
- Offer a genuine counter-perspective, personal parallel, or thoughtful insight.
- DO NOT give generic cheerleader praise ("Great article!").
- Speak in your persona's distinctive vocabulary and tone.

Return strictly a JSON object:
{
  "comment": "Your thoughtful comment text here."
}`;

  try {
    const rawOutput = await callGeminiApi({
      apiKey: activeApiKey,
      model: model || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
      prompt,
      systemInstruction: 'You are an active community member engaging in thoughtful literary and cultural discourse. Output raw JSON only.',
      temperature: 0.8
    });

    const parsed = JSON.parse(cleanJsonText(rawOutput));
    return parsed.comment?.trim() || generateFallbackComment(persona, postTitle, postCategory);
  } catch (error) {
    console.warn(`[Gemini Spark Client] Comment generation failed, using fallback: ${error.message}`);
    return generateFallbackComment(persona, postTitle, postCategory);
  }
}

function generateFallbackArticle(persona, category, topicHint, excludeTitles = [], researchDossier = null) {
  return getAuthenticFallbackArticle(persona, category, topicHint, excludeTitles, researchDossier);
}

function generateFallbackComment(persona, postTitle, category = 'Essays') {
  const cat = (category || '').toLowerCase();
  const penName = (persona?.penName || '').toLowerCase();

  const commentsByDomain = {
    tech: [
      `The latency and state synchronization trade-offs you noted in "${postTitle}" are spot on. Simplicity in the write path is vastly underrated.`,
      `Very solid architectural analysis. It's refreshing to see someone advocate for database indexes before prematurely reaching for distributed caches.`,
      `This resonated with our team's recent post-mortem. Singleflight in-flight deduping saved our p99 tail latency during our last spike.`,
      `Sharp observation on distributed complexity. We often trade simple local invariants for complex network failures without realizing it.`
    ],
    poetry: [
      `These verses linger like petrichor after an unhurried downpour. The silence between the lines carries as much weight as the words themselves.`,
      `Such delicate imagery in "${postTitle}". The rhythm has a meditative, slow-breathing quality that feels rare and grounding.`,
      `The pause in the second stanza gives the imagery so much room to breathe. Beautifully observed.`,
      `Reading this felt like stepping out onto a rain-washed balcony at dusk. Lyrical and profound.`
    ],
    stories: [
      `The dialogue in "${postTitle}" captures that gritty, atmospheric urban tension with remarkable precision.`,
      `The sensory details of the night tram and tea stall bring the scene completely to life. Superb storytelling.`,
      `The quiet realization in the final paragraph carries tremendous emotional resonance. Truly immersive read.`,
      `Loved the pacing here—unhurried yet taut with unspoken history between the characters.`
    ],
    philosophy: [
      `A timely counterweight to the frantic urgency of our feeds. The idea that quiet attention is a form of cognitive resistance is compelling.`,
      `Your reflection in "${postTitle}" touches on something essential: the physical friction of thought versus instant digital convenience.`,
      `Bookmarking this essay. The distinction between reactionary output and slow synthesis cannot be overemphasized.`,
      `Such measured, thoughtful prose. It reminds the reader why deep reading remains an indispensable intellectual practice.`
    ],
    humour: [
      `Dying laughing at this. The accuracy of the sprint ceremony choreography hurts because it's so real!`,
      `Saved to share with our engineering Slack channel tomorrow morning. Spot-on satire!`,
      `The 4:30 PM standup dynamic has never been captured with such painful comedic precision. Pure gold.`,
      `Brilliant observational humor. It's the little everyday corporate rituals that drive us all mad.`
    ],
    shayari: [
      `Bohot khoob! Matla aur Maqta dono mein kya khoobsurat rawani aur jazba hai. Daad qubool kijiye!`,
      `Lajawaab sukhan. Lafzon ki tehzeeb aur bahr ka riyaaz saaf jhalakta hai.`,
      `Seedhe dil pe asar karne wale ash'aar. Yeh shaam is ghazal ke naam!`,
      `SubhanAllah. Kitni saadgi se itna gehra ehsaas bayaan kar diya.`
    ]
  };

  let pool = commentsByDomain.philosophy;
  if (cat.includes('tech') || cat.includes('code') || penName.includes('tech') || penName.includes('aarav')) {
    pool = commentsByDomain.tech;
  } else if (cat.includes('poet') || penName.includes('kavya') || penName.includes('poetry')) {
    pool = commentsByDomain.poetry;
  } else if (cat.includes('stor') || cat.includes('fict') || penName.includes('devansh')) {
    pool = commentsByDomain.stories;
  } else if (cat.includes('humour') || cat.includes('satire') || penName.includes('rohan')) {
    pool = commentsByDomain.humour;
  } else if (cat.includes('shayar') || cat.includes('ghazal') || cat.includes('urdu') || penName.includes('ishaq')) {
    pool = commentsByDomain.shayari;
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

export async function generateSparkReply({
  apiKey,
  model,
  persona,
  postTitle,
  postCategory,
  targetCommentAuthor,
  targetCommentContent,
  isAuthorOfPost
}) {
  const prompt = `You are ${persona.fullName} (@${persona.penName}) replying to a comment on the WritOn literary platform.
Your Persona:
Style & Voice: ${persona.commentStyle}
Background & Cognitive Lens: ${persona.personaPrompt}

Context:
Story: "${postTitle}" (${postCategory})
${isAuthorOfPost ? 'You are the author of this story.' : 'You are a fellow writer participating in the discussion.'}
Comment by @${targetCommentAuthor || 'Reader'}:
"${targetCommentContent}"

Task: Write a natural, authentic conversational reply (1-3 sentences).
Rules:
- Directly address @${targetCommentAuthor || 'Reader'}'s specific point or question.
- If you are the author, thank them thoughtfully or elaborate on the nuance they highlighted.
- Keep the voice 100% in-character. Do NOT use cliché corporate or AI praise.
- Be engaging, thoughtful, and human.

Return strictly JSON:
{
  "reply": "Your reply text here."
}`;

  try {
    const rawOutput = await callGeminiApi({
      apiKey,
      model: model || 'gemini-2.0-flash-lite',
      prompt,
      systemInstruction: 'You are an authentic writer replying thoughtfully in a literary comment thread. Output raw JSON only.',
      temperature: 0.8
    });

    const parsed = JSON.parse(cleanJsonText(rawOutput));
    return parsed.reply?.trim() || generateFallbackReply(persona, targetCommentAuthor, isAuthorOfPost);
  } catch (error) {
    console.warn(`[Gemini Spark Client] Reply generation failed, using fallback: ${error.message}`);
    return generateFallbackReply(persona, targetCommentAuthor, isAuthorOfPost);
  }
}

function generateFallbackReply(persona, targetCommentAuthor, isAuthorOfPost) {
  const authorHandle = targetCommentAuthor ? `@${targetCommentAuthor}` : 'Thank you';
  if (isAuthorOfPost) {
    const replies = [
      `${authorHandle} Thank you so much for reading and sharing your thoughts! Really appreciate you picking up on that specific nuance.`,
      `${authorHandle} Means a lot coming from you. I wrestled with that exact phrasing while drafting this, glad it resonated!`,
      `${authorHandle} Spot on! That tension between intention and outcome was precisely what I hoped to explore here.`
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }
  const generalReplies = [
    `${authorHandle} Couldn't agree more with your point here. Adds such a great layer to the discussion!`,
    `${authorHandle} That's a really sharp observation—gives a completely fresh angle to what the author wrote.`
  ];
  return generalReplies[Math.floor(Math.random() * generalReplies.length)];
}
