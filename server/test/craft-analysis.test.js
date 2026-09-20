import { describe, it, expect } from 'vitest';
import { getCraftVoicePrompt, CRAFT_ARCHETYPES, GENRE_CRAFT_GUIDANCE } from '../src/services/human-voice-prompt.js';

describe('Craft Voice Prompt Assembler', () => {
  it('exports valid archetypes and genre guidance', () => {
    expect(CRAFT_ARCHETYPES).toBeDefined();
    expect(CRAFT_ARCHETYPES.restrained).toBeDefined();
    expect(CRAFT_ARCHETYPES.conversational).toBeDefined();
    expect(CRAFT_ARCHETYPES.lyrical).toBeDefined();
    expect(CRAFT_ARCHETYPES.analytical).toBeDefined();
    expect(GENRE_CRAFT_GUIDANCE.Essays).toBeDefined();
    expect(GENRE_CRAFT_GUIDANCE['Short Stories']).toBeDefined();
  });

  it('assembles genre-specific prompt with restrained archetype by default', () => {
    const prompt = getCraftVoicePrompt({ genre: 'Essays' });
    expect(prompt).toContain('THE SPARE & RESTRAINED');
    expect(prompt).toContain('Median sentence length ~10 to 12 words');
    expect(prompt).toContain('Anti-Slop Discipline');
  });

  it('assembles conversational archetype prompt', () => {
    const prompt = getCraftVoicePrompt({ genre: 'Humour', archetype: 'conversational' });
    expect(prompt).toContain('THE CONVERSATIONAL & VULNERABLE');
    expect(prompt).toContain('Acknowledge awkwardness and complicity');
  });

  it('assembles comment directive when destination is comment', () => {
    const prompt = getCraftVoicePrompt({ destination: 'comment' });
    expect(prompt).toContain('COMMUNITY CONVERSATION');
    expect(prompt).toContain('under 25 words');
    expect(prompt).toContain('Never re-summarize');
  });
});
