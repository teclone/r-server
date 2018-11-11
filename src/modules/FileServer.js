/**
 *@module FileServer
*/
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export default class FileServer {

    /**
     *@param {string} rootDir - the project root directory
     *@param {ServerConfig} config - the server config object
     *@param {Array} publicPaths - array of public paths to serve static files from
     *@param {Object} mimeTypes - object of file mime types
     *@param {Array} defaultDocuments - array of folder default documents
     *@param {string} cacheControl - cache control header for static files
     *@param {}
    */
    constructor(rootDir, {publicPaths, mimeTypes, defaultDocuments, cacheControl}, logger) {
        this.rootDir = rootDir;
        this.publicPaths = publicPaths.map(publicPath => {
            return path.join(rootDir, publicPath, '/');
        });

        this.mimeTypes = mimeTypes;
        this.defaultDocuments = defaultDocuments;
        this.cacheControl = cacheControl;
        this.methods = ['GET', 'HEAD', 'OPTIONS'];
        this.logger = logger;
    }

    /**
     * return instance identity
    */
    get [Symbol.toStringTag]() {
        return 'FileServer';
    }

    /**
     * computes and returns a files eTag
     *@private
     *@param {number} fileMTime - the files last modification time
     *@param {string} [length=16] - the hash tag length to generate
     *@returns {string}
    */
    getFileTag(fileMTime, length) {
        let hash = crypto.createHash('sha256');
        hash.update(fileMTime.toString());

        return hash.digest('hex').substring(0, length || 16);
    }

    /**
     * returns the directories default document if any
     *@private
     *@param {string} dir - dir or file path.
     *@returns {string}
    */
    getDefaultDocument(dir) {
        for(let file of this.defaultDocuments)
            if (fs.existsSync(path.join(dir, '/', file)))
                return file;

        return '';
    }

    /**
     * returns default response headers
     *@private
     *@param {string} filePath - the file path
     *@returns {Object}
    */
    getDefaultHeaders(filePath) {
        let stat = fs.statSync(filePath);

        return {
            'Content-Type': this.mimeTypes[path.parse(filePath).ext.substring(1)] ||
                'application/octet-stream',
            'Last-Modified': stat.mtime.toString(),
            'Content-Length': stat.size,
            'ETag': this.getFileTag(stat.mtime),
            'Cache-Control': this.cacheControl
        };
    }

    /**
     * negotiates the content
     *@private
    */
    negotiateContent(headers, eTag, fileMTime) {
        if (typeof headers['if-none-match'] !== 'undefined' &&
            headers['if-none-match'] === eTag)
            return true;

        if (typeof headers['if-modified-since'] !== 'undefined' &&
            headers['if-modified-since'] === fileMTime)
            return true;

        return false;
    }

    /**
     * validates the request method and returns the public file or directory path that
     * matches the request url
     *@private
     *@param {string} method - the request method
     *@returns {string}
    */
    validateRequest(url, method) {
        let validPath = '';

        //sanitize the url
        url = decodeURIComponent(url).replace(/[#?].*/, '').replace(/\.\./g, '');

        //do not serve files start with dot or that is inside a folder whose name starts with dot
        if (!/^(\.|.*\/\.)/.test(url) && this.methods.includes(method.toUpperCase())) {
            for (let publicPath of this.publicPaths) {
                const testPath = path.join(publicPath, url);

                if (!fs.existsSync(testPath))
                    continue;

                if (fs.statSync(testPath).isFile()) {
                    validPath = testPath;
                    break;
                }

                //check if there is a default document in the folder
                const defaultDocument = this.getDefaultDocument(testPath);
                if (defaultDocument) {
                    validPath = path.join(testPath + '/' + defaultDocument);
                    break;
                }
            }
        }

        return validPath;
    }

    /**
     * ends the response.
     *@private
     *@param {Response} response - the response object
     *@param {number} status - response status code
     *@param {Object} headers - the response headers to write
     *@param {string|Buffer} [data] - response data to send
     *@returns {Promise} promises resolves to true
    */
    endResponse(response, status, headers, data) {
        return response.status(status).setHeaders(headers).end(data);
    }

    /**
     * ends the streaming response
     *@private
     *@param {string} filePath - the file path to serve.
     *@param {Response} response - the response object
     *@param {number} status - the status code
     *@param {Object} headers - the request headers
     *@returns {Promise} that resolves to true
    */
    endStream(filePath, response, status, headers) {
        return new Promise((resolve) => {

            const readStream = fs.createReadStream(filePath);
            response.status(status).setHeaders(headers);

            readStream.on('end', () => {
                return response.end().then(() => {
                    resolve(true);
                });
            });
            // .on('error', (err) => {
            //     readStream.end();
            //     this.logger.fatal(err, response);
            //     resolve(true);
            // });

            readStream.pipe(response, {end: false});
        });
    }

    /**
     * serves a static file response back to the client
     *@param {string} url - the request url
     *@param {string} method - the request method
     *@param {Object} headers - the request headers
     *@param {Response} response - the response object
    */
    serve(url, method, headers, response) {
        method = method.toUpperCase();

        let filePath = this.validateRequest(url, method);
        if (filePath === '')
            return Promise.resolve(false);

        if (method === 'OPTIONS') {
            const methods = ['OPTIONS', 'HEAD', 'GET', 'POST'];
            return this.endResponse(response, 200, {Allow: methods.join(',')});
        }

        let resHeaders = this.getDefaultHeaders(filePath);

        if (this.negotiateContent(headers, resHeaders['ETag'], resHeaders['Last-Modified']))
            return this.endResponse(response, 304);

        switch(method) {
            case 'HEAD':
                resHeaders['Accept-Ranges'] = 'bytes';
                return this.endResponse(response, 200, resHeaders);

            case 'GET':
                return this.endStream(filePath, response, 200, resHeaders);
        }
    }

    /**
     * servers server http error files. such as 504, 404, etc
     *@param {Response} response - the response object
     *@param {number} status - the response status code
     *@param {string} baseDir - the user defined httErors base directory relative to root.
     *@param {string} filePath - the file path that is mapped to the error code
     * fails or completes
     *@returns {Promise} promise resolves to true
    */
    serveHttpErrorFile(response, status, baseDir, filePath) {
        if (!filePath)
            filePath = path.join(__dirname, '../httpErrors/' + status + '.html');
        else
            filePath = path.join(this.rootDir, baseDir, filePath);

        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory())
            return response.status(status).end();

        let headers = this.getDefaultHeaders(filePath);
        return this.endStream(filePath, response, status, headers);
    }

    /**
     * serves file intended for download to the client
     *@param {Response} response - the response object
     *@param {string} filePath - the file path
     *@param {string} [filename] - suggested file that the browser will use in saving the file
     *@returns {Promise} - returns promise
    */
    serveDownload(response, filePath, filename) {
        let absPath = path.join(this.rootDir, filePath);
        if (!fs.existsSync(absPath) || fs.statSync(absPath).isDirectory()) {
            return Promise.reject(new Error(absPath + ' does not exists'));
        }

        let resHeaders = this.getDefaultHeaders(filePath);
        filename = typeof filename === 'string' && filename?
            filename : path.parse(absPath).base;

        resHeaders['Content-Disposition'] = 'attachment; filename="' + filename + '"';

        return this.endStream(absPath, response, 200, resHeaders);
    }
}