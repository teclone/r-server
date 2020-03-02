const { config } = require('@teclone/rollup-all');
module.exports = config({
  config: {
    assets: ['httpErrors/**'],
    cjsConfig: {
      outDir: './lib',
    },
    esmConfig: {
      enabled: false,
    },
  },
});
