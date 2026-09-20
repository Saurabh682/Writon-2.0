import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION_PATH = path.resolve(__dirname, '../../migrations/20260918_app_release_history.sql');

export const WRITON_APP_JOURNEY = [
  // Era I: Genesis (2016-2017) — 48 entries
  { versionCode: 1, versionName: '1.0', releaseTitle: '1.0', releasedAt: '2016-11-16T11:05:00+05:30', replacedAt: '2016-11-18T10:21:00+05:30', status: 'replaced', era: 'genesis', isMajor: true },
  { versionCode: 2, versionName: '1.1', releaseTitle: '1.1', releasedAt: '2016-11-18T10:21:00+05:30', replacedAt: '2016-11-20T02:34:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 3, versionName: '1.3', releaseTitle: '1.3', releasedAt: '2016-11-20T02:34:00+05:30', replacedAt: '2016-11-20T23:48:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 4, versionName: '1.3.1', releaseTitle: '1.3.1', releasedAt: '2016-11-20T23:48:00+05:30', replacedAt: '2016-11-25T00:50:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 5, versionName: '1.3.2', releaseTitle: '1.3.2', releasedAt: '2016-11-25T00:50:00+05:30', replacedAt: '2016-11-25T11:02:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 6, versionName: '1.3.3', releaseTitle: '1.3.3', releasedAt: '2016-11-25T11:02:00+05:30', replacedAt: '2016-11-28T02:56:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 7, versionName: '1.3.4', releaseTitle: '1.3.4', releasedAt: '2016-11-28T02:56:00+05:30', replacedAt: '2016-11-28T03:33:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 8, versionName: '1.3.5', releaseTitle: '1.3.5', releasedAt: '2016-11-28T03:33:00+05:30', replacedAt: '2016-11-29T01:43:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 9, versionName: '1.3.6', releaseTitle: '1.3.6', releasedAt: '2016-11-29T01:43:00+05:30', replacedAt: '2016-11-30T04:33:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 10, versionName: '1.3.7', releaseTitle: '1.3.7', releasedAt: '2016-11-30T04:33:00+05:30', replacedAt: '2016-12-02T02:41:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 11, versionName: '1.3.8', releaseTitle: '1.3.8', releasedAt: '2016-12-02T02:41:00+05:30', replacedAt: '2016-12-04T16:25:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 12, versionName: '1.3.9', releaseTitle: '1.3.9', releasedAt: '2016-12-04T16:25:00+05:30', replacedAt: '2016-12-06T10:25:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 13, versionName: '1.3.10', releaseTitle: '1.3.10', releasedAt: '2016-12-06T10:25:00+05:30', replacedAt: '2016-12-07T04:12:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 14, versionName: '1.3.11', releaseTitle: '1.3.11', releasedAt: '2016-12-07T04:12:00+05:30', replacedAt: '2016-12-09T04:07:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 15, versionName: '1.3.12', releaseTitle: '1.3.12', releasedAt: '2016-12-09T04:07:00+05:30', replacedAt: '2016-12-10T03:24:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 16, versionName: '1.3.13', releaseTitle: '1.3.13', releasedAt: '2016-12-10T03:24:00+05:30', replacedAt: '2016-12-12T03:15:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 17, versionName: '1.3.14', releaseTitle: '1.3.14', releasedAt: '2016-12-12T03:15:00+05:30', replacedAt: '2016-12-14T02:33:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 18, versionName: '1.3.15', releaseTitle: '1.3.15', releasedAt: '2016-12-14T02:33:00+05:30', replacedAt: '2016-12-16T03:25:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 19, versionName: '1.3.16', releaseTitle: '1.3.16', releasedAt: '2016-12-16T03:25:00+05:30', replacedAt: '2016-12-18T11:45:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 20, versionName: '1.3.17', releaseTitle: '1.3.17', releasedAt: '2016-12-18T11:45:00+05:30', replacedAt: '2016-12-19T03:47:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 21, versionName: '1.3.18', releaseTitle: '1.3.18', releasedAt: '2016-12-19T03:47:00+05:30', replacedAt: '2016-12-20T02:11:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 22, versionName: '1.3.19', releaseTitle: '1.3.19', releasedAt: '2016-12-20T02:11:00+05:30', replacedAt: '2016-12-23T10:47:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 23, versionName: '1.3.20', releaseTitle: '1.3.20', releasedAt: '2016-12-23T10:47:00+05:30', replacedAt: '2016-12-26T01:50:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 24, versionName: '1.3.21', releaseTitle: '1.3.21', releasedAt: '2016-12-26T01:50:00+05:30', replacedAt: '2016-12-27T10:18:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 25, versionName: '1.3.22', releaseTitle: '1.3.22', releasedAt: '2016-12-27T10:18:00+05:30', replacedAt: '2016-12-28T01:37:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 26, versionName: '1.3.23', releaseTitle: '1.3.23', releasedAt: '2016-12-28T01:37:00+05:30', replacedAt: '2016-12-30T03:20:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 27, versionName: '1.3.24', releaseTitle: '1.3.24', releasedAt: '2016-12-30T03:20:00+05:30', replacedAt: '2017-01-01T05:00:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 28, versionName: '1.3.25', releaseTitle: '1.3.25', releasedAt: '2017-01-01T05:00:00+05:30', replacedAt: '2017-01-02T01:48:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 29, versionName: '1.3.26', releaseTitle: '1.3.26', releasedAt: '2017-01-02T01:48:00+05:30', replacedAt: '2017-01-02T10:30:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 30, versionName: '1.3.27', releaseTitle: '1.3.27', releasedAt: '2017-01-02T10:30:00+05:30', replacedAt: '2017-01-04T02:37:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 31, versionName: '1.3.28', releaseTitle: '1.3.28', releasedAt: '2017-01-04T02:37:00+05:30', replacedAt: '2017-01-08T05:39:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 32, versionName: '1.3.29', releaseTitle: '1.3.29', releasedAt: '2017-01-08T05:39:00+05:30', replacedAt: '2017-01-09T04:19:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 33, versionName: '1.3.30', releaseTitle: '1.3.30', releasedAt: '2017-01-09T04:19:00+05:30', replacedAt: '2017-01-09T11:27:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 34, versionName: '1.3.31', releaseTitle: '1.3.31', releasedAt: '2017-01-09T11:27:00+05:30', replacedAt: '2017-01-11T10:19:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 35, versionName: '1.3.32', releaseTitle: '1.3.32', releasedAt: '2017-01-11T10:19:00+05:30', replacedAt: '2017-01-14T12:42:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 36, versionName: '1.3.33', releaseTitle: '1.3.33', releasedAt: '2017-01-14T12:42:00+05:30', replacedAt: '2017-01-14T23:45:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 38, versionName: '1.3.35', releaseTitle: '1.3.35', releasedAt: '2017-01-14T23:45:00+05:30', replacedAt: '2017-01-16T22:11:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 39, versionName: '1.3.36', releaseTitle: '1.3.36', releasedAt: '2017-01-16T22:11:00+05:30', replacedAt: '2017-02-02T09:56:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 40, versionName: '1.3.37', releaseTitle: '1.3.37', releasedAt: '2017-02-02T09:56:00+05:30', replacedAt: '2017-02-02T11:30:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 41, versionName: '1.3.38', releaseTitle: '1.3.38', releasedAt: '2017-02-02T11:30:00+05:30', replacedAt: '2017-02-17T01:27:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 42, versionName: '1.3.39', releaseTitle: '1.3.39', releasedAt: '2017-02-17T01:27:00+05:30', replacedAt: '2017-03-27T10:02:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 43, versionName: '1.3.40', releaseTitle: '1.3.40', releasedAt: '2017-03-27T10:02:00+05:30', replacedAt: '2017-03-31T10:45:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 44, versionName: '1.3.41', releaseTitle: '1.3.41', releasedAt: '2017-03-31T10:45:00+05:30', replacedAt: '2017-04-01T17:56:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 45, versionName: '1.3.42', releaseTitle: '1.3.42', releasedAt: '2017-04-01T17:56:00+05:30', replacedAt: '2017-04-12T02:21:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 46, versionName: '1.3.43', releaseTitle: '1.3.43', releasedAt: '2017-04-12T02:21:00+05:30', replacedAt: '2017-05-12T02:13:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 48, versionName: '1.3.44.a', releaseTitle: '1.3.44.a', releasedAt: '2017-05-12T02:13:00+05:30', replacedAt: '2017-05-12T03:05:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 49, versionName: '1.3.45', releaseTitle: '1.3.45', releasedAt: '2017-05-12T03:05:00+05:30', replacedAt: '2017-05-12T03:05:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },
  { versionCode: 50, versionName: '1.3.45', releaseTitle: '1.3.45', releasedAt: '2017-05-12T03:05:00+05:30', replacedAt: '2019-12-27T08:44:00+05:30', status: 'replaced', era: 'genesis', isMajor: false },

  // Era II: Classic 1.x (2019-2022) — 15 entries
  { versionCode: 51, versionName: '1.3.46', releaseTitle: '1.3.46', releasedAt: '2019-12-27T08:44:00+05:30', replacedAt: '2020-01-28T11:20:00+05:30', status: 'replaced', era: 'classic', isMajor: false },
  { versionCode: 52, versionName: '1.3.47', releaseTitle: '1.3.47', releasedAt: '2020-01-28T11:20:00+05:30', replacedAt: '2020-02-06T01:53:00+05:30', status: 'replaced', era: 'classic', isMajor: false },
  { versionCode: 53, versionName: '1.3.48', releaseTitle: '1.3.48', releasedAt: '2020-02-06T01:53:00+05:30', replacedAt: '2020-02-14T12:06:00+05:30', status: 'replaced', era: 'classic', isMajor: false },
  { versionCode: 54, versionName: '1.3.49', releaseTitle: '1.3.49', releasedAt: '2020-02-14T12:06:00+05:30', replacedAt: '2020-04-01T16:34:00+05:30', status: 'replaced', era: 'classic', isMajor: false },
  { versionCode: 55, versionName: '1.3.55', releaseTitle: '1.3.55', releasedAt: '2020-04-01T16:34:00+05:30', replacedAt: '2020-04-02T01:42:00+05:30', status: 'replaced', era: 'classic', isMajor: false },
  { versionCode: 56, versionName: '1.3.52', releaseTitle: '1.3.52', releasedAt: '2020-04-02T01:42:00+05:30', replacedAt: '2020-05-10T20:05:00+05:30', status: 'replaced', era: 'classic', isMajor: false },
  { versionCode: 57, versionName: '1.3.53', releaseTitle: '1.3.53', releasedAt: '2020-05-10T20:05:00+05:30', replacedAt: '2020-05-10T22:09:00+05:30', status: 'replaced', era: 'classic', isMajor: false },
  { versionCode: 58, versionName: '1.3.54', releaseTitle: '1.3.54', releasedAt: '2020-05-10T22:09:00+05:30', replacedAt: '2020-11-01T10:52:00+05:30', status: 'replaced', era: 'classic', isMajor: false },
  { versionCode: 62, versionName: '1.3.62', releaseTitle: '1.3.62', releasedAt: '2020-11-01T10:52:00+05:30', replacedAt: '2020-11-01T11:03:00+05:30', status: 'replaced', era: 'classic', isMajor: false },
  { versionCode: 63, versionName: '1.3.63', releaseTitle: '1.3.63', releasedAt: '2020-11-01T11:03:00+05:30', replacedAt: '2021-12-26T05:54:00+05:30', status: 'replaced', era: 'classic', isMajor: false },
  { versionCode: 64, versionName: '64', releaseTitle: '64', releasedAt: null, replacedAt: '2021-12-26T05:54:00+05:30', status: 'draft_candidate', era: 'classic', isMajor: false },
  { versionCode: 65, versionName: '1.3.65', releaseTitle: '65 (1.3.65)', releasedAt: null, replacedAt: '2021-12-26T05:54:00+05:30', status: 'draft_candidate', era: 'classic', isMajor: false },
  { versionCode: 66, versionName: '1.3.66', releaseTitle: '66 (1.3.66)', releasedAt: '2021-12-26T05:54:00+05:30', replacedAt: '2022-03-22T15:17:00+05:30', status: 'replaced', era: 'classic', isMajor: false },
  { versionCode: 67, versionName: '1.3.67', releaseTitle: '67 (1.3.67)', releasedAt: null, replacedAt: '2022-03-22T15:17:00+05:30', status: 'draft_candidate', era: 'classic', isMajor: false },
  { versionCode: 68, versionName: '1.3.68', releaseTitle: '68 (1.3.68)', releasedAt: '2022-03-22T15:17:00+05:30', replacedAt: '2026-08-27T20:41:00+05:30', status: 'replaced', era: 'classic', isMajor: false },

  // Era III: Modern WritOn 2.0 (August 2026 – Present) — 17 entries
  { versionCode: 102, versionName: '2.0.0', releaseTitle: '102 (2.0.0)', releasedAt: '2026-08-27T20:41:00+05:30', replacedAt: '2026-08-27T23:23:00+05:30', status: 'replaced', era: 'modern', isMajor: true },
  { versionCode: 103, versionName: '2.0.1', releaseTitle: 'WritOn 2.0.1 (Build 103)', releasedAt: '2026-08-27T23:23:00+05:30', replacedAt: '2026-08-29T01:05:00+05:30', status: 'replaced', era: 'modern', isMajor: false },
  { versionCode: 104, versionName: '2.0.2', releaseTitle: '104', releasedAt: null, replacedAt: '2026-08-29T01:05:00+05:30', status: 'draft_candidate', era: 'modern', isMajor: false },
  { versionCode: 106, versionName: '2.0.4', releaseTitle: '106 (2.0.4)', releasedAt: '2026-08-29T01:05:00+05:30', replacedAt: '2026-08-29T20:44:00+05:30', status: 'replaced', era: 'modern', isMajor: false },
  { versionCode: 108, versionName: '2.0.6', releaseTitle: '108 (2.0.6)', releasedAt: '2026-08-29T20:44:00+05:30', replacedAt: '2026-08-30T02:00:00+05:30', status: 'replaced', era: 'modern', isMajor: false },
  { versionCode: 111, versionName: '2.0.9', releaseTitle: '111 (2.0.9)', releasedAt: '2026-08-30T02:00:00+05:30', replacedAt: '2026-08-30T08:03:00+05:30', status: 'replaced', era: 'modern', isMajor: false },
  { versionCode: 112, versionName: '2.0.10', releaseTitle: '112 (2.0.10)', releasedAt: '2026-08-30T08:03:00+05:30', replacedAt: '2026-08-30T10:49:00+05:30', status: 'replaced', era: 'modern', isMajor: false },
  { versionCode: 113, versionName: '2.0.11', releaseTitle: '113 (2.0.11)', releasedAt: '2026-08-30T10:49:00+05:30', replacedAt: '2026-08-31T09:42:00+05:30', status: 'replaced', era: 'modern', isMajor: false },
  { versionCode: 122, versionName: '2.0.20', releaseTitle: '2.0.20 - WritOn 2.0 Studio & Growth Launch', releasedAt: '2026-08-31T09:42:00+05:30', replacedAt: '2026-08-31T11:21:00+05:30', status: 'replaced', era: 'modern', isMajor: false },
  { versionCode: 126, versionName: '2.0.23', releaseTitle: '2.0.23 - Story Studio, Offline Sync & Multi-Lang', releasedAt: '2026-08-31T11:21:00+05:30', replacedAt: '2026-08-31T17:53:00+05:30', status: 'replaced', era: 'modern', isMajor: false },
  { versionCode: 128, versionName: '2.0.26', releaseTitle: '128 (2.0.26)', releasedAt: '2026-08-31T17:53:00+05:30', replacedAt: '2026-09-03T12:52:00+05:30', status: 'replaced', era: 'modern', isMajor: false },
  { versionCode: 140, versionName: '2.0.38', releaseTitle: '2.0.38 - Personalisation & Reliability', releasedAt: '2026-09-03T12:52:00+05:30', replacedAt: '2026-09-03T17:23:00+05:30', status: 'replaced', era: 'modern', isMajor: false },
  { versionCode: 143, versionName: '2.0.41', releaseTitle: '2.0.41 - Story Management & Reliability', releasedAt: '2026-09-03T17:23:00+05:30', replacedAt: '2026-09-06T22:43:00+05:30', status: 'replaced', era: 'modern', isMajor: false },
  { versionCode: 154, versionName: '2.0.52', releaseTitle: '154 (2.0.52) Sep 06 - WritOn Story Writing & Reads', releasedAt: '2026-09-06T22:43:00+05:30', replacedAt: '2026-09-11T12:37:00+05:30', status: 'replaced', era: 'modern', isMajor: false },
  { versionCode: 163, versionName: '2.0.64', releaseTitle: '163 (2.0.64) - WritOn: Read, Write & Socialize', releasedAt: '2026-09-11T12:37:00+05:30', replacedAt: '2026-09-13T11:03:00+05:30', status: 'replaced', era: 'modern', isMajor: false },
  { versionCode: 164, versionName: '2.0.65', releaseTitle: '164 (2.0.65)', releasedAt: '2026-09-13T11:03:00+05:30', replacedAt: '2026-09-15T12:23:00+05:30', status: 'replaced', era: 'modern', isMajor: false },
  { versionCode: 170, versionName: '2.0.71', releaseTitle: '170 (2.0.71)', releasedAt: '2026-09-15T12:23:00+05:30', replacedAt: null, status: 'available_on_google_play', era: 'modern', isMajor: false },
];

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true' ? true : false,
  });

  const client = await pool.connect();
  try {
    console.log('1. Applying Migration: 20260918_app_release_history.sql...');
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    await client.query(sql);
    console.log('   Migration applied successfully.');

    console.log(`2. Seeding ${WRITON_APP_JOURNEY.length} canonical releases into public.app_releases...`);
    let insertedAppCount = 0;
    for (const r of WRITON_APP_JOURNEY) {
      await client.query(`
        INSERT INTO public.app_releases (
          platform, package_name, version_code, version_name, release_title,
          released_at, replaced_at, status, era, is_major, raw_metadata, updated_at
        ) VALUES (
          'android', 'com.ibitvalley.writon', $1, $2, $3,
          $4, $5, $6, $7, $8, $9::jsonb, NOW()
        )
        ON CONFLICT (platform, version_code) DO UPDATE SET
          version_name = EXCLUDED.version_name,
          release_title = EXCLUDED.release_title,
          released_at = EXCLUDED.released_at,
          replaced_at = EXCLUDED.replaced_at,
          status = EXCLUDED.status,
          era = EXCLUDED.era,
          is_major = EXCLUDED.is_major,
          raw_metadata = EXCLUDED.raw_metadata,
          updated_at = NOW()
      `, [
        r.versionCode,
        r.versionName,
        r.releaseTitle,
        r.releasedAt,
        r.replacedAt,
        r.status,
        r.era,
        r.isMajor,
        JSON.stringify({ source: 'google_play_console_release_history', originalReleaseTitle: r.releaseTitle })
      ]);
      insertedAppCount++;
    }
    console.log(`   Seeded ${insertedAppCount} releases into public.app_releases.`);

    console.log('3. Mirroring modern WritOn 2.0 releases into public.editorial_releases...');
    const modernReleases = WRITON_APP_JOURNEY.filter(r => r.era === 'modern');
    let insertedEditorialCount = 0;
    for (const r of modernReleases) {
      const idempotencyKey = `android:${r.versionCode}`;
      await client.query(`
        INSERT INTO public.editorial_releases (
          idempotency_key, platform, version_code, version_name,
          raw_payload, user_visible_changes, is_major, processed, updated_at
        ) VALUES (
          $1, 'android', $2, $3,
          $4::jsonb, $5::jsonb, $6, true, NOW()
        )
        ON CONFLICT (idempotency_key) DO UPDATE SET
          version_name = EXCLUDED.version_name,
          is_major = EXCLUDED.is_major,
          updated_at = NOW()
      `, [
        idempotencyKey,
        r.versionCode,
        r.versionName,
        JSON.stringify({ releaseTitle: r.releaseTitle, releasedAt: r.releasedAt, status: r.status }),
        JSON.stringify([r.releaseTitle]),
        r.isMajor
      ]);
      insertedEditorialCount++;
    }
    console.log(`   Mirrored ${insertedEditorialCount} WritOn 2.0 releases into public.editorial_releases.`);

    // 4. Print stats and verification summary
    console.log('\n==================================================================');
    console.log('📜 WRITON APP JOURNEY VERIFICATION REPORT');
    console.log('==================================================================');
    
    const eraStats = await client.query(`
      SELECT 
        era,
        count(*)::int as total_releases,
        min(version_code)::int as min_code,
        max(version_code)::int as max_code,
        min(released_at)::text as earliest_release,
        max(released_at)::text as latest_release
      FROM public.app_releases
      GROUP BY era
      ORDER BY min_code ASC
    `);
    console.table(eraStats.rows);

    const liveRelease = await client.query(`
      SELECT platform, package_name, version_code, version_name, release_title, released_at, status
      FROM public.app_releases
      WHERE status = 'available_on_google_play'
    `);
    console.log('Active Live Production Release on Google Play:');
    console.table(liveRelease.rows);

    console.log('==================================================================\n');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
