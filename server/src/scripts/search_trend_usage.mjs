import fs from 'node:fs';
import path from 'node:path';

function searchInDir(dir, pattern) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchInDir(fullPath, pattern);
    } else if (file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (pattern.test(content)) {
        console.log(`Match in ${fullPath}`);
      }
    }
  }
}

console.log('Searching for conductDeepTrendResearch:');
searchInDir('src', /conductDeepTrendResearch/);
console.log('Searching for harvestParallelTrends:');
searchInDir('src', /harvestParallelTrends/);
