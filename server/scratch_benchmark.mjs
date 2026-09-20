async function test(name, url) {
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const json = await res.json();
    const elapsed = Date.now() - start;
    console.log(`[${name}] ${res.status} in ${elapsed}ms -> ${json.posts?.length} posts. Top story: "${json.posts?.[0]?.title}" (${json.posts?.[0]?.createdAt})`);
  } catch (e) {
    const elapsed = Date.now() - start;
    console.log(`[${name}] FAILED in ${elapsed}ms: ${e.message}`);
  }
}

async function main() {
  await test('Custom Domain (api.writon.cc)', 'https://api.writon.cc/api/v1/posts?limit=3');
  await test('Google Cloud Run (run.app)', 'https://writon-api-802112841589.asia-south1.run.app/api/v1/posts?limit=3');
  await test('Render (onrender.com)', 'https://writon-powerup.onrender.com/api/v1/posts?limit=3');
}

main();
