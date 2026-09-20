import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const adminKey = Buffer.concat(chunks).toString('utf8').trim();
if (!adminKey) throw new Error('Expected the admin secret on standard input.');

const cloudSdkRoot = process.platform === 'win32'
  ? join(process.env.LOCALAPPDATA, 'Google', 'Cloud SDK', 'google-cloud-sdk') : null;
const executable = process.platform === 'win32'
  ? join(cloudSdkRoot, 'platform', 'bundledpython', 'python.exe') : 'gcloud';
const prefix = process.platform === 'win32' ? [join(cloudSdkRoot, 'lib', 'gcloud.py')] : [];

function call(args, capture = false) {
  const result = spawnSync(executable, [...prefix, ...args], {
    stdio: ['ignore', capture ? 'pipe' : 'ignore', 'inherit'], encoding: capture ? 'utf8' : undefined, shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout;
}

const update = process.argv.includes('--update');
const staging = process.argv.includes('--staging');
const jobName = staging ? 'writon-discovery-notifications-staging' : 'writon-discovery-notifications';
const apiBase = staging
  ? 'https://writon-app-api-staging-802112841589.asia-south1.run.app'
  : 'https://api.writon.cc';
call([
  'scheduler', 'jobs', update ? 'update' : 'create', 'http', jobName,
  '--location=asia-south1', '--schedule=0 18 * * *', '--time-zone=Asia/Kolkata',
  `--uri=${apiBase}/api/v1/internal/notifications/discovery?dryRun=true&limit=100`,
  '--http-method=POST', `${update ? '--update-headers' : '--headers'}=Content-Type=application/json,x-admin-key=${adminKey}`,
  '--message-body={}', '--attempt-deadline=300s', '--max-retry-attempts=3',
  '--description=Paused dry-run discovery notification candidate audit', '--quiet',
]);
call(['scheduler', 'jobs', 'pause', jobName, '--location=asia-south1', '--quiet']);
const job = JSON.parse(call(['scheduler', 'jobs', 'describe', jobName, '--location=asia-south1', '--format=json'], true));
if (job.state !== 'PAUSED') throw new Error('Discovery notification scheduler must remain paused.');
if (!job.httpTarget?.uri?.includes('dryRun=true')) throw new Error('Discovery scheduler must remain in dry-run mode.');
if (job.httpTarget?.headers?.['x-admin-key'] !== adminKey) throw new Error('Discovery scheduler is missing the protected header.');
process.stdout.write(`${jobName} is configured, dry-run-only, and paused.\n`);
