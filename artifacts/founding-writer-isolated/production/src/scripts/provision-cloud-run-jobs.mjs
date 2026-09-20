import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const PROJECT_ID = process.env.PROJECT_ID || 'writon-app-2020';
const LOCATION = process.env.LOCATION || 'asia-south1';
const BASE_URL = process.env.TARGET_BASE_URL || 'https://api.writon.cc';
const INVOKER_SA = `writon-scheduler-invoker@${PROJECT_ID}.iam.gserviceaccount.com`;

const cloudSdkRoot = process.platform === 'win32'
  ? join(process.env.LOCALAPPDATA, 'Google', 'Cloud SDK', 'google-cloud-sdk')
  : null;
const executable = process.platform === 'win32'
  ? join(cloudSdkRoot, 'platform', 'bundledpython', 'python.exe')
  : 'gcloud';
const commandPrefix = process.platform === 'win32'
  ? [join(cloudSdkRoot, 'lib', 'gcloud.py')]
  : [];

function runCommand(args) {
  return spawnSync(executable, [...commandPrefix, ...args], {
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function getAdminKey() {
  if (process.env.ADMIN_SECRET_KEY) return process.env.ADMIN_SECRET_KEY;
  const res = runCommand(['secrets', 'versions', 'access', 'latest', '--secret=writon-admin-secret-key-production', `--project=${PROJECT_ID}`]);
  if (res.status === 0 && res.stdout.trim()) return res.stdout.trim();
  throw new Error('Unable to retrieve ADMIN_SECRET_KEY from environment or Secret Manager.');
}

const adminKey = getAdminKey();

const JOBS = [
  {
    name: 'writon-notification-outbox-drain',
    schedule: '* * * * *',
    path: '/api/v1/internal/notifications/drain-outbox',
    deadline: '30s',
    maxBackoff: '60s',
    description: 'Notification outbox bounded drain worker',
  },
  {
    name: 'writon-followed-writer-fanout',
    schedule: '* * * * *',
    path: '/api/v1/internal/notifications/fanout-publications',
    deadline: '60s',
    maxBackoff: '60s',
    description: 'Followed writer publication fanout worker',
  },
  {
    name: 'writon-daily-digest',
    schedule: '0 20 * * *',
    path: '/api/v1/internal/notifications/daily-digest',
    deadline: '300s',
    maxBackoff: '300s',
    description: 'Daily editorial digest notification worker',
  },
  {
    name: 'writon-feed-retention',
    schedule: '0 3 * * *',
    path: '/api/v1/internal/maintenance/feed-retention',
    deadline: '120s',
    maxBackoff: '300s',
    description: 'Daily reader feed retention cleaner',
  },
];

function jobExists(name) {
  const res = runCommand([
    'scheduler', 'jobs', 'describe', name,
    `--location=${LOCATION}`,
    `--project=${PROJECT_ID}`,
    '--format=json',
  ]);
  return res.status === 0;
}

console.log(`Provisioning ${JOBS.length} Cloud Scheduler jobs in ${LOCATION} targeting ${BASE_URL}...`);

for (const job of JOBS) {
  const exists = jobExists(job.name);
  const action = exists ? 'update' : 'create';
  const uri = `${BASE_URL}${job.path}`;
  const headersFlag = exists
    ? `--update-headers=Content-Type=application/json,x-admin-key=${adminKey}`
    : `--headers=Content-Type=application/json,x-admin-key=${adminKey}`;

  const args = [
    'scheduler', 'jobs', action, 'http', job.name,
    `--location=${LOCATION}`,
    `--project=${PROJECT_ID}`,
    `--schedule=${job.schedule}`,
    '--time-zone=Asia/Kolkata',
    `--uri=${uri}`,
    '--http-method=POST',
    headersFlag,
    '--message-body={}',
    `--oidc-service-account-email=${INVOKER_SA}`,
    `--attempt-deadline=${job.deadline}`,
    '--max-retry-attempts=3',
    '--min-backoff=5s',
    `--max-backoff=${job.maxBackoff}`,
    '--max-doublings=3',
    `--description=${job.description}`,
    '--quiet',
  ];

  console.log(`[${action.toUpperCase()}] ${job.name} (${job.schedule} Asia/Kolkata) -> ${job.path}`);
  const res = runCommand(args);
  if (res.status !== 0) {
    throw new Error(`Failed to ${action} job ${job.name}: ${res.stderr || res.stdout}`);
  }

  // Ensure job is strictly PAUSED
  const pauseRes = runCommand([
    'scheduler', 'jobs', 'pause', job.name,
    `--location=${LOCATION}`,
    `--project=${PROJECT_ID}`,
    '--quiet',
  ]);
  if (pauseRes.status !== 0) {
    console.warn(`Warning: could not pause ${job.name}: ${pauseRes.stderr}`);
  }

  // Verify status
  const descRes = runCommand([
    'scheduler', 'jobs', 'describe', job.name,
    `--location=${LOCATION}`,
    `--project=${PROJECT_ID}`,
    '--format=json',
  ]);
  const desc = JSON.parse(descRes.stdout);
  if (desc.state !== 'PAUSED') {
    throw new Error(`Job ${job.name} is not paused! State: ${desc.state}`);
  }
  console.log(`✓ ${job.name} is verified PAUSED with OIDC invoker and bounded retry.`);
}

console.log('\nAll Cloud Scheduler jobs provisioned and confirmed PAUSED successfully.');
