const { createConfig } = require('./build/cjs');
module.exports = createConfig({
  https: {
    enabled: false,
    enforce: false,
    credentials: {
      key: '.cert/server.key',
      cert: '.cert/server.crt',
    },
  },
});
