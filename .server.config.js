const { createConfig } = require('./build/cjs');
module.exports = createConfig({
  https: {
    enabled: false,
    enforce: true,
    credentials: {
      key: '.cert/server.key',
      cert: '.cert/server.crt',
    },
  },
});
