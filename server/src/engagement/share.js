const ALLOWED_SOURCE = /^[a-z0-9_-]{1,40}$/i;

export function buildTrackedStoryUrl(storyUrl, { source = 'author_share', medium = 'share', campaign = 'story_publish', destination } = {}) {
  const url = new URL(storyUrl);
  url.searchParams.set('utm_source', ALLOWED_SOURCE.test(source) ? source : 'author_share');
  url.searchParams.set('utm_medium', ALLOWED_SOURCE.test(medium) ? medium : 'share');
  url.searchParams.set('utm_campaign', ALLOWED_SOURCE.test(campaign) ? campaign : 'story_publish');
  if (destination && ALLOWED_SOURCE.test(destination)) url.searchParams.set('utm_content', destination);
  return url.toString();
}

export function buildSharePayload({ storyUrl, title, excerpt = '', author = '', destination }) {
  const url = buildTrackedStoryUrl(storyUrl, { destination });
  const cleanExcerpt = String(excerpt).replace(/\s+/g, ' ').trim().slice(0, 220);
  const text = [title, cleanExcerpt ? `“${cleanExcerpt}”` : '', author ? `— ${author} on WritOn` : 'Read on WritOn'].filter(Boolean).join('\n\n');
  return { title, text, url };
}
