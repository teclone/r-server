import { RServerConfig } from './@types';

export const rServerConfig: RServerConfig = {
  entryPath: './',

  env: 'development',

  errorLog: 'logs/error.log',

  accessLog: 'logs/access.log',

  profileRequest: true,

  tempDir: 'tmp/uploads',

  publicPaths: ['public'],

  serveHiddenFiles: true,

  cacheControl: 'no-cache, max-age=86400',

  encoding: 'latin1',

  maxMemory: '50mb',

  defaultDocuments: ['index.html', 'index.js', 'index.css'],

  httpErrors: {
    baseDir: '',
    404: '',
    500: '',
  },

  https: {
    enabled: false,

    /* can be overriden by setting process.env.HTTPS_PORT */
    port: 9000,

    /* enforce https by redirecting all http request to https */
    enforce: true,

    /* https credentials, use  */
    credentials: {
      key: '.cert/server.key',
      cert: '.cert/server.crt',
      //'pfx': 'relativePath',
      passphrase: 'pfx passphrase',
    },
  },
};
