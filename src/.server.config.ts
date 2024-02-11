import { RServerConfig } from './@types';

export const rServerConfig: RServerConfig = {
  errorLog: 'logs/error.log',

  accessLog: 'logs/access.log',

  tempDir: 'tmp/uploads',

  publicPaths: ['public'],

  cacheControl: 'no-cache, max-age=86400',

  encoding: 'latin1',

  maxMemory: '50mb',

  defaultDocuments: ['index.html', 'index.js', 'index.css'],

  httpErrors: {
    // base dir to all errors
    baseDir: '',
    404: '',
    500: '',
  },

  port: 8000,

  https: {
    enabled: false,

    port: 9000,

    /* enforce https by redirecting all http request to https */
    enforce: false,

    /* https credentials, use  */
    credentials: {
      key: '.cert/server.key',
      cert: '.cert/server.crt',
      //'pfx': 'relativePath',
      passphrase: 'pfx passphrase',
    },
  },
};
