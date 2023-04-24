const { createConfig } = require('@teclone/rollup-all');
module.exports = createConfig({
  formats: ['cjs'],
  outDir: './',
});
