const RULES = {
  posts: [1, 5, 10, 25, 50, 100],
  applauds: [1, 10, 50, 100, 500, 1000],
  comments: [1, 10, 50, 100],
  followers: [1, 10, 50, 100],
  uniqueReaders: [1, 100, 500, 1000],
  consecutiveWeeks: [2, 4, 8, 12],
};

const COPY = {
  posts: n => n === 1 ? ['Your first story is live ✒️', 'Your writing now has a place on WritOn.'] : [`${n} stories published`, `You have now published ${n} pieces on WritOn.`],
  applauds: n => n === 1 ? ['Your first applause', 'A reader applauded your writing.'] : [`${n} applauds`, `Readers have now applauded your writing ${n} times.`],
  comments: n => n === 1 ? ['Your first comment', 'A reader joined the conversation around your writing.'] : [`${n} comments received`, `Your stories have now received ${n} comments.`],
  followers: n => n === 1 ? ['Your first follower', 'Someone chose to keep up with your writing.'] : [`${n} followers`, `${n} readers now follow your writing on WritOn.`],
  uniqueReaders: n => n === 1 ? ['Your first reader', 'Someone opened your writing on WritOn.'] : [`${n} readers`, `Your writing has reached ${n} unique readers.`],
  consecutiveWeeks: n => [`${n} active weeks`, `You have published in ${n} consecutive weeks.`],
};

export function detectMilestones(before = {}, after = {}) {
  const events = [];
  for (const [metric, thresholds] of Object.entries(RULES)) {
    const prior = Number(before[metric] || 0);
    const current = Number(after[metric] || 0);
    for (const threshold of thresholds) {
      if (prior < threshold && current >= threshold) {
        const [title, body] = COPY[metric](threshold);
        events.push({
          metric,
          threshold,
          eventKey: `milestone:${metric}:${threshold}`,
          title,
          body,
        });
      }
    }
  }
  return events;
}

export { RULES as MILESTONE_RULES };
