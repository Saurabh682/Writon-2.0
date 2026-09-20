# YouTube Data API v3 Reference Directory (`youtube_api_reference.md`)

> **Protocol**: REST + Google Resumable Media Protocol  
> **Auth**: Bearer Token (`Authorization: Bearer <token>`) or API Key (`?key=<api_key>`)  
> **Base URL**: `https://www.googleapis.com/youtube/v3`  
> **Upload URL**: `https://www.googleapis.com/upload/youtube/v3`

---

## 1. Authentication & Token Management

### 1.1 Refresh Access Token
- **Method & URL**: `POST https://oauth2.googleapis.com/token`
- **Headers**: `Content-Type: application/x-www-form-urlencoded`
- **Body**:
  ```
  client_id={CLIENT_ID}&client_secret={CLIENT_SECRET}&refresh_token={REFRESH_TOKEN}&grant_type=refresh_token
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "access_token": "ya29.a0AfH6S...",
    "expires_in": 3599,
    "scope": "https://www.googleapis.com/auth/youtube.upload",
    "token_type": "Bearer"
  }
  ```

---

## 2. Resumable Video Upload (Shorts & Standard Videos)

### 2.1 Initiate Resumable Upload Session
- **Method & URL**: `POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`
- **Headers**:
  - `Authorization: Bearer {ACCESS_TOKEN}`
  - `Content-Type: application/json; charset=UTF-8`
  - `X-Upload-Content-Type: video/mp4`
  - `X-Upload-Content-Length: {FILE_SIZE_BYTES}`
- **Body**:
  ```json
  {
    "snippet": {
      "title": "On Beginning Scenes | WritOn Writing Prompt #Shorts",
      "description": "Notice the small gesture before the speech begins. Download WritOn at https://writon.cc",
      "tags": ["writing", "writingprompts", "craft", "author", "Shorts"],
      "categoryId": "27"
    },
    "status": {
      "privacyStatus": "public",
      "selfDeclaredMadeForKids": false
    }
  }
  ```
- **Response**: `200 OK` with header `Location: {RESUMABLE_UPLOAD_URI}`.

### 2.2 Upload Video File Stream / Buffer
- **Method & URL**: `PUT {RESUMABLE_UPLOAD_URI}`
- **Headers**:
  - `Content-Type: video/mp4`
  - `Content-Length: {FILE_SIZE_BYTES}`
- **Body**: Raw video binary buffer.
- **Success Response (200 / 201 Created)**:
  ```json
  {
    "kind": "youtube#video",
    "id": "dQw4w9WgXcQ",
    "snippet": { "title": "..." },
    "status": { "uploadStatus": "uploaded", "privacyStatus": "public" }
  }
  ```

---

## 3. Video Metadata & Performance Metrics

### 3.1 Fetch Video Analytics & Public Stats
- **Method & URL**: `GET https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,status&id={VIDEO_ID}`
- **Headers**: `Authorization: Bearer {ACCESS_TOKEN}` (or query param `key={API_KEY}`)
- **Success Response (200 OK)**:
  ```json
  {
    "items": [
      {
        "id": "{VIDEO_ID}",
        "statistics": {
          "viewCount": "1250",
          "likeCount": "84",
          "commentCount": "12"
        }
      }
    ]
  }
  ```

---

## 4. Search & Community Scouting

### 4.1 Search Videos by Keyword / Topic
- **Method & URL**: `GET https://www.googleapis.com/youtube/v3/search?part=snippet&q={KEYWORD}&type=video&maxResults={LIMIT}&order=date`
- **Headers**: `Authorization: Bearer {ACCESS_TOKEN}` or `key={API_KEY}`
- **Quota Cost**: 100 units.
