# LinkedIn Marketing API v202609 Reference (`linkedin_api_reference.md`)

> **Active API Version**: `202609`  
> **Protocol**: Restli 2.0.0 (`X-Restli-Protocol-Version: 2.0.0`)  
> **Base URL**: `https://api.linkedin.com`

---

## 1. Authentication & Headers

All requests to LinkedIn Marketing API endpoints must carry:

```http
Authorization: Bearer <ACCESS_TOKEN>
Linkedin-Version: 202609
X-Restli-Protocol-Version: 2.0.0
Content-Type: application/json
```

---

## 2. Posts API (`/rest/posts`)

### 2.1 Create Post (Member or Organization)

```http
POST https://api.linkedin.com/rest/posts
```

#### Request Payload:

```json
{
  "author": "urn:li:person:jx3WhMPaS0",
  "commentary": "“NEVER WRITE: 'HE WAS HAPPY.'”\n\nGive the reader one physical action...",
  "visibility": "PUBLIC",
  "distribution": {
    "feedDistribution": "MAIN_FEED",
    "targetEntities": [],
    "thirdPartyDistributionChannels": []
  },
  "content": {
    "media": {
      "title": "Craft Truth: Show the Physical Action",
      "id": "urn:li:image:D5622AQG..."
    }
  },
  "lifecycleState": "PUBLISHED",
  "isReshareDisabledByAuthor": false
}
```

#### Response:
- **HTTP 201 Created**
- Response header: `x-restli-id: urn:li:share:7240123456789012345`

---

## 3. Media Upload APIs

### 3.1 Initialize Image Upload (`/rest/images`)

```http
POST https://api.linkedin.com/rest/images?action=initializeUpload
```

```json
{
  "initializeUploadRequest": {
    "owner": "urn:li:person:jx3WhMPaS0"
  }
}
```

Response returns `image` URN and `uploadUrl`.

### 3.2 Initialize Document Upload (`/rest/documents`)

```http
POST https://api.linkedin.com/rest/documents?action=initializeUpload
```

```json
{
  "initializeUploadRequest": {
    "owner": "urn:li:person:jx3WhMPaS0"
  }
}
```

Response returns `document` URN and `uploadUrl`.

### 3.3 Initialize Multipart Video Upload (`/rest/videos`)

```http
POST https://api.linkedin.com/rest/videos?action=initializeUpload
```

```json
{
  "initializeUploadRequest": {
    "owner": "urn:li:person:jx3WhMPaS0",
    "fileSizeBytes": 15420100,
    "uploadCaptions": false,
    "uploadThumbnail": false
  }
}
```

Response returns `video` URN and part upload URLs with token.

---

## 4. Analytics Endpoints

| Surface | Endpoint | Scope Required |
| :--- | :--- | :--- |
| **Member Post** | `/rest/memberCreatorPostAnalytics?postUrn={postUrn}` | Member creator analytics grant |
| **Member Video** | `/rest/memberCreatorVideoAnalytics?videoUrn={videoUrn}` | Member creator analytics grant |
| **Org Share** | `/rest/organizationalEntityShareStatistics?shares=List({shareUrn})` | `r_organization_social` |
