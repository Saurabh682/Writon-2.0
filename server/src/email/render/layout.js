function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function htmlLayout({ preheader = '', title, bodyHtml, unsubscribeUrl, footerHtml, cardMaxWidth = 580 }) {
  const preheaderPadding = '&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;&#847;&zwnj;&nbsp;&#8199;&shy;';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting">
<style>
  body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  @media screen and (max-width: 600px) {
    .email-container { padding: 18px 12px !important; }
    .email-card { border-radius: 12px !important; }
    .email-card-cell { padding: 28px 18px !important; }
    .mobile-full-table { width: 100% !important; margin: 28px 0 16px !important; }
    .mobile-full-btn { display: block !important; width: 100% !important; box-sizing: border-box !important; padding: 16px 20px !important; text-align: center !important; }
    .footer-text { font-size: 13.5px !important; line-height: 1.6 !important; }
  }
</style>
</head>
<body style="margin:0;background:#FAF5EE;color:#30271F;font-family:Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="display:none;font-size:1px;color:#FAF5EE;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${esc(preheader)}${preheaderPadding}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FAF5EE"><tr><td align="center" style="padding:32px 16px" class="email-container">
<!--[if mso]><table role="presentation" width="${cardMaxWidth}" cellspacing="0" cellpadding="0" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-card" style="max-width:${cardMaxWidth}px;width:100%;background:#FFFDF9;border:1px solid #EDE5DA;border-radius:18px;box-shadow:0 2px 8px rgba(48,39,31,0.03)">
<tr><td style="padding:38px 34px" class="email-card-cell">
<div style="font-family:Georgia,serif;font-size:21.5px;color:#30271F;margin-bottom:28px;font-weight:bold;letter-spacing:-0.015em">WritOn</div>
<h1 style="font-family:Georgia,serif;font-size:28px;line-height:1.25;color:#30271F;margin:0 0 30px;font-weight:normal">${esc(title)}</h1>
${bodyHtml}
${footerHtml ? footerHtml : (unsubscribeUrl ? `<div style="border-top:1px solid #EDE5DA;margin-top:32px;padding-top:20px;font-size:12px;line-height:1.6;color:#50483E" class="footer-text">You received this optional WritOn email because you enabled this category. <a href="${esc(unsubscribeUrl)}" style="color:#50483E;text-decoration:underline">Manage or unsubscribe</a>.</div>` : '')}
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
}

export { esc };
