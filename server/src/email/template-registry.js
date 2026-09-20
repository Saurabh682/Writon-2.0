import { renderWeeklyDigest } from './render/weekly-digest.js';
import { renderWelcome } from './render/welcome.js';
import { renderFoundingWritersInvitation } from './render/founding-writers-invitation.js';

const templates = {
  weekly_writer_digest: renderWeeklyDigest,
  welcome: renderWelcome,
  founding_writers_v2: renderFoundingWritersInvitation,
};

export function renderTemplate(job) {
  const renderer = templates[job.template_key];
  if (!renderer) throw new Error(`Unknown template: ${job.template_key}`);
  return renderer(job.payload);
}
