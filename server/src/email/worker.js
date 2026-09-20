import {
  claimDueJobs, reserveSend, releaseReservation, markSent, cancelJob,
  deferJob, markDead, markAmbiguous,
} from './queue.js';
import { renderTemplate } from './template-registry.js';
import { ResendHttpError } from './resend-client.js';

function retryAt(attempts, retryAfter) {
  if (retryAfter && /^\d+$/.test(String(retryAfter))) return new Date(Date.now() + Number(retryAfter) * 1000);
  const seconds = Math.min(6 * 3600, 30 * Math.pow(2, Math.max(0, attempts - 1)));
  return new Date(Date.now() + seconds * 1000 + Math.floor(Math.random() * 5000));
}

function productionHeaders(job) {
  const unsubscribeUrl = job.payload?.unsubscribeUrl;
  if (!unsubscribeUrl) return {};
  return {
    'List-Unsubscribe': `<${unsubscribeUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

export function createEmailWorker({ pool, resend, config, writonAdapter }) {
  return {
    async runOnce() {
      const jobs = await claimDueJobs(pool, { limit: config.email.batchSize, leaseSeconds: config.email.leaseSeconds });
      const result = { claimed: jobs.length, sent: 0, deferred: 0, cancelled: 0, dead: 0, ambiguous: 0, blocked: 0 };

      for (const job of jobs) {
        let reserved = false;
        try {
          // Revalidate against WritOn immediately before send if an adapter is connected.
          if (writonAdapter?.getCurrentEmailState) {
            let state;
            try { state = await writonAdapter.getCurrentEmailState(job.profile_id); }
            catch (error) {
              if (!String(error?.message || '').includes('not connected')) throw error;
            }
            if (state) {
              if (!state.accountExists) { await cancelJob(pool, job, 'account_deleted'); result.cancelled++; continue; }
              if (!state.verified) { await cancelJob(pool, job, 'email_not_verified'); result.cancelled++; continue; }
              if (Number(state.emailVersion) !== Number(job.recipient_email_version) || String(state.email).toLowerCase() !== String(job.recipient_email).toLowerCase()) {
                await cancelJob(pool, job, 'recipient_changed'); result.cancelled++; continue;
              }
            }
          }

          const reservation = await reserveSend(pool, job, config.email.dailyCapacity);
          if (!reservation.ok) {
            if (reservation.reason === 'cadence' && reservation.nextAt) {
              await deferJob(pool, job, reservation.nextAt, 'cadence'); result.deferred++;
            } else if (reservation.reason === 'daily_capacity' || reservation.reason === 'cadence_reserved') {
              await deferJob(pool, job, new Date(Date.now() + 60 * 60_000), reservation.reason); result.deferred++;
            } else {
              await cancelJob(pool, job, reservation.reason); result.cancelled++;
            }
            continue;
          }
          reserved = true;

          const rendered = renderTemplate(job);
          const send = await resend.send({
            to: job.recipient_email,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            headers: productionHeaders(job),
            idempotencyKey: job.idempotency_key,
          });

          if (send.blocked) {
            await releaseReservation(pool, job, { releaseCapacity: true }); reserved = false;
            await deferJob(pool, job, new Date(Date.now() + 6 * 3600_000), send.reason);
            result.blocked++; result.deferred++; continue;
          }

          await markSent(pool, job, send.id);
          reserved = false; // markSent clears cadence reservation; daily capacity remains consumed.
          result.sent++;
        } catch (error) {
          if (error?.deliveryAmbiguous) {
            // Do not blindly retry a network timeout. Resend may have accepted it.
            await markAmbiguous(pool, job, error); result.ambiguous++;
            continue;
          }

          const explicitNoAccept = error instanceof ResendHttpError;
          if (reserved && explicitNoAccept) {
            await releaseReservation(pool, job, { releaseCapacity: true });
            reserved = false;
          }

          if (error instanceof ResendHttpError && (error.status === 429 || error.status >= 500) && job.attempts < 5) {
            await deferJob(pool, job, retryAt(job.attempts, error.retryAfter), error.code || `http_${error.status}`);
            result.deferred++;
          } else {
            await markDead(pool, job, error); result.dead++;
          }
        }
      }
      return result;
    },
  };
}
