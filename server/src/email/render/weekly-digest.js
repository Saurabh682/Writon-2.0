import { htmlLayout, esc } from './layout.js';

function metric(value, label) {
  return `<td style="padding:0 18px 18px 0;vertical-align:top"><div style="font-family:Georgia,serif;font-size:26px">${esc(value)}</div><div style="font-size:13px;color:#6f6258">${esc(label)}</div></td>`;
}

export function renderWeeklyDigest(model) {
  const stats = model.stats || {};
  const milestoneHtml = model.milestone ? `<div style="background:#FAF5EE;border-radius:12px;padding:18px;margin:22px 0"><strong>${esc(model.milestone.title)}</strong><br><span style="font-size:14px">${esc(model.milestone.body || '')}</span></div>` : '';
  const topStoryHtml = model.topStory ? `<div style="margin:26px 0"><div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#6f6258">Your most-read story</div><div style="font-family:Georgia,serif;font-size:22px;margin-top:8px">${esc(model.topStory.title)}</div><div style="font-size:14px;color:#6f6258;margin-top:6px">${esc(model.topStory.summary || '')}</div></div>` : '';
  const tipHtml = model.tip ? `<div style="border-left:3px solid #9C3E1D;padding-left:16px;margin:26px 0"><strong>${esc(model.tip.title)}</strong><div style="font-size:15px;line-height:1.65;margin-top:6px">${esc(model.tip.body)}</div></div>` : '';
  const recsHtml = (model.recommendations || []).length ? `<div style="margin-top:28px"><div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#6f6258">From WritOn this week</div>${model.recommendations.map(r => `<div style="margin-top:14px"><a href="${esc(r.url)}" style="font-family:Georgia,serif;font-size:18px;color:#30271F">${esc(r.title)}</a>${r.author ? `<div style="font-size:13px;color:#6f6258">by ${esc(r.author)}</div>` : ''}</div>`).join('')}</div>` : '';
  const bodyHtml = `
<p style="font-size:16px;line-height:1.7">${esc(model.intro || 'Here is what happened around your writing this week.')}</p>
<table role="presentation" cellspacing="0" cellpadding="0"><tr>
${metric(stats.storiesPublished ?? 0, 'stories published')}${metric(stats.uniqueReaders ?? 0, 'unique readers')}${metric(stats.applauds ?? 0, 'applauds')}</tr><tr>
${metric(stats.comments ?? 0, 'comments')}${metric(stats.followersGained ?? 0, 'new followers')}${metric(stats.shareActions ?? 0, 'share actions')}</tr></table>
${topStoryHtml}${milestoneHtml}${tipHtml}${recsHtml}`;
  const html = htmlLayout({ preheader: 'Your week on WritOn', title: 'Your week on WritOn', bodyHtml, unsubscribeUrl: model.unsubscribeUrl });
  const lines = [
    'Your week on WritOn', '',
    `${stats.storiesPublished ?? 0} stories published`, `${stats.uniqueReaders ?? 0} unique readers`,
    `${stats.applauds ?? 0} applauds`, `${stats.comments ?? 0} comments`,
    `${stats.followersGained ?? 0} new followers`, `${stats.shareActions ?? 0} share actions`,
  ];
  if (model.topStory) lines.push('', 'Your most-read story', model.topStory.title, model.topStory.summary || '');
  if (model.milestone) lines.push('', model.milestone.title, model.milestone.body || '');
  if (model.tip) lines.push('', model.tip.title, model.tip.body);
  if (model.recommendations?.length) {
    lines.push('', 'From WritOn this week');
    for (const r of model.recommendations) lines.push(`${r.title}${r.author ? ` — ${r.author}` : ''}`, r.url);
  }
  if (model.unsubscribeUrl) lines.push('', `Manage email preferences: ${model.unsubscribeUrl}`);
  return { subject: model.subject || 'Your week on WritOn', html, text: lines.filter(v => v !== undefined).join('\n') };
}
