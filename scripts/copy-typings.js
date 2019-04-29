var copydir = require('copy-dir');
const path = require('path');
const fs = require('fs');

const dest = path.resolve(__dirname, '../typings/@types');
fs.mkdirSync(dest);
copydir.sync(path.resolve(__dirname, '../src/@types'), dest);