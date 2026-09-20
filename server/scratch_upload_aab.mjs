import fs from 'fs';

const AAB_PATH = 'D:/VibeCode/WritOn-PowerUp/app/build/outputs/bundle/release/app-release.aab';

async function uploadAAB() {
  try {
    const formData = new FormData();
    const blob = new Blob([fs.readFileSync(AAB_PATH)]);
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', blob, 'WritOn-v2.0.26-build128.aab');

    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData,
    });
    const text = await res.text();
    console.log('AAB Catbox URL:', text);
  } catch (e) {
    console.error('AAB Catbox error:', e.message);
  }
}

uploadAAB();
