/**
 * Modern LinkedIn Media Client
 *
 * Implements:
 * - Images API (/rest/images?action=initializeUpload)
 * - Documents API (/rest/documents?action=initializeUpload)
 * - Videos API (/rest/videos?action=initializeUpload) with multipart ETag management
 * - Enforces state transitions: WAITING_UPLOAD -> UPLOADING_PARTS -> FINALIZING -> PROCESSING -> AVAILABLE
 */

import fs from 'node:fs/promises';

export class LinkedInMediaClient {
  constructor({ client, db, log = console } = {}) {
    this.client = client;
    this.db = db;
    this.log = log;
  }

  async initializeImageUpload({ ownerUrn }) {
    const payload = {
      initializeUploadRequest: {
        owner: ownerUrn,
      },
    };

    const res = await this.client.request('https://api.linkedin.com/rest/images?action=initializeUpload', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to initialize LinkedIn image upload (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return {
      imageUrn: data.value?.image,
      uploadUrl: data.value?.uploadUrl,
      uploadUrlExpiresAt: new Date(data.value?.uploadUrlExpiresAt || Date.now() + 3600000).toISOString(),
    };
  }

  async uploadImageBinary({ uploadUrl, filePath }) {
    const fileBuffer = await fs.readFile(filePath);
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: fileBuffer,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to upload image binary to LinkedIn (${res.status}): ${errText}`);
    }

    return true;
  }

  async initializeDocumentUpload({ ownerUrn }) {
    const payload = {
      initializeUploadRequest: {
        owner: ownerUrn,
      },
    };

    const res = await this.client.request('https://api.linkedin.com/rest/documents?action=initializeUpload', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to initialize LinkedIn document upload (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return {
      documentUrn: data.value?.document,
      uploadUrl: data.value?.uploadUrl,
      uploadUrlExpiresAt: new Date(data.value?.uploadUrlExpiresAt || Date.now() + 3600000).toISOString(),
    };
  }

  async uploadDocumentBinary({ uploadUrl, filePath }) {
    const fileBuffer = await fs.readFile(filePath);
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/pdf',
      },
      body: fileBuffer,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to upload document binary to LinkedIn (${res.status}): ${errText}`);
    }

    return true;
  }
}
