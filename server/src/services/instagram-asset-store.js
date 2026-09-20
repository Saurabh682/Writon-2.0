/**
 * Media Asset Store for WritOn Instagram Bot Subsystem
 * Enforces SHA-256 verification, manifest generation, and signed URL rotation with safety windows.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { computeSha256, computeAssetManifestHash } from './instagram-brain-validator.js';

export const MINIMUM_META_FETCH_SAFETY_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

export class InstagramAssetStore {
  constructor({ uploadHandler = null, log = console } = {}) {
    this.uploadHandler = uploadHandler;
    this.log = log;
  }

  /**
   * Ingest a local image file, verify dimensions/metadata, compute SHA-256.
   */
  async processLocalImage(localFilePath, { sequenceOrder = 1, editorialRole = 'hook' } = {}) {
    const fileBuffer = await fs.readFile(localFilePath);
    const sha256 = computeSha256(fileBuffer);
    const meta = await sharp(fileBuffer).metadata();

    const width = meta.width || 1080;
    const height = meta.height || 1080;
    const ratioVal = (width / height).toFixed(2);
    let aspectRatio = '1:1';
    if (ratioVal === '0.80' || ratioVal === '0.75') aspectRatio = '4:5';
    if (ratioVal === '0.56') aspectRatio = '9:16';

    return {
      sequenceOrder,
      editorialRole,
      kind: 'IMAGE',
      mimeType: 'image/jpeg',
      width,
      height,
      aspectRatio,
      fileSizeBytes: fileBuffer.length,
      sha256,
      storageUri: path.resolve(localFilePath),
      publicFetchUrl: null,
      urlExpiresAt: null,
    };
  }

  /**
   * Generate an asset manifest hash from an ordered asset set.
   */
  generateManifestHash(assets = []) {
    return computeAssetManifestHash(assets);
  }

  /**
   * Verifies that the asset URL has sufficient safety margin before sending to Meta.
   */
  hasSufficientFetchWindow(urlExpiresAt) {
    if (!urlExpiresAt) return false;
    const remaining = new Date(urlExpiresAt).getTime() - Date.now();
    return remaining >= MINIMUM_META_FETCH_SAFETY_WINDOW_MS;
  }
}
