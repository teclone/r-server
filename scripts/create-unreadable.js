const fs = require('fs');

console.log('creating write only file for testing purposes');

fs.writeFileSync(
  'tests/helpers/unreadable.txt',
  'this file is intentionally made not read accessible for testing purposes',
  {
    encoding: 'utf8',
    mode: '0366'
  }
);

console.log('created write only file for testing purposes');
