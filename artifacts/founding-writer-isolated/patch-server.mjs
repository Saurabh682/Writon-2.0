import fs from 'node:fs';

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0 || source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${label}: expected exactly one source match`);
  }
  return source.replace(before, after);
}

for (const file of process.argv.slice(2)) {
  let source = fs.readFileSync(file, 'utf8');
  source = replaceOnce(source, `function publicMediaBaseUrl(request) {
  if (config.publicApiBaseUrl) return new URL(config.publicApiBaseUrl).origin;
  if (!request) return 'https://api.writon.cc';
  const forwardedProto = request.headers['x-forwarded-proto'];
  const protocol = typeof forwardedProto === 'string' ? forwardedProto.split(',')[0] : request.protocol;
  return \`${'${protocol}'}://${'${request.headers.host}'}\`;
}`, `function publicMediaBaseUrl(request) {
  if (config.publicApiBaseUrl) return new URL(config.publicApiBaseUrl).origin;
  // Cloud Run revision hosts are implementation details and are rejected by
  // the profile URL trust boundary. Emit the stable API origin by default.
  return 'https://api.writon.cc';
}`, 'canonical media origin');

  source = replaceOnce(source, `      'followersCnt', author.followers_count,
      'followingCnt', author.following_count
    ) as author,`, `      'followersCnt', author.followers_count,
      'followingCnt', author.following_count,
      'foundingWriterNumber', author.founding_writer_number,
      'emailVerified', author.email_verified
    ) as author,`, 'feed author fields');

  source = replaceOnce(source, `    followersCnt: row.followers_count,
    followingCnt: row.following_count,
  };`, `    followersCnt: row.followers_count,
    followingCnt: row.following_count,
    foundingWriterNumber: row.founding_writer_number ?? null,
    emailVerified: row.email_verified === true,
  };`, 'author mapping');

  source = replaceOnce(source, `    storiesCount: Number(row.stories_count ?? 0),
    applaudsReceived: Number(row.applauds_received ?? 0),
  };`, `    storiesCount: Number(row.stories_count ?? 0),
    applaudsReceived: Number(row.applauds_received ?? 0),
    foundingWriterNumber: row.founding_writer_number ?? null,
    emailVerified: row.email_verified === true,
  };`, 'profile mapping');

  source = replaceOnce(source, `  id, email, pen_name, full_name, bio, avatar_url, location, joined_at,
  followers_count, following_count,`, `  id, email, pen_name, full_name, bio, avatar_url, location, joined_at,
  founding_writer_number, email_verified,
  followers_count, following_count,`, 'profile returning fields');

  source = replaceOnce(source, `    \`insert into public.profiles (id, email, pen_name, full_name, account_type)
     values ($1, $2, $3, $4, 'human')
     on conflict (id) do update
       set email = coalesce(excluded.email, public.profiles.email),`, `    \`insert into public.profiles (id, email, pen_name, full_name, account_type, email_verified)
     values ($1, $2, $3, $4, 'human', $5)
     on conflict (id) do update
       set email = coalesce(excluded.email, public.profiles.email),
           email_verified = public.profiles.email_verified or excluded.email_verified,`, 'profile verification upsert');

  source = replaceOnce(source, `    [profileId, decodedToken.email ?? null, fallbackPenName, fallbackFullName]
  );`, `    [profileId, decodedToken.email ?? null, fallbackPenName, fallbackFullName, decodedToken.email_verified === true]
  );`, 'profile verification parameter');

  source = source.replaceAll(`p.followers_count, p.following_count, alias.quote_of_day`, `p.followers_count, p.following_count,
              p.founding_writer_number, p.email_verified, alias.quote_of_day`);

  source = replaceOnce(source, `        'followersCnt', author.followers_count,
        'followingCnt', author.following_count
      ) as author,`, `        'followersCnt', author.followers_count,
        'followingCnt', author.following_count,
        'foundingWriterNumber', author.founding_writer_number,
        'emailVerified', author.email_verified
      ) as author,`, 'comment author fields');

  source = source.replaceAll(`p.followers_count, p.following_count, alias.quote_of_day
     from public.profiles p`, `p.followers_count, p.following_count,
            p.founding_writer_number, p.email_verified, alias.quote_of_day
     from public.profiles p`);

  const requiredCounts = {
    foundingWriterNumber: (source.match(/foundingWriterNumber/g) || []).length,
    emailVerified: (source.match(/emailVerified/g) || []).length,
    selectedDatabaseFields: (source.match(/founding_writer_number/g) || []).length,
  };
  if (requiredCounts.foundingWriterNumber < 3
      || requiredCounts.emailVerified < 3
      || requiredCounts.selectedDatabaseFields < 7) {
    throw new Error(`${file}: incomplete patch ${JSON.stringify(requiredCounts)}`);
  }
  fs.writeFileSync(file, source);
  console.log(JSON.stringify({ file, requiredCounts }));
}
