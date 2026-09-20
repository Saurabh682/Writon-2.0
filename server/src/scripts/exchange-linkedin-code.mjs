#!/usr/bin/env node
/**
 * Exchange LinkedIn authorization code for Access Token and Refresh Token
 * 
 * Usage:
 *   node server/src/scripts/exchange-linkedin-code.mjs --code="YOUR_AUTH_CODE"
 */

import dotenv from 'dotenv';
import pg from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const codeArg = process.argv.find(a => a.startsWith('--code='));
const code = codeArg ? codeArg.split('=')[1]?.trim() : process.argv[2]?.trim();

if (!code) {
  console.error('❌ Please supply the authorization code:');
  console.error('   node server/src/scripts/exchange-linkedin-code.mjs --code="AQRx..."');
  process.exit(1);
}

async function main() {
  const clientId = process.env.LINKEDIN_CLIENT_ID || '77ckbwgwaf2o8s';
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = 'https://writon.cc/';

  console.log('🔄 Exchanging authorization code with LinkedIn OAuth token endpoint...');
  console.log(`   Client ID: ${clientId}`);
  console.log(`   Redirect URI: ${redirectUri}`);

  const bodyParams = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: bodyParams.toString(),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error(`❌ Non-JSON response from LinkedIn (HTTP ${res.status}):`, text);
    process.exit(1);
  }

  if (!res.ok || data.error) {
    console.error(`❌ Token exchange failed (HTTP ${res.status}):`, data);
    process.exit(1);
  }

  console.log('✅ Token Exchange Successful!');
  console.log(`   Access Token: ${data.access_token.slice(0, 20)}... (expires in ${data.expires_in}s)`);
  if (data.refresh_token) {
    console.log(`   Refresh Token: ${data.refresh_token.slice(0, 20)}... (expires in ${data.refresh_token_expires_in}s)`);
  } else {
    console.log('   (No refresh token returned; access token is long-lived 60 days)');
  }

  // Fetch Member Profile
  console.log('👤 Fetching LinkedIn Profile via /v2/userinfo...');
  const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const userInfo = await userRes.json();
  console.log('   User Profile:', userInfo);

  const personUrn = userInfo.sub ? `urn:li:person:${userInfo.sub}` : process.env.LINKEDIN_PERSON_URN;
  const personName = userInfo.name || `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim();

  // Update .env file
  console.log('💾 Updating server/.env with new tokens...');
  let envContent = fs.readFileSync(envPath, 'utf-8');

  envContent = envContent.replace(/^LINKEDIN_ACCESS_TOKEN=.*$/m, `LINKEDIN_ACCESS_TOKEN=${data.access_token}`);
  if (personUrn) {
    envContent = envContent.replace(/^LINKEDIN_PERSON_URN=.*$/m, `LINKEDIN_PERSON_URN=${personUrn}`);
  }
  if (personName) {
    envContent = envContent.replace(/^LINKEDIN_PERSON_NAME=.*$/m, `LINKEDIN_PERSON_NAME=${personName}`);
  }
  if (data.refresh_token) {
    if (/^LINKEDIN_REFRESH_TOKEN=/m.test(envContent)) {
      envContent = envContent.replace(/^LINKEDIN_REFRESH_TOKEN=.*$/m, `LINKEDIN_REFRESH_TOKEN=${data.refresh_token}`);
    } else {
      envContent += `\nLINKEDIN_REFRESH_TOKEN=${data.refresh_token}`;
    }
  }

  fs.writeFileSync(envPath, envContent, 'utf-8');
  console.log('✅ server/.env updated.');

  // Update Database Connection
  console.log('🗄️ Updating PostgreSQL public.linkedin_connections...');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const expiresAt = new Date(Date.now() + (data.expires_in * 1000));
  const refreshExpiresAt = data.refresh_token_expires_in ? new Date(Date.now() + (data.refresh_token_expires_in * 1000)) : null;

  await pool.query(`
    INSERT INTO public.linkedin_connections (
      author_urn, author_type, access_tier, api_version, permissions, capabilities,
      configured_app_limit, configured_member_limit, quota_source,
      token_expires_at, refresh_token_expires_at, has_refresh_grant,
      last_verified_at, updated_at
    ) VALUES ($1, 'MEMBER', 'DEVELOPMENT', '202609', $2, $3, 500, 100, 'DEVELOPMENT_DEFAULT', $4, $5, $6, now(), now())
    ON CONFLICT (author_urn) DO UPDATE SET
      token_expires_at = EXCLUDED.token_expires_at,
      refresh_token_expires_at = EXCLUDED.refresh_token_expires_at,
      has_refresh_grant = EXCLUDED.has_refresh_grant,
      last_verified_at = now(),
      updated_at = now();
  `, [
    personUrn,
    ['openid', 'profile', 'email', 'w_member_social'],
    { can_publish_member: true, can_publish_org: false, has_member_analytics: false, has_org_analytics: false },
    expiresAt,
    refreshExpiresAt,
    Boolean(data.refresh_token)
  ]);

  await pool.end();
  console.log('🚀 Complete! LinkedIn integration is fully connected with active tokens.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
