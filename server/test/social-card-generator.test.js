import { describe, it, expect } from 'vitest';
import {
  buildCarouselSlideSvg,
  renderSvgToPng,
  renderDay1Carousel,
  renderDay4Manifesto,
  renderDay5Spotlight,
} from '../src/services/social-card-generator.js';
import { getDailyCampaignPayload } from '../src/services/campaign-dispatcher.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('Social Card Generator & Campaign Dispatcher', () => {
  it('builds a valid SVG string with proper branding and escape handling', () => {
    const svg = buildCarouselSlideSvg({
      badge: 'TEST BADGE',
      headlineLines: ['Test & Quote <Line>'],
      bodyLines: ['Body line description'],
      bullets: ['Bullet item 1', 'Bullet item 2'],
      slideNumber: 2,
      totalSlides: 5,
      theme: 'dark',
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('TEST BADGE');
    expect(svg).toContain('Test &amp; Quote &lt;Line&gt;');
    expect(svg).toContain('WritOn.');
    expect(svg).toContain('#E75A2A');
  });

  it('renders SVG to a PNG file using sharp', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'writon-card-test-'));
    const svg = buildCarouselSlideSvg({
      headlineLines: ['Automated Rendering Test'],
    });

    const outputPath = path.join(tmpDir, 'test_output.png');
    const resultPath = await renderSvgToPng(svg, outputPath);

    const stat = await fs.stat(resultPath);
    expect(stat.size).toBeGreaterThan(1000);
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('provides structured daily campaign payloads with localized captions', async () => {
    const day1Payload = await getDailyCampaignPayload(1);
    expect(day1Payload.day).toBe(1);
    expect(day1Payload.theme).toBe('The Pen Name Landgrab');
    expect(day1Payload.captions.en).toContain('Substack');
    expect(day1Payload.captions.hi).toContain('WritOn');
    expect(day1Payload.captions.bn).toContain('WritOn');
    expect(day1Payload.captions.mr).toContain('WritOn');
    expect(day1Payload.imageAssets.length).toBe(5);
  });
});
