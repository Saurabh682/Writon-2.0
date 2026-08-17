import fs from 'fs';
import path from 'path';

const sqlPath = 'D:\\Gdrive\\WoN App\\backup\\Blog_BlogMaster.sql';
const content = fs.readFileSync(sqlPath, 'utf8');

const regex = /\((\d+),\s*'([^']*)',\s*'([^']*)'/g;
const cats = new Map<string, number>();
const subcats = new Map<string, number>();
let match;
while ((match = regex.exec(content)) !== null) {
  const cat = match[2].trim();
  const sub = match[3].trim();
  if (cat) cats.set(cat, (cats.get(cat) || 0) + 1);
  if (sub) subcats.set(sub, (subcats.get(sub) || 0) + 1);
}

console.log('--- ALL LEGACY CATEGORIES (with counts) ---');
console.log(Object.fromEntries(cats));

console.log('\n--- ALL LEGACY SUBCATEGORIES (with counts) ---');
console.log(Object.fromEntries(subcats));
