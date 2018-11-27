export default {

    'env': 'development',

    'errorLog': '.error.log',

    'accessLog': '.access.log',

    'profileRequest': false,

    'tempDir': 'storage/temp',

    'publicPaths': [
        'public'
    ],

    'serveDotFiles': false,

    'cacheControl': 'no-cache, max-age=86400',

    'encoding': 'latin1',

    'maxBufferSize': 50000000,

    'mimeTypes': {
        'json': 'application/json',
        'html': 'text/html',
        'xml': 'text/xml',
        'js': 'text/javascript',
        'css': 'text/css',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'mp3': 'audio/mp3',
        'mp4': 'video/mp4',
        'pdf': 'application/pdf'
    },

    'defaultDocuments': [
        'index.html',
        'index.js',
        'index.css'
    ],

    'httpErrors': {
        'baseDir': '',
        '404': ''
    },

    'https': {
        'enabled': false,
        /* can be overriden by setting process.env.HTTPS_PORT */
        'port': 5000,

        /* enforce https by redirecting all http request to https */
        'enforce': true,

        /* https credentials, use  */
        'credentials': {
            'key': '.ssl/server.key',
            'cert': '.ssl/server.crt',
            //'pfx': 'relativePath',
            //'passphrase': 'pfx passphrase'
        }
    }
};