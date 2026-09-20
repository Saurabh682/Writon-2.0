const SAFE_FCM_LABEL = /[^a-zA-Z0-9\-_.~%]+/g;

/** Builds a privacy-safe, FCM-compatible analytics label (maximum 50 characters). */
export function toFcmAnalyticsLabel(...segments) {
  const normalized = segments
    .filter((segment) => segment !== null && segment !== undefined)
    .map((segment) => String(segment).trim())
    .filter(Boolean)
    .join('_')
    .replace(SAFE_FCM_LABEL, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
  return normalized || 'writon';
}
