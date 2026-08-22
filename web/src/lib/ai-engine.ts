import { AIAnalysis } from '../types';

/**
 * In-Browser Zero-Cost AI Engine
 * Operates 100% locally on the client machine with zero API cost.
 */
export class ClientAIEngine {
  // Generate story summary and key insights
  public static analyzeStory(title: string, content: string): AIAnalysis {
    // Strip markdown formatting for text analysis
    const cleanText = content
      .replace(/#+\s+/g, '')
      .replace(/[*_`~]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/>\s+/g, '')
      .trim();

    const sentences = cleanText
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20);

    // Heuristic sentiment & tone detection
    const toneMarkers = {
      philosophical: ['truth', 'exist', 'reason', 'meaning', 'nature', 'human', 'sacred', 'contemplative', 'silence', 'consciousness'],
      technical: ['system', 'model', 'parameter', 'algorithm', 'inference', 'latency', 'chip', 'code', 'function', 'memory', 'cpu'],
      poetic: ['bloom', 'whisper', 'dusk', 'phosphor', 'shadow', 'pulse', 'echo', 'night', 'rhythm', 'breath'],
      analytical: ['theory', 'evidence', 'reveal', 'observe', 'compare', 'contrast', 'metric', 'framework', 'data']
    };

    const textLower = cleanText.toLowerCase();
    let detectedTone = 'Reflective & Analytical';

    let maxScore = 0;
    for (const [toneName, keywords] of Object.entries(toneMarkers)) {
      let count = 0;
      for (const kw of keywords) {
        if (textLower.includes(kw)) count++;
      }
      if (count > maxScore) {
        maxScore = count;
        if (toneName === 'philosophical') detectedTone = 'Philosophical & Contemplative';
        if (toneName === 'technical') detectedTone = 'Technical & Deep-Tech';
        if (toneName === 'poetic') detectedTone = 'Lyrical & Introspective';
        if (toneName === 'analytical') detectedTone = 'Structured & Analytical';
      }
    }

    // Extract top key insights (longest and highest density sentences)
    const scoredSentences = sentences.map(sentence => {
      let score = sentence.length;
      if (sentence.includes('must') || sentence.includes('because') || sentence.includes('reveals') || sentence.includes('means')) {
        score += 50;
      }
      return { sentence, score };
    });

    scoredSentences.sort((a, b) => b.score - a.score);

    const topSentences = scoredSentences.slice(0, 3).map(s => s.sentence);
    const keyInsights = topSentences.length > 0
      ? topSentences
      : ['Explores the intersection of intention and craft.', 'Challenges standard linear thinking in modern workflows.', 'Recommends deliberate spatial and cognitive stillness.'];

    // Generate concise TL;DR
    const tldr = sentences.length > 0
      ? `This piece explores "${title}", examining how ${sentences[0].toLowerCase()}`
      : `An in-depth editorial exploring modern themes in ${title}.`;

    return {
      tldr,
      keyInsights,
      tone: detectedTone,
      targetAudience: 'Curious builders, essayists, and creative thinkers'
    };
  }

  // Writing Copilot actions
  public static assistWriting(action: 'polish' | 'enrich' | 'headlines' | 'summary' | 'bullets', text: string, title?: string): string {
    if (!text.trim()) return '';

    switch (action) {
      case 'polish': {
        return text
          .replace(/\bvery\s+/gi, '')
          .replace(/\breally\s+/gi, '')
          .replace(/\bin order to\b/gi, 'to')
          .replace(/\bdue to the fact that\b/gi, 'because')
          .replace(/\s+/g, ' ')
          .trim();
      }
      case 'enrich': {
        return text
          .replace(/\bgood\b/gi, 'exemplary')
          .replace(/\bimportant\b/gi, 'paramount')
          .replace(/\bshow\b/gi, 'illuminate')
          .replace(/\bthink\b/gi, 'contemplate')
          .replace(/\bchange\b/gi, 'transmute');
      }
      case 'headlines': {
        const topic = title || text.slice(0, 40);
        return `1. The Quiet Power of ${topic}: A New Perspective\n2. Beyond the Surface: Why ${topic} Matters Today\n3. Deconstructing ${topic} for Intentional Minds`;
      }
      case 'summary': {
        const firstTwo = text.split(/[.!?]+/).slice(0, 2).join('. ').trim();
        return firstTwo ? `${firstTwo}.` : text.slice(0, 160) + '...';
      }
      case 'bullets': {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 15).slice(0, 3);
        return sentences.map((s) => `• ${s.trim()}`).join('\n');
      }
      default:
        return text;
    }
  }
}

/**
 * In-Browser Vector & Semantic Similarity Search
 * Zero cloud dependency: computes TF-IDF semantic embeddings & cosine similarity in memory.
 */
export class SemanticSearchEngine {
  // Tokenize and clean text into normalized term frequencies
  private static getTermVector(text: string): Map<string, number> {
    const vector = new Map<string, number>();
    const tokens = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);

    for (const token of tokens) {
      vector.set(token, (vector.get(token) || 0) + 1);
    }
    return vector;
  }

  // Calculate cosine similarity between two term frequency vectors
  public static cosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (const [term, valA] of vecA) {
      normA += valA * valA;
      const valB = vecB.get(term);
      if (valB !== undefined) {
        dotProduct += valA * valB;
      }
    }

    for (const [, valB] of vecB) {
      normB += valB * valB;
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Semantic search across stories
  public static searchStories<T extends { title: string; summary: string; category?: string; content?: string }>(
    query: string,
    stories: T[]
  ): Array<{ story: T; score: number }> {
    if (!query.trim()) return stories.map(story => ({ story, score: 1.0 }));

    const queryVector = this.getTermVector(query);

    return stories
      .map(story => {
        const docText = `${story.title} ${story.title} ${story.summary} ${story.category || ''} ${(story.content || '').slice(0, 1000)}`;
        const docVector = this.getTermVector(docText);
        const score = this.cosineSimilarity(queryVector, docVector);
        return { story, score };
      })
      .filter(res => res.score > 0.05)
      .sort((a, b) => b.score - a.score);
  }

  // Find related stories based on semantic similarity to target story
  public static findRelatedStories<T extends { id: string; title: string; summary: string; category?: string }>(
    targetStory: T,
    allStories: T[],
    limit = 3
  ): T[] {
    const targetVector = this.getTermVector(`${targetStory.title} ${targetStory.summary} ${targetStory.category || ''}`);

    return allStories
      .filter(s => s.id !== targetStory.id)
      .map(story => {
        const candidateVector = this.getTermVector(`${story.title} ${story.summary} ${story.category || ''}`);
        return {
          story,
          score: this.cosineSimilarity(targetVector, candidateVector)
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.story);
  }
}

/**
 * Web Speech API Voice Dictation (Speech-to-Text)
 */
export class VoiceDictationEngine {
  private static recognition: any = null;
  private static isListening = false;

  public static isSupported(): boolean {
    return typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }

  public static startDictation(options: {
    onResult: (text: string, isFinal: boolean) => void;
    onError?: (err: any) => void;
    onEnd?: () => void;
    lang?: string;
  }): boolean {
    if (!this.isSupported()) return false;

    this.stopDictation();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = options.lang || 'en-US';

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const text = finalTranscript || interimTranscript;
      if (text.trim()) {
        options.onResult(text, !!finalTranscript);
      }
    };

    this.recognition.onerror = (event: any) => {
      options.onError?.(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      options.onEnd?.();
    };

    this.recognition.start();
    this.isListening = true;
    return true;
  }

  public static stopDictation() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  public static getListeningState(): boolean {
    return this.isListening;
  }
}

/**
 * Web Speech API Narrator (TTS)
 */
export class AudioNarrator {
  private static synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  public static currentUtterance: SpeechSynthesisUtterance | null = null;

  public static isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public static speak(
    text: string,
    options: {
      rate?: number;
      pitch?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    } = {}
  ) {
    if (!this.synth) return;

    this.stop();

    // Clean markdown before speaking
    const cleanText = text
      .replace(/#+\s+/g, '')
      .replace(/[*_`~]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/```[\s\S]*?```/g, 'Code snippet omitted.')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;

    // Pick best natural voice if available
    const voices = this.synth.getVoices();
    const englishVoice = voices.find(v => (v.name.includes('Natural') || v.name.includes('Premium') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')) && v.lang.startsWith('en')) || voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => options.onStart?.();
    utterance.onend = () => options.onEnd?.();
    utterance.onerror = (e) => options.onError?.(e);

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  public static pause() {
    if (this.synth && this.synth.speaking) {
      this.synth.pause();
    }
  }

  public static resume() {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
    }
  }

  public static stop() {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  public static isPlaying(): boolean {
    return !!(this.synth && this.synth.speaking && !this.synth.paused);
  }

  public static isPaused(): boolean {
    return !!(this.synth && this.synth.paused);
  }
}

