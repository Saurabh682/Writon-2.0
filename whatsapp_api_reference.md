# 📚 WhatsApp Business Cloud API & MM API Reference
**Version**: Meta Graph API `v20.0` / `v21.0` / `v25.0`  
**Base URL**: `https://graph.facebook.com`  

---

## 1. Core Endpoints

### 1.1 Account & Verification Inspection
* **`GET /{Version}/{WABA-ID}`**
  * **Headers**: `Authorization: Bearer <TOKEN>`
  * **Query Parameters**: `fields=id,name,timezone_id,account_review_status,business_verification_status,country,ownership_type,primary_business_location,marketing_messages_onboarding_status`
  * **Returns**: JSON account metadata, review status (`APPROVED`), and verification status (`VERIFIED`).

### 1.2 Send Template Message (Standard Cloud API)
* **`POST /{Version}/{PHONE_NUMBER_ID}/messages`**
  * **Headers**: `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`
  * **Payload**:
    ```json
    {
      "messaging_product": "whatsapp",
      "recipient_type": "individual",
      "to": "+919876543210",
      "type": "template",
      "template": {
        "name": "writon_story_invite",
        "language": { "code": "en_US" },
        "components": [
          {
            "type": "header",
            "parameters": [
              {
                "type": "image",
                "image": { "link": "https://writon.cc/cards/whatsapp_tactile_sanctuary.png" }
              }
            ]
          },
          {
            "type": "body",
            "parameters": [
              { "type": "text", "text": "Perhaps the most radical feature of a book..." }
            ]
          }
        ]
      }
    }
    ```

### 1.3 Send Freeform Service Message (Within 24h Window)
* **`POST /{Version}/{PHONE_NUMBER_ID}/messages`**
  * **Payload**:
    ```json
    {
      "messaging_product": "whatsapp",
      "recipient_type": "individual",
      "to": "+919876543210",
      "type": "text",
      "text": { "body": "Here is your quiet craft prompt for today..." }
    }
    ```

### 1.4 Send via Marketing Messages API (MM API)
* **`POST /{Version}/{PHONE_NUMBER_ID}/marketing_messages`**
  * **Payload**:
    ```json
    {
      "messaging_product": "whatsapp",
      "recipient_type": "individual",
      "to": "+919876543210",
      "message_activity_sharing": true,
      "type": "template",
      "template": { ... }
    }
    ```

### 1.5 Media Upload Endpoint
* **`POST /{Version}/{PHONE_NUMBER_ID}/media`**
  * **Headers**: `Authorization: Bearer <TOKEN>`
  * **FormData**: `file`, `type: image/png`, `messaging_product: whatsapp`
  * **Returns**: `{ "id": "<MEDIA_ID>" }`
