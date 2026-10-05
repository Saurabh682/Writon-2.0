import { execSync } from 'node:child_process';

const key = execSync('gcloud secrets versions access latest --secret=writon-admin-secret-key-production --project=writon-app-2020', { encoding: 'utf8' }).trim();

const jobs = [
  'writon-notification-outbox-drain',
  'writon-email-outbox-process'
];

for (const job of jobs) {
  try {
    const cmd = `gcloud scheduler jobs update http ${job} --location=asia-south1 --project=writon-app-2020 --update-headers="x-admin-key=${key}"`;
    execSync(cmd, { stdio: 'pipe' });
    console.log(`Updated header for ${job}`);
  } catch (e) {
    console.error(`Failed to update ${job}:`, e.message);
  }
}
