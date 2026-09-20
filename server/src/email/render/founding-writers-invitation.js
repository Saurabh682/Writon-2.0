import { htmlLayout, esc } from './layout.js';

export function renderFoundingWritersInvitation(model = {}) {
  const name = model.name || 'Writer';
  const actionUrl = model.actionUrl || 'https://writon.cc/founding-writer';
  const actionLabel = model.actionLabel || 'Open your writing desk';
  const publicStoryCount = model.publicStoryCount || 766;
  const activeCategoryCount = model.activeCategoryCount || 15;
  const unsubscribeUrl = model.unsubscribeUrl || 'https://writon.cc/email/unsubscribe';

  const bodyHtml = `
    <p style="font-size:16px;line-height:1.68;color:#30271F;margin:0 0 18px">
      Welcome back, ${esc(name)}.
    </p>

    <p style="font-size:16px;line-height:1.68;color:#30271F;margin:0 0 18px">
      You wrote on WritOn before this version existed. That history still matters here.
    </p>

    <p style="font-size:16px;line-height:1.68;color:#30271F;margin:0 0 30px">
      Over the past few months, we’ve rebuilt WritOn around a stubborn conviction: writing shouldn’t have to perform for an algorithm before someone gets the chance to read it.
    </p>

    <div style="background:#F7F1E7;background-image:radial-gradient(circle at 92% 88%, rgba(231,90,42,0.035) 0%, rgba(247,241,231,0) 60%);border:1px solid #E5DDD1;border-radius:14px;padding:24px 26px;margin:28px 0">
      <div style="font-family:Georgia,serif;font-size:17px;font-weight:600;color:#2A221B;margin-bottom:18px">
        Your Founding Writer Privileges:
      </div>

      <div style="margin-bottom:18px">
        <div style="font-size:15px;font-weight:700;color:#2A221B;margin-bottom:4px;letter-spacing:-0.01em">
          Permanent Founding Writer Badge
        </div>
        <div style="font-size:14px;line-height:1.55;color:#483E34">
          Your legacy membership, permanently shown on your profile and story bylines.
        </div>
      </div>

      <div style="margin-bottom:18px">
        <div style="font-size:15px;font-weight:700;color:#2A221B;margin-bottom:4px;letter-spacing:-0.01em">
          Priority Human Curation
        </div>
        <div style="font-size:14px;line-height:1.55;color:#483E34">
          Your next published piece receives direct editorial consideration.
        </div>
      </div>

      <div style="margin-bottom:18px">
        <div style="font-size:15px;font-weight:700;color:#2A221B;margin-bottom:4px;letter-spacing:-0.01em">
          A Quieter Writing Space
        </div>
        <div style="font-size:14px;line-height:1.55;color:#483E34">
          Clean drafts, pen names, and no gamified engagement pressure.
        </div>
      </div>

      <div style="border-top:1px dashed #DDD2C4;padding-top:20px;margin-top:22px">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9C3E1D;margin-bottom:6px">
          From the WritOn desk
        </div>
        <div style="font-family:Georgia,serif;font-size:15.5px;font-style:italic;line-height:1.6;color:#2C241D">
          “Write the opening sentence last. Find the piece first, then sharpen the door into it.”
        </div>
      </div>
    </div>

    <p style="font-size:16px;line-height:1.68;color:#30271F;margin:30px 0 0">
      While you were away, the library grew to <strong>${esc(publicStoryCount)} stories, poems, essays and reflections</strong>, from Urdu ghazals to investigative technology.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" align="center" class="mobile-full-table" style="margin:44px auto 14px;width:auto">
      <tr>
        <td align="center">
          <a href="${esc(actionUrl)}" class="mobile-full-btn" style="display:inline-block;background:#9C3E1D;color:#FFFFFF;padding:15px 38px;border-radius:8px;font:600 16px/1.4 Arial,sans-serif;text-decoration:none;letter-spacing:0.01em;text-align:center">
            ${esc(actionLabel)}
          </a>
        </td>
      </tr>
    </table>

    <p style="text-align:center;font-size:14px;line-height:1.5;color:#4D4238;margin:0 0 32px">
      Or browse the live library at <a href="https://writon.cc/explore" style="color:#3D342C;text-decoration:underline">writon.cc/explore</a>
    </p>

    <p style="font-size:15.5px;line-height:1.65;color:#30271F;margin:32px 0 0">
      With warm regards,<br>
      <span style="font-family:Georgia,serif;font-style:italic;color:#30271F">The Editors at WritOn</span>
    </p>
  `;

  const footerHtml = `
    <div style="border-top:1px solid #EDE5DA;margin-top:44px;padding-top:22px;font-size:13.5px;line-height:1.6;color:#4A4239" class="footer-text">
      <p style="margin:0 0 10px 0;color:#4A4239;font-size:13.5px;line-height:1.6" class="footer-text">
        You’re receiving this note because you previously had a WritOn account. This is a one-time invitation. You won’t receive recurring emails unless you choose to subscribe.
      </p>
      <div style="font-size:13.5px;color:#4A4239" class="footer-text">
        <a href="${esc(unsubscribeUrl)}" style="color:#4A4239;text-decoration:underline">Manage preferences</a> &nbsp;|&nbsp; <a href="${esc(unsubscribeUrl)}" style="color:#4A4239;text-decoration:underline">Unsubscribe</a>
      </div>
    </div>
  `;

  const text = `Welcome back, ${name}.

You wrote on WritOn before this version existed. That history still matters here.

Over the past few months, we’ve rebuilt WritOn around a stubborn conviction: writing shouldn’t have to perform for an algorithm before someone gets the chance to read it.

YOUR FOUNDING WRITER PRIVILEGES:

Permanent Founding Writer Badge
Your legacy membership, permanently shown on your profile and story bylines.

Priority Human Curation
Your next published piece receives direct editorial consideration.

A Quieter Writing Space
Clean drafts, pen names, and no gamified engagement pressure.

FROM THE WRITON DESK:
“Write the opening sentence last. Find the piece first, then sharpen the door into it.”

While you were away, the library grew to ${publicStoryCount} stories, poems, essays and reflections, from Urdu ghazals to investigative technology.

${actionLabel}: ${actionUrl}

Or browse the live library: https://writon.cc/explore

With warm regards,
The Editors at WritOn

---
You’re receiving this note because you previously had a WritOn account. This is a one-time invitation. You won’t receive recurring emails unless you choose to subscribe.
Manage preferences or unsubscribe: ${unsubscribeUrl}`;

  return {
    subject: model.subject || 'You were here before WritOn 2.0',
    html: htmlLayout({
      title: 'You were here before WritOn 2.0',
      preheader: 'Your legacy WritOn account qualifies for permanent Founding Writer recognition.',
      bodyHtml,
      footerHtml,
      cardMaxWidth: 580,
    }),
    text,
  };
}
