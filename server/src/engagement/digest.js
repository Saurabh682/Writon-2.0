import { selectWriterTip } from './tips.js';

export function isoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function buildWriterDigestModel({ profileId, stats, topStory, milestones = [], recommendations = [], unsubscribeUrl, date = new Date() }) {
  const significant = milestones.slice().sort((a, b) => (b.threshold || 0) - (a.threshold || 0))[0] || null;
  return {
    stats: {
      storiesPublished: Number(stats?.storiesPublished || 0),
      uniqueReaders: Number(stats?.uniqueReaders || 0),
      applauds: Number(stats?.applauds || 0),
      comments: Number(stats?.comments || 0),
      followersGained: Number(stats?.followersGained || 0),
      shareActions: Number(stats?.shareActions || 0),
    },
    topStory: topStory || null,
    milestone: significant,
    tip: selectWriterTip(profileId, isoWeekKey(date)),
    recommendations: recommendations.slice(0, 3),
    unsubscribeUrl,
  };
}

export function hasMeaningfulDigestActivity(model) {
  const s = model.stats || {};
  return Boolean(
    s.storiesPublished || s.uniqueReaders || s.applauds || s.comments || s.followersGained || s.shareActions ||
    model.milestone || model.recommendations?.length
  );
}
