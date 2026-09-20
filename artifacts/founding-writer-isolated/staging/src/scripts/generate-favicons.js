import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, '../..');
import sharp from 'sharp';

async function generateFavicons() {
  const masterIcon = path.resolve(serverDir, '../public/assets/writon_app_icon.png');
  const publicDir = path.resolve(serverDir, '../public');
  const assetsDir = path.join(publicDir, 'assets');

  console.log('Generating crisp favicons from master icon:', masterIcon);

  // 1. 16x16 PNG
  const png16 = await sharp(masterIcon)
    .resize(16, 16, { fit: 'cover' })
    .png()
    .toBuffer();
  await fs.writeFile(path.join(assetsDir, 'favicon-16x16.png'), png16);
  await fs.writeFile(path.join(publicDir, 'favicon-16x16.png'), png16);

  // 2. 32x32 PNG
  const png32 = await sharp(masterIcon)
    .resize(32, 32, { fit: 'cover' })
    .png()
    .toBuffer();
  await fs.writeFile(path.join(assetsDir, 'favicon-32x32.png'), png32);
  await fs.writeFile(path.join(publicDir, 'favicon-32x32.png'), png32);

  // 3. 48x48 PNG
  const png48 = await sharp(masterIcon)
    .resize(48, 48, { fit: 'cover' })
    .png()
    .toBuffer();
  await fs.writeFile(path.join(assetsDir, 'favicon-48x48.png'), png48);

  // 4. 180x180 Apple Touch Icon
  const appleTouch = await sharp(masterIcon)
    .resize(180, 180, { fit: 'cover' })
    .png()
    .toBuffer();
  await fs.writeFile(path.join(assetsDir, 'apple-touch-icon.png'), appleTouch);
  await fs.writeFile(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);

  // 5. 192x192 Android / PWA Icon
  const icon192 = await sharp(masterIcon)
    .resize(192, 192, { fit: 'cover' })
    .png()
    .toBuffer();
  await fs.writeFile(path.join(assetsDir, 'icon-192.png'), icon192);

  // 6. Multi-resolution true ICO buffer
  const images = [
    { width: 16, height: 16, buffer: png16 },
    { width: 32, height: 32, buffer: png32 },
    { width: 48, height: 48, buffer: png48 }
  ];

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = [];
  const imageBuffers = [];

  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.buffer.length, 8);
    entry.writeUInt32LE(offset, 12);

    entries.push(entry);
    imageBuffers.push(img.buffer);
    offset += img.buffer.length;
  }

  const icoBuffer = Buffer.concat([header, ...entries, ...imageBuffers]);
  await fs.writeFile(path.join(publicDir, 'favicon.ico'), icoBuffer);
  await fs.writeFile(path.join(assetsDir, 'favicon.ico'), icoBuffer);

  // Copy to web/public
  const webPublicDir = path.resolve(serverDir, '../web/public');
  try {
    await fs.mkdir(webPublicDir, { recursive: true });
    await fs.writeFile(path.join(webPublicDir, 'favicon.ico'), icoBuffer);
    await fs.writeFile(path.join(webPublicDir, 'favicon-32x32.png'), png32);
    await fs.writeFile(path.join(webPublicDir, 'favicon-16x16.png'), png16);
    await fs.writeFile(path.join(webPublicDir, 'apple-touch-icon.png'), appleTouch);
    console.log('✅ Copied to web/public directory as well!');
  } catch (err) {
    console.log('web/public skip:', err.message);
  }

  console.log('🎉 All favicon formats successfully generated and written!');
}

generateFavicons().catch(console.error);
