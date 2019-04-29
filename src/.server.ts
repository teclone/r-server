import { RServerConfig } from './@types';

const rServerConfig: RServerConfig = {

    env: 'dev',

    errorLog: '.log/error.log',

    accessLog: '.log/access.log',

    profileRequest: true,

    tempDir: 'storage/temp',

    publicPaths: [
        'public'
    ],

    serveHiddenFiles: false,

    cacheControl: 'no-cache, max-age=86400',

    encoding: 'latin1',

    maxMemory: '50mb',

    defaultDocuments: [
        'index.html',
        'index.js',
        'index.css'
    ],

    httpErrors: {
        baseDir: '',
        404: '',
        500: ''
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
            passphrase: 'pfx passphrase'
        }
    }
}

export default rServerConfig;