import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const adminKey = Buffer.concat(chunks).toString('utf8').trim();
if (!adminKey) throw new Error('Expected the admin secret on standard input.');

const cloudSdkRoot = process.platform === 'win32'
  ? join(process.env.LOCALAPPDATA, 'Google', 'Cloud SDK', 'google-cloud-sdk')
  : null;
const executable = process.platform === 'win32'
  ? join(cloudSdkRoot, 'platform', 'bundledpython', 'python.exe')
  : 'gcloud';
const commandPrefix = process.platform === 'win32'
  ? [join(cloudSdkRoot, 'lib', 'gcloud.py')]
  : [];

function run(args) {
  const result = spawnSync(executable, [...commandPrefix, ...args], {
    // gcloud prints the complete job, including protected headers, on success.
    // Suppress stdout so the admin key cannot leak into CI or operator logs.
    stdio: ['ignore', 'ignore', 'inherit'],
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function capture(args) {
  const result = spawnSync(executable, [...commandPrefix, ...args], {
    stdio: ['ignore', 'pipe', 'inherit'],
    encoding: 'utf8',
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout;
}

const operation = process.argv.includes('--update') ? 'update' : 'create';
const headersFlag = operation === 'update' ? '--update-headers' : '--headers';
run([
  'scheduler', 'jobs', operation, 'http', 'writon-daily-digest',
  '--location=asia-south1',
  '--schedule=0 20 * * *',
  '--time-zone=Asia/Kolkata',
  '--uri=https://api.writon.cc/api/v1/internal/notifications/daily-digest',
  '--http-method=POST',
  `${headersFlag}=Content-Type=application/json,x-admin-key=${adminKey}`,
  '--message-body={}',
  '--attempt-deadline=300s',
  '--max-retry-attempts=3',
  '--description=Paused pending verified digest deployment',
  '--quiet',
]);

run([
  'scheduler', 'jobs', 'pause', 'writon-daily-digest',
  '--location=asia-south1',
  '--quiet',
]);

const job = JSON.parse(capture([
  'scheduler', 'jobs', 'describe', 'writon-daily-digest',
  '--location=asia-south1',
  '--format=json',
]));
if (job.state !== 'PAUSED') throw new Error('Daily digest scheduler must remain paused.');
if (job.httpTarget?.headers?.['x-admin-key'] !== adminKey) {
  throw new Error('Daily digest scheduler does not contain the current admin key.');
}
process.stdout.write('Daily digest scheduler is configured and paused; protected header verified.\n');
