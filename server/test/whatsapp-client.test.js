import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WhatsAppClient } from '../src/services/whatsapp-client.js';

describe('WhatsAppClient (Zero-Dep Ponytail Implementation)', () => {
  const mockConfig = {
    accessToken: 'test_meta_token_123',
    phoneNumberId: '1239762972564178',
    wabaId: '25002526842541',
    verifyToken: 'test_verify_token_secret',
  };

  let client;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    client = new WhatsAppClient(mockConfig);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('detects configuration status correctly', () => {
    expect(client.isConfigured()).toBe(true);

    const emptyClient = new WhatsAppClient({});
    expect(emptyClient.isConfigured()).toBe(false);
  });

  it('sanitizes phone numbers into clean international format', () => {
    expect(client.sanitizePhoneNumber('+91 81780 55817')).toBe('918178055817');
    expect(client.sanitizePhoneNumber('91-987-654-3210')).toBe('919876543210');
  });

  it('successfully fetches WABA details', async () => {
    const mockWabaResponse = {
      id: '25002526842541',
      name: 'WritOn',
      account_review_status: 'APPROVED',
      business_verification_status: 'VERIFIED',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockWabaResponse,
    });

    const res = await client.getWabaDetails();
    expect(res).toEqual(mockWabaResponse);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('25002526842541?fields='),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test_meta_token_123',
        }),
      })
    );
  });

  it('sends text messages within customer care window', async () => {
    const mockSuccessResponse = {
      messaging_product: 'whatsapp',
      contacts: [{ input: '918178055817', wa_id: '918178055817' }],
      messages: [{ id: 'wamid.HBgLM...==' }],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSuccessResponse,
    });

    const result = await client.sendTextMessage({
      to: '+91 81780 55817',
      text: 'Hello from WritOn craft assistant',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('wamid.HBgLM...==');
  });

  it('sends template message with image header and action button', async () => {
    const mockTemplateResponse = {
      messaging_product: 'whatsapp',
      messages: [{ id: 'wamid.TEMPLATE123' }],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockTemplateResponse,
    });

    const result = await client.sendTemplateMessage({
      to: '+91 81780 55817',
      templateName: 'writon_craft_story',
      headerImageUrl: 'https://writon.cc/cards/whatsapp_tactile_sanctuary.png',
      bodyParameters: ['Perhaps the most radical feature of a book...'],
      buttonParameters: ['the-tactile-sanctuary'],
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('wamid.TEMPLATE123');

    const sentPayload = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(sentPayload.template.name).toBe('writon_craft_story');
    expect(sentPayload.template.components[0].parameters[0].image.link).toBe(
      'https://writon.cc/cards/whatsapp_tactile_sanctuary.png'
    );
  });

  it('handles Meta 429 rate limit with retry', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: false,
          status: 429,
          json: async () => ({ error: { message: 'Too Many Requests', code: 4 } }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ messages: [{ id: 'wamid.RETRY_SUCCESS' }] }),
      };
    });

    const result = await client.sendTextMessage({
      to: '918178055817',
      text: 'Test retry message',
    });

    expect(callCount).toBe(2);
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('wamid.RETRY_SUCCESS');
  });

  it('verifies Meta webhook challenge handshake correctly', () => {
    const validQuery = {
      'hub.mode': 'subscribe',
      'hub.verify_token': 'test_verify_token_secret',
      'hub.challenge': 'CHALLENGE_ACCEPTED_123',
    };

    const verified = client.verifyWebhook(validQuery);
    expect(verified.valid).toBe(true);
    expect(verified.challenge).toBe('CHALLENGE_ACCEPTED_123');

    const invalidQuery = {
      'hub.mode': 'subscribe',
      'hub.verify_token': 'wrong_token',
      'hub.challenge': '123',
    };
    expect(client.verifyWebhook(invalidQuery).valid).toBe(false);
  });
});
