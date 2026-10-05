# 📜 Operational Standards & Compliance Rules: WhatsApp Business Cloud API
**Target**: Meta WhatsApp Business Platform (Cloud API & Marketing Messages API)  
**Version**: 1.0.0 • **Last Updated**: 2026-09-26  
**Ecosystem**: WritOn Autonomous Multi-Platform Bot Fleet  

---

## 1. Authentication & Credentials
* **Scheme**: Bearer Token Authorization (`Authorization: Bearer <ACCESS_TOKEN>`).
* **Token Types**:
  * **System User Permanent Token** (`WHATSAPP_ACCESS_TOKEN`): Generated via Meta Business Suite under System Users. Non-expiring. Required for production automation.
  * **Temporary Developer Token**: Valid for 24 hours. Used for local sandbox testing only.
* **Phone Number ID** (`WHATSAPP_PHONE_NUMBER_ID`): Unique identifier for the sending phone number (e.g. `1239762972564178`).
* **WABA ID** (`WHATSAPP_BUSINESS_ACCOUNT_ID`): WhatsApp Business Account identifier.
* **Webhook Verify Token** (`WHATSAPP_WEBHOOK_VERIFY_TOKEN`): Shared secret configured in Meta App Dashboard for webhook challenge handshakes.

---

## 2. Rate Limits & Tier Discipline
* **Starting Messaging Limit**: **Tier 250** (250 business-initiated unique recipients per rolling 24-hour window).
* **Tier Progression**: `250` $\rightarrow$ `2,000` $\rightarrow$ `10,000` $\rightarrow$ `100,000` $\rightarrow$ `Unlimited`.
  * Meta upgrades the tier automatically within 24 hours based on:
    * High message quality score (Low block/report rate).
    * Sending $\ge 50\%$ of current tier limit over 7 rolling days.
* **Inbound / Service Messaging (24-Hour Customer Care Window)**:
  * Inbound messages from readers are completely free.
  * The business can send free-form replies (craft prompts, feedback, reading recommendations) within 24 hours of the last reader message.
  * Up to 1,000 free service messages/month per business phone number.
* **429 Rate Limit Handling**:
  * Any `429 Too Many Requests` or `is_transient: true` must sleep for exponential backoff: `Math.pow(2, attempt) * 1000 + jitter`. Retry up to 3 times before failing.

---

## 3. Pre-Dispatch Governance & Single-Delivery Invariant
* **Pre-Dispatch Intent**:
  * Generate deterministic delivery ID: `generateDeliveryId({ campaign, slotId, platform: 'whatsapp', surface, content })`.
  * Bind to cryptographic `content_hash` (SHA-256).
  * Persist reservation and `in_flight` intent in `public.editorial_insight_dispatches` **before** making external API calls.
  * Never hold database transactions open during remote network requests.
* **Strict Anti-Spam / Anti-Slop Policy**:
  * **Zero Synthetic Clichés**: Texts must not contain forbidden AI markers (*delve, tapestry, beacon, testament, realm*).
  * **Direct Value First**: Never send generic marketing blasts or fake personalization (*"Hey friend"*). Lead with the craft observation or excerpt.
  * **Default Safe Mode (`--dry-run`)**: All CLI scripts and test runners must run with `--dry-run` by default. **NEVER POST TEST THINGS ONLINE**.

---

## 4. Error Code Directory
* `100` (`OAuthException`): Invalid parameter or malformed request payload.
* `190` (subcode `463`): Expired or invalid access token. Must trigger alert to refresh System User token.
* `200` (subcode `1349174`): Forbidden. Insufficient permissions on the system user or asset not assigned.
* `803`: WABA ID or Phone Number ID not found. Verify IDs against Meta Developer App dashboard.
* `131030`: Recipient phone number not in WhatsApp directory or sandbox allowed list.
* `132000`: Template does not exist or language mismatch.
