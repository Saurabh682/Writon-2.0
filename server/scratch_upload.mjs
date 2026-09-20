import fs from 'fs';
import https from 'https';

const APK_PATH = 'D:/VibeCode/WritOn-PowerUp/app/build/outputs/apk/release/app-release.apk';

async function uploadToTmpfiles() {
  try {
    const fileStream = fs.createReadStream(APK_PATH);
    const formData = new FormData();
    const blob = new Blob([fs.readFileSync(APK_PATH)]);
    formData.append('file', blob, 'WritOn-v2.0.26-build128.apk');

    const res = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData,
    });
    const json = await res.json();
    console.log('tmpfiles result:', JSON.stringify(json));
    if (json.data?.url) {
      // tmpfiles direct download URL replaces /xxxx/ with /dl/xxxx/
      const directUrl = json.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
      console.log('DIRECT DOWNLOAD URL (tmpfiles):', directUrl);
    }
  } catch (e) {
    console.error('tmpfiles error:', e.message);
  }
}

async function uploadToCatbox() {
  try {
    const formData = new FormData();
    const blob = new Blob([fs.readFileSync(APK_PATH)]);
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', blob, 'WritOn-v2.0.26-build128.apk');

    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData,
    });
    const text = await res.text();
    console.log('Catbox URL:', text);
  } catch (e) {
    console.error('Catbox error:', e.message);
  }
}

async function uploadToPixeldrain() {
  try {
    const fileBuf = fs.readFileSync(APK_PATH);
    const formData = new FormData();
    formData.append('file', new Blob([fileBuf]), 'WritOn-v2.0.26-build128.apk');

    const res = await fetch('https://pixeldrain.com/api/file/WritOn-v2.0.26-build128.apk', {
      method: 'PUT',
      body: fileBuf,
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
      },
    });
    const json = await res.json();
    console.log('Pixeldrain result:', JSON.stringify(json));
    if (json.id) {
      console.log('Pixeldrain Direct URL:', `https://pixeldrain.com/api/file/${json.id}?download`);
    }
  } catch (e) {
    console.error('Pixeldrain error:', e.message);
  }
}

async function main() {
  await uploadToPixeldrain();
  await uploadToTmpfiles();
  await uploadToCatbox();
}

main();
