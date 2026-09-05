export const UTM_CAMPAIGN = 'writon_growth_2026_09';
export const PLAY_STORE_BASE = 'https://play.google.com/store/apps/details?id=com.ibitvalley.writon';
export const PLATFORMS = {
  ig: 'instagram',
  threads: 'threads',
  x: 'x',
  pin: 'pinterest',
  fb: 'facebook_group'
};

export function buildPlayStoreRedirectUrl(deliveryId, platform) {
  const source = PLATFORMS[platform];
  const medium = 'organic_social';
  const referrer = `utm_source=${source}&utm_medium=${medium}&utm_campaign=${UTM_CAMPAIGN}&utm_content=${deliveryId}`;
  return `${PLAY_STORE_BASE}&referrer=${encodeURIComponent(referrer)}`;
}

export function parseDeliveryId(deliveryId) {
  if (!deliveryId || typeof deliveryId !== 'string') {
    return { valid: false };
  }
  
  const regex = /^(\d{4})_d(\d+)_([a-z]+)_.+$/;
  const match = deliveryId.match(regex);
  if (!match) {
    return { valid: false };
  }
  
  const platform = match[3];
  if (!PLATFORMS[platform]) {
    return { valid: false };
  }
  
  return { valid: true, platform };
}
