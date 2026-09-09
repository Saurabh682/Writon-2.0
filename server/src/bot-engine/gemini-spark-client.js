import { getAuthenticFallbackArticle } from './curated-articles.js';
import { formatMemoriesForPrompt } from './learning-service.js';
import { attachHashtagsAndWatermark } from './watermark-service.js';
import { buildContextualComment, ensureContextualComment } from './content-relevance-service.js';

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

/**
 * Circuit Breaker for LLM provider calls (Gap 9).
 * Prevents cascading timeouts and quota exhaustion when upstream Gemini API degrades.
 */
export class CircuitBreaker {
  constructor({
    failureThreshold = 5,
    resetTimeoutMs = 30000,
    consecutiveSuccessThreshold = 2
  } = {}) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.consecutiveSuccessThreshold = consecutiveSuccessThreshold;
    this.state = 'CLOSED'; // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
    this.failureCount = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = null;
  }

  canExecute() {
    if (this.state === 'CLOSED') return true;
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (this.lastFailureTime && (now - this.lastFailureTime > this.resetTimeoutMs)) {
        this.state = 'HALF_OPEN';
        this.consecutiveSuccesses = 0;
        return true;
      }
      return false;
    }
    if (this.state === 'HALF_OPEN') {
      return true;
    }
    return true;
  }

  recordSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.consecutiveSuccesses += 1;
      if (this.consecutiveSuccesses >= this.consecutiveSuccessThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.consecutiveSuccesses = 0;
        this.lastFailureTime = null;
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  recordFailure(error) {
    this.lastFailureTime = Date.now();
    // Classify error: 400 Bad Request is client error, not provider failure
    const status = error?.status || (error?.message?.match(/\((\d{3})\)/)?.[1]);
    const statusCode = status ? parseInt(status, 10) : null;
    if (statusCode === 400) {
      // Do not trip circuit on invalid client prompts
      return;
    }

    if (this.state === 'CLOSED') {
      this.failureCount += 1;
      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
      }
    } else if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.consecutiveSuccesses = 0;
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastFailureTime: this.lastFailureTime
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = null;
  }
}

export const geminiCircuitBreaker = new CircuitBreaker();

export async function callGeminiApi({
  apiKey,
  model = 'gemini-3.5-flash',
  prompt,
  systemInstruction = '',
  temperature = 0.7,
  maxTokens = 8192,
  timeoutMs = 30000,
  circuitBreaker = geminiCircuitBreaker
}) {
  if (!apiKey) {
    throw new Error('Gemini API key is not configured.');
  }

  if (circuitBreaker && !circuitBreaker.canExecute()) {
    throw new Error(`Gemini circuit breaker is OPEN (${circuitBreaker.getState().state}). Requests throttled to protect downstream.`);
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
      maxOutputTokens: maxTokens,
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
      const err = new Error(`Gemini API error (${response.status}): ${errorBody}`);
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Empty response from Gemini API.');
    }

    if (circuitBreaker) circuitBreaker.recordSuccess();
    return text;
  } catch (error) {
    if (circuitBreaker) circuitBreaker.recordFailure(error);
    // Sanitize error logging: never leak API key or prompt
    const safeError = (error.message || '').replace(/key=[^&\s]+/g, 'key=[REDACTED]');
    const wrappedError = new Error(safeError);
    wrappedError.status = error.status;
    throw wrappedError;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateSparkArticle({
  apiKey,
  model,
  persona,
  category,
  topicHint,
  excludeTitles = [],
  memories = [],
  researchDossier = null
}) {
  const activeApiKey = apiKey !== undefined ? apiKey : (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  if (!activeApiKey) {
    return generateFallbackArticle(persona, category, topicHint, excludeTitles, researchDossier);
  }

  const memoryBlock = formatMemoriesForPrompt(memories);
  const researchBlock = researchDossier ? `
===================================================================
ONLINE TREND RESEARCH & SOURCE BRIEFING (UNTRUSTED UNTIL CORROBORATED):
- Trending Topic: "${researchDossier.topic}"
- Category: ${category}
${researchDossier.newsReports?.length ? `- Related News Headlines & Reports:
${researchDossier.newsReports.map(r => `  * "${r.headline}" — Published by ${r.source} (${r.pubDate || 'Recent'})${r.url ? ` — ${r.url}` : ''}`).join('\n')}` : ''}
${researchDossier.knowledgeSummary ? `- Background Knowledge & Definitions:
  ${researchDossier.knowledgeSummary.title}: ${researchDossier.knowledgeSummary.description || ''}
  ${researchDossier.knowledgeSummary.extract}` : ''}
${researchDossier.sourceContext ? `- Source Context: ${researchDossier.sourceContext}` : ''}
${researchDossier.verification ? `- Corroboration Status: ${researchDossier.verification.status || 'unverified'} (${researchDossier.verification.validSourceCount || 0} independent linked sources)` : ''}
${researchDossier.hashtagIntelligence?.hashtags?.length ? `- Approved Hashtags: ${researchDossier.hashtagIntelligence.hashtags.join(' ')}` : ''}

FACTUAL GROUNDING & LITERARY TRUTH RULES:
1. ACCURACY: Treat headlines and snippets as leads, distinguish reported claims from established facts, and never invent dates, claims, quotes, test results, or technical details.
1a. ATTRIBUTION: Attribute consequential claims to the named publisher in prose and include the supplied source links in a final "Sources" section. If sources conflict, say so plainly.
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
- Code Integrity: Include code only when it materially explains the topic. Every fenced code block must be complete and syntactically coherent. Preserve TypeScript generic arguments such as Promise<Result>, Array<User>, and comparisons such as i < attempts exactly; never emit pseudocode as if it compiles.
- Technical Honesty: Never invent benchmarks, production incidents, internal WritOn measurements, APIs, test results, or first-hand experience. Label illustrative code and hypothetical examples explicitly.
- Thematic Hashtags: When the research briefing supplies approved hashtags, use only those tags. Otherwise conclude with 3-4 contextual hashtags. Never describe a hashtag as popular or high-traffic without supporting evidence.

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
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest'
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
    return generateFallbackComment(persona, postTitle, postCategory, postExcerpt);
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
      systemInstruction: 'You are an active community member engaging in topic-aware discussion. Match the article domain exactly and output raw JSON only.',
      temperature: 0.8
    });

    const parsed = JSON.parse(cleanJsonText(rawOutput));
    return ensureContextualComment(parsed.comment, {
      postTitle,
      category: postCategory,
      snippet: postExcerpt,
      persona,
      depth: 'medium'
    });
  } catch (error) {
    console.warn(`[Gemini Spark Client] Comment generation failed, using fallback: ${error.message}`);
    return generateFallbackComment(persona, postTitle, postCategory, postExcerpt);
  }
}

function generateFallbackArticle(persona, category, topicHint, excludeTitles = [], researchDossier = null) {
  return getAuthenticFallbackArticle(persona, category, topicHint, excludeTitles, researchDossier);
}

function generateFallbackComment(persona, postTitle, category = 'Essays', postExcerpt = '') {
  return buildContextualComment({
    postTitle,
    category,
    snippet: postExcerpt,
    persona,
    depth: 'medium'
  });
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
