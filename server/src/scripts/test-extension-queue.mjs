import fetch from 'node:fetch';

async function main() {
  const SERVER_URL = 'http://localhost:3001/api/v1/extension';

  console.log('1. Checking Bridge Status...');
  try {
    const statusRes = await fetch(${SERVER_URL}/status);
    if (!statusRes.ok) {
      console.log('Bridge status check returned:', statusRes.status);
    } else {
      const statusData = await statusRes.json();
      console.log('Bridge is active:', statusData);
    }
  } catch (err) {
    console.log('Local server is currently offline or not on port 3001 (will start when needed).');
  }
}

main();
