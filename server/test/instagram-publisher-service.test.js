import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InstagramPublisherService } from '../src/services/instagram-publisher-service.js';
import { InstagramAssetStore } from '../src/services/instagram-asset-store.js';

describe('InstagramPublisherService & Idempotency Invariant Tests', () => {
  let publisher;
  let mockDb;
  let mockClient;
  let mockValidator;
  let assetStore;
  let mockCoordinator;

  const validAssets = [
    {
      id: 'asset_01',
      sequenceOrder: 1,
      editorialRole: 'hook',
      kind: 'IMAGE',
      aspectRatio: '1:1',
      fileSizeBytes: 1024,
      sha256: 'sha_valid_123',
      width: 1080,
      height: 1080,
      public_fetch_url: 'https://writon.cc/assets/test.jpg',
      url_expires_at: new Date(Date.now() + 3600000).toISOString(),
    },
  ];

  beforeEach(() => {
    assetStore = new InstagramAssetStore();
    const manifestHash = assetStore.generateManifestHash(validAssets);

    mockDb = {
      getCandidateVersion: vi.fn().mockResolvedValue({
        id: 'ver_123',
        candidate_id: 'cand_456',
        revision: 1,
        format: 'FEED_SINGLE',
        caption: '“A sentence left in the dark.”',
        content_hash: 'content_hash_123',
        asset_manifest_hash: manifestHash,
        governance_bundle_hash: 'gov_hash_123',
        approved_at: new Date().toISOString(),
      }),
      getAssetsForVersion: vi.fn().mockResolvedValue(validAssets),
      recordValidationRun: vi.fn().mockResolvedValue({ id: 'run_1' }),
      getOrCreatePublishIntent: vi.fn().mockResolvedValue({
        id: 'intent_789',
        publish_key: 'ver_123_PRIMARY',
        status: 'PENDING',
      }),
      recordContainer: vi.fn().mockResolvedValue({ id: 'cont_row_1' }),
      updateContainerStatus: vi.fn().mockResolvedValue({ id: 'cont_row_1' }),
      recordPublishAttempt: vi.fn().mockResolvedValue({ id: 'attempt_1' }),
      resolvePublishAttempt: vi.fn().mockResolvedValue({ id: 'attempt_1' }),
      confirmPublication: vi.fn().mockResolvedValue({
        id: 'pub_live_100',
        ig_media_id: 'ig_media_999',
        permalink: 'https://instagram.com/p/live_999/',
      }),
      recordReconciliationCheck: vi.fn().mockResolvedValue({ id: 'recon_1' }),
      quarantinePublishIntent: vi.fn().mockResolvedValue({ id: 'intent_789', status: 'QUARANTINED' }),
    };

    mockClient = {
      getCapabilities: vi.fn().mockReturnValue({ feed_publish: true, carousel_publish: true, reel_publish: true }),
      getPublishingQuota: vi.fn().mockResolvedValue({ quotaUsage: 5, quotaTotal: 50 }),
      createContainer: vi.fn().mockResolvedValue('meta_cont_111'),
      pollContainerStatus: vi.fn().mockResolvedValue({ status: 'FINISHED', containerId: 'meta_cont_111' }),
      publishContainer: vi.fn().mockResolvedValue({ igMediaId: 'ig_media_999', permalink: 'https://instagram.com/p/live_999/' }),
    };

    mockValidator = {
      validateCandidate: vi.fn().mockResolvedValue({ passed: true, results: [] }),
    };

    publisher = new InstagramPublisherService({
      instagramDb: mockDb,
      instagramClient: mockClient,
      validator: mockValidator,
      assetStore,
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });

    mockCoordinator = {
      validateOrReserve: vi.fn().mockResolvedValue({ success: true }),
      db: { updateDispatchStatus: vi.fn().mockResolvedValue({}) }
    };
  });

  it('Invariant 1: Approved candidate cannot silently substitute different asset SHA', async () => {
    // Tamper with asset sha256
    const tamperedAssets = [{ ...validAssets[0], sha256: 'tampered_sha_999' }];
    mockDb.getAssetsForVersion.mockResolvedValue(tamperedAssets);

    await expect(
      publisher.publishCandidateVersion('ver_123', { publicationRole: 'PRIMARY', coordinator: mockCoordinator })
    ).rejects.toThrow(/Asset manifest hash mismatch/);
  });

  it('Invariant 2: Normalizes publication_role and rejects invalid free-form roles', async () => {
    mockDb.getOrCreatePublishIntent.mockImplementation((vId, role) => {
      const normalized = role.toUpperCase();
      if (!['PRIMARY', 'COMPANION_STORY'].includes(normalized)) {
        throw new Error(`Invalid publication_role: ${role}`);
      }
      return { id: 'intent_789', publish_key: `${vId}_${normalized}` };
    });

    await expect(
      publisher.publishCandidateVersion('ver_123', { publicationRole: 'random_custom_role', coordinator: mockCoordinator })
    ).rejects.toThrow(/Invalid publication_role/);
  });

  it('Invariant 3: Definitive Meta rejection (HTTP 4xx) becomes EXPLICIT_FAIL, never UNKNOWN', async () => {
    const metaError = new Error('Invalid OAuth access token');
    metaError.status = 400;
    metaError.metaError = { code: 190, message: 'Invalid OAuth' };
    mockClient.publishContainer.mockRejectedValue(metaError);

    await expect(
      publisher.publishCandidateVersion('ver_123', { publicationRole: 'PRIMARY', coordinator: mockCoordinator })
    ).rejects.toThrow(/Invalid OAuth/);

    expect(mockDb.resolvePublishAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'EXPLICIT_FAIL' })
    );
    expect(mockDb.quarantinePublishIntent).not.toHaveBeenCalled();
  });

  it('Invariant 4: Transport ambiguity (network disconnect) enters TIMEOUT_UNKNOWN and quarantines intent without auto-retry', async () => {
    const transportError = new Error('ECONNRESET connection lost');
    mockClient.publishContainer.mockRejectedValue(transportError);

    await expect(
      publisher.publishCandidateVersion('ver_123', { publicationRole: 'PRIMARY', coordinator: mockCoordinator })
    ).rejects.toThrow(/QUARANTINED/);

    expect(mockDb.resolvePublishAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'TIMEOUT_UNKNOWN' })
    );
    expect(mockDb.recordReconciliationCheck).toHaveBeenCalled();
    expect(mockDb.quarantinePublishIntent).toHaveBeenCalledWith('intent_789');
  });

  it('Invariant 5: Successful publication records atomic confirmation and live permalink', async () => {
    const result = await publisher.publishCandidateVersion('ver_123', { publicationRole: 'PRIMARY', coordinator: mockCoordinator });
    expect(result.success).toBe(true);
    expect(result.igMediaId).toBe('ig_media_999');
    expect(mockDb.confirmPublication).toHaveBeenCalled();
  });
});
