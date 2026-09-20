import { htmlLayout, esc } from './layout.js';

export function renderWelcome(model = {}) {
  const actionUrl = model.actionUrl || 'https://writon.cc/#explore';
  const actionLabel = model.actionLabel || 'Explore Stories';

  const tip = model.tip ? `<div style="border-left:3px solid #9C3E1D;background:#F6EFE5;padding:16px 20px;border-radius:6px;margin:28px 0">
    <strong style="color:#30271F;font-size:15px;display:block;margin-bottom:6px">${esc(model.tip.title)}</strong>
    <p style="font-size:14px;line-height:1.65;color:#574B40;margin:0">${esc(model.tip.body)}</p>
  </div>` : '';

  const cta = `<p style="margin:32px 0 16px">
    <a href="${esc(actionUrl)}" style="display:inline-block;background:#9C3E1D;color:#FFFFFF;padding:14px 24px;border-radius:6px;font:bold 15px/1.4 Arial,sans-serif;text-decoration:none">${esc(actionLabel)}</a>
  </p>
  <p style="font-size:13px;line-height:1.6;color:#66584B;margin:0 0 24px">If the button does not work, visit <a href="${esc(actionUrl)}" style="color:#9C3E1D;text-decoration:underline">${esc(actionUrl)}</a></p>`;

  const bodyHtml = `<p style="font-size:16px;line-height:1.75;color:#30271F;margin:0 0 16px">A quiet home for slow reading and deliberate writing. Start with a story, or write your first line. There is no need to do both today.</p>
  ${tip}
  ${cta}`;

  return {
    subject: model.subject || 'Welcome to WritOn',
    html: htmlLayout({
      title: 'Welcome to WritOn',
      preheader: 'A quiet sanctuary for slow reading and deliberate writing.',
      bodyHtml,
      unsubscribeUrl: model.unsubscribeUrl
    }),
    text: `Welcome to WritOn\n\nA quiet home for slow reading and deliberate writing. Start with a story, or write your first line. There is no need to do both today.${model.tip ? `\n\n${model.tip.title}\n${model.tip.body}` : ''}\n\n${actionLabel}: ${actionUrl}${model.unsubscribeUrl ? `\n\nManage email preferences: ${model.unsubscribeUrl}` : ''}`,
  };
}
