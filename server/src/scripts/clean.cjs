const fs = require('fs');
let s = fs.readFileSync('server/src/services/trend-cloud-sync.js', 'utf8');
s = s.replace(/'''/g, "'");
s = s.replace(/''/g, "'");
fs.writeFileSync('server/src/services/trend-cloud-sync.js', s);
console.log('Cleaned repeated quotes');