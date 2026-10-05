import crypto from 'node:crypto';

/**
 * WhatsApp Business Cloud API & Marketing Messages API Client.
 *
 * Implements Dietrich Gebert's Ponytail Principle:
 * - Zero third-party SDK dependencies (native Node.js fetch only)
 * - Exponential backoff on HTTP 429 and transient 500 errors
 * - Automated token and parameter validation
 * - Standardized return contract: { success, status, messageId, data, error }
 */
export class WhatsAppClient {
  constructor(config = {}) {
    this.accessToken = config.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = config.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.wabaId = config.wabaId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
    this.apiVersion = config.apiVersion || process.env.WHATSAPP_API_VERSION || 'v20.0';
    this.baseUrl = config.baseUrl || 'https://graph.facebook.com';
    this.verifyToken = config.verifyToken || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';
  }

  /**
   * Checks if required credentials are configured.
   */
  isConfigured() {
    return Boolean(this.accessToken && this.phoneNumberId);
  }

  /**
   * Internal fetch wrapper with rate-limit retry & backoff.
   */
  async _request(endpoint, { method = 'GET', body = null, headers = {} } = {}, maxRetries = 3) {
    const url = `${this.baseUrl}/${this.apiVersion}/${endpoint.replace(/^\//, '')}`;
    const reqHeaders = {
      Authorization: `Bearer ${this.accessToken}`,
      'User-Agent': 'WritOn-WhatsApp-Bot/1.0',
      ...headers,
    };

    if (body && !reqHeaders['Content-Type']) {
      reqHeaders['Content-Type'] = 'application/json';
    }

    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: reqHeaders,
          body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
        });

        const data = await response.json().catch(() => ({}));

        // HTTP 429 or transient Meta 500/is_transient error -> Exponential Backoff
        if (response.status === 429 || (data?.error && data.error.is_transient)) {
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        }

        if (!response.ok) {
          const err = new Error(data?.error?.message || `WhatsApp API error: ${response.statusText}`);
          err.status = response.status;
          err.code = data?.error?.code;
          err.subcode = data?.error?.error_subcode;
          err.data = data;
          throw err;
        }

        return data;
      } catch (err) {
        lastError = err;
        if (attempt >= maxRetries || err.status === 400 || err.status === 401 || err.status === 403) {
          throw err;
        }
      }
    }

    throw lastError;
  }

  /**
   * Fetches WhatsApp Business Account details, verification and review status.
   */
  async getWabaDetails(fields = 'id,name,timezone_id,account_review_status,business_verification_status,marketing_messages_onboarding_status') {
    if (!this.wabaId) {
      throw new Error('WHATSAPP_BUSINESS_ACCOUNT_ID is required to fetch account details');
    }
    return this._request(`${this.wabaId}?fields=${encodeURIComponent(fields)}`);
  }

  /**
   * Lists users and system users assigned to the WhatsApp Business Account.
   */
  async getAssignedUsers(businessId, fields = 'id,name,business,user_type') {
    if (!this.wabaId) {
      throw new Error('WHATSAPP_BUSINESS_ACCOUNT_ID is required to list assigned users');
    }
    const query = new URLSearchParams({
      business: businessId,
      fields,
    });
    return this._request(`${this.wabaId}/assigned_users?${query.toString()}`);
  }

  /**
   * Programmatically assigns a user/system user to the WhatsApp Business Account with specific tasks.
   * Tasks: 'MANAGE', 'MESSAGING', 'MANAGE_TEMPLATES', 'DEVELOP', 'MANAGE_PHONE'
   */
  async assignUserToWaba(userId, tasks = ['MANAGE', 'MESSAGING', 'MANAGE_TEMPLATES', 'DEVELOP']) {
    if (!this.wabaId) {
      throw new Error('WHATSAPP_BUSINESS_ACCOUNT_ID is required to assign user');
    }
    const body = new URLSearchParams();
    body.append('user', userId);
    tasks.forEach((t) => body.append('tasks[]', t));

    return this._request(`${this.wabaId}/assigned_users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  }

  /**
   * Removes a user's access from the WhatsApp Business Account.
   */
  async removeUserFromWaba(userId) {
    if (!this.wabaId) {
      throw new Error('WHATSAPP_BUSINESS_ACCOUNT_ID is required to remove user');
    }
    const body = new URLSearchParams({ user: userId });
    return this._request(`${this.wabaId}/assigned_users`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  }

  /**
   * Sends a freeform text message (applicable within 24h customer care window).
   */
  async sendTextMessage({ to, text, previewUrl = false }) {
    if (!to || !text) {
      throw new Error('Both "to" and "text" are required to send a WhatsApp text message');
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.sanitizePhoneNumber(to),
      type: 'text',
      text: {
        preview_url: Boolean(previewUrl),
        body: String(text),
      },
    };

    const res = await this._request(`${this.phoneNumberId}/messages`, {
      method: 'POST',
      body: payload,
    });

    const messageId = res?.messages?.[0]?.id || null;
    return {
      success: true,
      status: 'sent',
      messageId,
      data: res,
    };
  }

  /**
   * Sends a pre-approved template message (initiates conversations, app invites, story cards).
   * Supports standard Cloud API and Marketing Messages API (MM API).
   */
  async sendTemplateMessage({
    to,
    templateName,
    languageCode = 'en_US',
    headerImageUrl = null,
    bodyParameters = [],
    buttonParameters = [],
    useMarketingApi = false,
  }) {
    if (!to || !templateName) {
      throw new Error('Both "to" and "templateName" are required to send a template message');
    }

    const components = [];

    // Header image component
    if (headerImageUrl) {
      components.push({
        type: 'header',
        parameters: [
          {
            type: 'image',
            image: { link: headerImageUrl },
          },
        ],
      });
    }

    // Body variables
    if (bodyParameters && bodyParameters.length > 0) {
      components.push({
        type: 'body',
        parameters: bodyParameters.map((val) => ({
          type: 'text',
          text: String(val),
        })),
      });
    }

    // Dynamic button parameters
    if (buttonParameters && buttonParameters.length > 0) {
      buttonParameters.forEach((param, index) => {
        components.push({
          type: 'button',
          sub_type: 'url',
          index: String(index),
          parameters: [
            {
              type: 'text',
              text: String(param),
            },
          ],
        });
      });
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.sanitizePhoneNumber(to),
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components.length > 0 ? { components } : {}),
      },
    };

    if (useMarketingApi) {
      payload.message_activity_sharing = true;
    }

    const endpoint = useMarketingApi
      ? `${this.phoneNumberId}/marketing_messages`
      : `${this.phoneNumberId}/messages`;

    const res = await this._request(endpoint, {
      method: 'POST',
      body: payload,
    });

    const messageId = res?.messages?.[0]?.id || null;
    return {
      success: true,
      status: 'sent',
      messageId,
      data: res,
    };
  }

  /**
   * Verifies incoming Meta Webhook handshake (GET hub.mode, hub.verify_token, hub.challenge).
   */
  verifyWebhook(query = {}) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === this.verifyToken) {
      return { valid: true, challenge };
    }
    return { valid: false, challenge: null };
  }

  /**
   * Sanitizes E.164 phone numbers (e.g. "+91 81780 55817" -> "918178055817").
   */
  sanitizePhoneNumber(phone) {
    return String(phone).replace(/[^\d]/g, '');
  }
}
