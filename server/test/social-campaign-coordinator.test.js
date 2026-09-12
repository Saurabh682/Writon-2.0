import { describe, it, expect, vi } from 'vitest';
import {
  SocialCampaignCoordinator,
  XSpecialist,
  InstagramSpecialist,
  PinterestSpecialist,
  ThreadsSpecialist,
  RedditSpecialist,
  TelegramSpecialist,
  WebhookSpecialist
} from '../src/services/social-campaign-coordinator.js';

describe('ADK 2 Pillar 2: Social Campaign Coordinator', () => {
  const samplePayload = {
    day: 3,
    theme: 'The Dignity of the Unfinished Line',
    hook: 'A writer who cannot bear to leave a sentence imperfect will never write a second book.',
    shortlink: 'https://writon.cc/p/craft-3',
    captions: {
      en: 'A writer who cannot bear to leave a sentence imperfect will never write a second book. Start writing today.'
    },
    imageAssets: ['slide-1.png', 'slide-2.png']
  };

  it('coordinates concurrent execution across all mock specialists using Promise.allSettled', async () => {
    const mockX = {
      publish: vi.fn().mockResolvedValue({ status: 'success', postId: 'x_123', success: true })
    };
    const mockInsta = {
      publish: vi.fn().mockResolvedValue({ status: 'success', postId: 'insta_456', success: true })
    };
    const mockThreads = {
      publish: vi.fn().mockResolvedValue({ status: 'success', postId: 'threads_789', success: true })
    };
    const mockPinterest = {
      publish: vi.fn().mockResolvedValue({ status: 'success', postId: 'pin_101', success: true })
    };
    const mockReddit = {
      publish: vi.fn().mockResolvedValue({ status: 'success', postId: 'reddit_202', success: true })
    };
    const mockTelegram = {
      publish: vi.fn().mockResolvedValue({ status: 'skipped', success: false, reason: 'No token' })
    };
    const mockWebhook = {
      publish: vi.fn().mockResolvedValue({ status: 'skipped', success: false, reason: 'No webhook' })
    };

    const outcome = await SocialCampaignCoordinator.coordinatePublish({
      payload: samplePayload,
      localSlidePaths: ['/tmp/slide-1.png'],
      specialists: {
        x: mockX,
        instagram: mockInsta,
        threads: mockThreads,
        pinterest: mockPinterest,
        reddit: mockReddit,
        telegram: mockTelegram,
        webhook: mockWebhook
      }
    });

    expect(outcome.day).toBe(3);
    expect(outcome.summary.total).toBe(7);
    expect(outcome.summary.successful).toBe(5);
    expect(outcome.summary.skipped).toBe(2);
    expect(outcome.summary.failed).toBe(0);
    expect(outcome.platforms.x.postId).toBe('x_123');
    expect(outcome.platforms.instagram.postId).toBe('insta_456');
  });

  it('ensures partial failure on one platform does not block others', async () => {
    const mockX = {
      publish: vi.fn().mockResolvedValue({ status: 'success', postId: 'x_123', success: true })
    };
    const mockPinterestFailing = {
      publish: vi.fn().mockResolvedValue({ status: 'failed', success: false, error: 'Rate limit exceeded (429)' })
    };
    const mockInsta = {
      publish: vi.fn().mockResolvedValue({ status: 'success', postId: 'insta_456', success: true })
    };

    const outcome = await SocialCampaignCoordinator.coordinatePublish({
      payload: samplePayload,
      localSlidePaths: ['/tmp/slide-1.png'],
      specialists: {
        x: mockX,
        pinterest: mockPinterestFailing,
        instagram: mockInsta
      }
    });

    expect(outcome.summary.total).toBe(3);
    expect(outcome.summary.successful).toBe(2);
    expect(outcome.summary.failed).toBe(1);
    expect(outcome.platforms.pinterest.status).toBe('failed');
    expect(outcome.platforms.pinterest.error).toContain('Rate limit');
    expect(outcome.platforms.x.status).toBe('success');
    expect(outcome.platforms.instagram.status).toBe('success');
  });

  it('TelegramSpecialist gracefully skips when no token is present', async () => {
    const outcome = await TelegramSpecialist.publish({
      payload: samplePayload,
      config: { telegramBotToken: null }
    });
    expect(outcome.platform).toBe('telegram');
    expect(outcome.status).toBe('skipped');
  });

  it('WebhookSpecialist gracefully skips when no webhook URL is present', async () => {
    const outcome = await WebhookSpecialist.publish({
      payload: samplePayload,
      config: { discordWebhookUrl: null }
    });
    expect(outcome.platform).toBe('webhook');
    expect(outcome.status).toBe('skipped');
  });
});
