/**
 * static file server module
*/
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import Util from './Util.js';

export default class StaticFileServer {

    /**
     *@param {string} rootDir - the project root directory
     *@param {Array} publicPaths - array of public paths to serve static files from
     *@param {Object} mimeTypes - object of file mime types
     *@param {Array} defaultDocuments - array of folder default documents
     *@param {string} cacheControl - cache control header for static files
    */
    constructor(rootDir, publicPaths, mimeTypes, defaultDocuments, cacheControl) {
        this.rootDir = rootDir;
        this.publicPaths = publicPaths.map(publicPath =>  {
            return path.join(rootDir, publicPath, '/');
        });
        this.mimeTypes = mimeTypes;
        this.defaultDocuments = defaultDocuments;
        this.cacheControl = cacheControl || 'no-cache, max-age=86400';
    }

    /**
     * return instance identity
    */
    get [Symbol.toStringTag]() {
        return 'StaticFileServer';
    }

    /**
     * returns default response headers
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
     * ends the response.
     *@param {RServerResponse} response - the response object
     *@param {number} status - response status code
     *@param {Object} headers - the response headers to write
     *@param {string|Buffer} [data] - response data to send
     *@param {function} [callback] - a callback method
     *@returns {boolean}
    */
    endResponse(response, status, headers, data, callback) {
        callback = Util.isCallable(callback)? callback : () => {};
        response.writeHead(status, headers || {});

        if (data)
            response.end(data);
        else
            response.end();
        setTimeout(function() {
            callback();
        }, 1);
        return true;
    }

    /**
     * ends the streaming response
     *@param {string} filePath - the file path to serve.
     *@param {RServerResponse} - the response object
     *@param {number} status - the status code
     *@param {Object} headers - the request headers
     *@param {function} [callback] - a callback method
     *@returns {boolean}
    */
    endStream(filePath, response, status, headers, callback) {
        callback = Util.isCallable(callback)? callback : () => {};

        response.writeHead(status, headers);

        let readStream = fs.createReadStream(filePath);

        readStream.on('end', () => {
            response.end(callback);
        })
            .on('error', () => {
                /* istanbul ignore next */
                readStream.end();
            });

        readStream.pipe(response, {end: false});
        return true;
    }

    /**
     * negotiates the content
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
     * computes and returns a files eTag
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
     * validates the request method and returns the public file or directory path that
     * matches the request url
     *@param {string} method - the request method
     *@returns {string}
    */
    validateRequest(url, method) {
        let validPath = '';
        //sanitize the url
        url = decodeURIComponent(url).replace(/[#?].*/, '').replace(/\.\./g, '');

        if (['GET', 'OPTIONS', 'HEAD'].includes(method.toUpperCase())) {
            for (let publicPath of this.publicPaths) {
                let testPath = path.join(publicPath, url);

                if (fs.existsSync(testPath)) {

                    if (fs.statSync(testPath).isFile()) {
                        validPath = testPath;
                        break;
                    }

                    let defaultDocument = this.getDefaultDocument(testPath);
                    if (defaultDocument) {
                        validPath = path.join(testPath + '/' + defaultDocument);
                        break;
                    }
                }
            }
        }

        //do not serve files that starts with .
        if (validPath && path.basename(validPath).indexOf('.') !== 0)
            return validPath;
        else
            return '';
    }

    /**
     * serves a static file response back to the client
     *@param {string} url - the request url
     *@param {string} method - the request method
     *@param {Object} headers - the request headers
     *@param {RServerResponse} response - the response object
     *@param {Function} [callback] - a callback function that will be called once the operation
     * fails or completes
    */
    serve(url, method, headers, response, callback) {
        method = method.toUpperCase();

        let filePath = this.validateRequest(url, method);
        if (filePath === '')
            return false;

        if (method === 'OPTIONS')
            return this.endResponse(response, 200, {'Allow': 'OPTIONS, HEAD, GET, POST'}, null, callback);

        let resHeaders = this.getDefaultHeaders(filePath);

        if (this.negotiateContent(headers, resHeaders['ETag'], resHeaders['Last-Modified']))
            return this.endResponse(response, 304, {}, null, callback);

        switch(method) {
            case 'HEAD':
                resHeaders['Accept-Ranges'] = 'bytes';
                return this.endResponse(response, 200, resHeaders, null, callback);

            case 'GET':
                return this.endStream(filePath, response, 200, resHeaders, callback);
        }
    }

    /**
     * servers server http error files. such as 504, 404, etc
     *@param {RServerResponse} response - the response object
     *@param {number} status - the response status code
     *@param {string} baseDir - the user defined httErors base directory relative to root.
     *@param {string} filePath - the file path that is mapped to the error code
     *@param {Function} [callback] - a callback function that will be called once the operation
     * fails or completes
    */
    serveHttpErrorFile(response, status, baseDir, filePath, callback) {
        if (!filePath)
            filePath = path.join(__dirname, '../httpErrors/' + status + '.html');
        else
            filePath = path.join(this.rootDir, baseDir, filePath);

        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
            response.statusCode = status;
            response.end(callback);
            return true;
        }

        let headers = this.getDefaultHeaders(filePath);
        this.endStream(filePath, response, status, headers, callback);
        return true;
    }

    /**
     * serves file intended for download to the client
     *@param {RServerResponse} response - the response object
     *@param {string} filePath - the file path
     *@param {string} [filename] - suggested file that the browser will use in saving the file
     *@param {Function} [callback] - a callback function that will be called once the operation
     * fails or completes
    */
    serveDownload(response, filePath, filename, callback) {
        let absPath = path.join(this.rootDir, filePath);
        if (!fs.existsSync(absPath) || fs.statSync(absPath).isDirectory()) {
            response.end(callback);
            return;
        }

        let resHeaders = this.getDefaultHeaders(filePath);
        filename = typeof filename === 'string' && filename?
            filename : path.parse(absPath).base;

        resHeaders['Content-Disposition'] = 'attachment; filename="' + filename + '"';

        this.endStream(absPath, response, 200, resHeaders, callback);
    }
}