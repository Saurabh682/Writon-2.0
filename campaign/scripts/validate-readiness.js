#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './content-builder.js';

const campaignDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readCsv = (name) => parseCsv(fs.readFileSync(path.join(campaignDir, name), 'utf8'));
const calendar = readCsv('content-calendar.csv');
const allowlist = readCsv('human-content-allowlist.csv');
const metrics = readCsv('metrics-template.csv');
const emergency = readCsv('emergency-content.csv');
const registry = JSON.parse(fs.readFileSync(path.join(campaignDir, 'delivery-registry.json'), 'utf8'));
const failures = [];

const uniqueDays = [...new Set(calendar.map((row) => Number(row.day)))].sort((a, b) => a - b);
if (uniqueDays.length !== 30 || uniqueDays[0] !== 1 || uniqueDays.at(-1) !== 30) {
  failures.push('content-calendar.csv must contain campaign days 1 through 30.');
}

const conceptLanguage = new Map();
for (const row of calendar) conceptLanguage.set(Number(row.day), row.language);
const expectedLanguages = { en: 12, hi: 8, bn: 5, mr: 5 };
for (const [language, expected] of Object.entries(expectedLanguages)) {
  const actual = [...conceptLanguage.values()].filter((value) => value === language).length;
  if (actual !== expected) failures.push(`Expected ${expected} ${language} concepts; found ${actual}.`);
}

const registryById = new Map(registry.map((entry) => [entry.delivery_id, entry]));
for (const row of calendar) {
  const entry = registryById.get(row.delivery_id);
  if (!entry) failures.push(`Missing delivery registry entry: ${row.delivery_id}`);
  else if (entry.utm_campaign !== 'writon_growth_2026_09' || entry.utm_medium !== 'organic_social') {
    failures.push(`Invalid UTM contract: ${row.delivery_id}`);
  }
}
if (registry.length !== calendar.length) failures.push('Calendar and delivery registry row counts differ.');

if (new Set(metrics.map((row) => Number(row.day_number))).size !== 30) {
  failures.push('metrics-template.csv must contain all 30 days.');
}

const humanFeatureDays = [3, 5, 6, 10, 11, 16, 19, 20, 23, 24, 27, 28];
for (const day of humanFeatureDays) {
  const row = allowlist.find((item) => Number(item.planned_day) === day);
  const complete = row
    && ['approved', 'granted', 'rights_verified'].includes(row.consent_status)
    && row.source_story_id && row.author_id && row.language && row.human_provenance_basis
    && row.approved_excerpt && row.reviewed_by && row.reviewed_at;
  if (!complete) failures.push(`Day ${day} needs a complete approved human-content allowlist record.`);
}

const emergencyCounts = emergency.reduce((counts, row) => {
  if (row.status === 'qa_passed') counts[row.language] = (counts[row.language] || 0) + 1;
  return counts;
}, {});
for (const [language, expected] of Object.entries({ en: 4, hi: 2, bn: 2, mr: 2 })) {
  if ((emergencyCounts[language] || 0) < expected) {
    failures.push(`Need ${expected} qa_passed ${language} emergency posts.`);
  }
}

const completeAssetDays = uniqueDays.filter((day) => {
  const padded = String(day).padStart(2, '0');
  return fs.existsSync(path.join(campaignDir, 'assets', `day-${padded}`, 'card-square.png'))
    && fs.existsSync(path.join(campaignDir, 'assets', `day-${padded}`, 'card-story.png'));
});
if (completeAssetDays.length < 14) failures.push(`Need 14 complete asset days; found ${completeAssetDays.length}.`);

if (failures.length > 0) {
  console.error('CAMPAIGN NOT READY');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('CAMPAIGN READY: structural, rights, emergency, and asset gates passed.');
}

