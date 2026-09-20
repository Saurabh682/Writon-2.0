import fs from 'node:fs';
const b64 = process.argv[2];
const tgt = process.argv[3];
fs.writeFileSync(tgt, Buffer.from(b64, 'base64'));
console.log('Saved ' + tgt);