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
    constructor(rootDir, {publicPaths, mimeTypes, defaultDocuments,
        cacheControl, serveDotFiles}, logger) {
        this.rootDir = rootDir;
        this.publicPaths = publicPaths.map(publicPath => {
            return path.resolve(rootDir, publicPath);
        });

        this.mimeTypes = mimeTypes;
        this.defaultDocuments = defaultDocuments;
        this.cacheControl = cacheControl;
        this.methods = ['GET', 'HEAD', 'OPTIONS'];
        this.logger = logger;
        this.serveDotFiles = serveDotFiles;
    }

    /**
     * return instance identity
    */
    get [Symbol.toStringTag]() {
        return 'FileServer';
    }

    /**
     * validates range request content. returns false if 416 response code should be sent back.
     *@returns {object}
     *@private
    */
    validateRangeRequest(headers, eTag, fileMTime, fileSize) {
        const result = {status: 206, ranges: []},
            ifRange = headers['if-range'];

        if (typeof ifRange !== 'undefined' && ifRange !== eTag && ifRange !== fileMTime) {
            result.status = 200;
            result.ranges.push({start: 0, end: fileSize - 1, length: fileSize});
        }
        else {
            const ranges = headers['range'].replace(/^\s*[^=]*=\s*/, '').split(',');
            for (let range of ranges) {
                let start = 0,
                    end = fileSize - 1,
                    length = fileSize;

                if (/^(\d+)-(\d+)$/.test(range)) {
                    start = Number.parseInt(RegExp.$1);
                    end = Number.parseInt(RegExp.$2);
                }
                else if (/^(\d+)-$/.test(range)) {
                    start = Number.parseInt(RegExp.$1);
                }

                if (start >= fileSize || end >= fileSize || start > end) {
                    result.status = 416;
                    break;
                }
                else {
                    length = end - start + 1;
                    result.ranges.push({start, end, length});
                }
            }
        }
        return result;
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
            if (fs.existsSync(path.resolve(dir, file)))
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
     * validates the request method and returns the public file or directory path that
     * matches the request url
     *@private
     *@param {string} method - the request method
     *@returns {string}
    */
    validateRequest(url, method) {

        if (!this.methods.includes(method.toUpperCase()))
            return '';

        //sanitize the url
        url = decodeURIComponent(url).replace(/[#?].*/, '')
            .replace(/\.\./g, '').replace(/^\/+/, '');

        //do not server dot files if the serveDotFiles config setting is false
        if (!this.serveDotFiles && /^(\.|.*\/\.)/.test(url))
            return '';

        let validPath = '';

        for (let publicPath of this.publicPaths) {
            const testPath = path.resolve(publicPath, url);

            if (!fs.existsSync(testPath))
                continue;

            if (fs.statSync(testPath).isFile()) {
                validPath = testPath;
                break;
            }

            //check if there is a default document in the folder
            const defaultDocument = this.getDefaultDocument(testPath);
            if (defaultDocument) {
                validPath = path.resolve(testPath, defaultDocument);
                break;
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
     *@param {Object} [options] - stream options
     *@param {number} [options.start] - position to start reading from
     *@param {number} [options.end] - position to end reading from
     *@returns {Promise} that resolves to true
    */
    endStream(filePath, response, status, headers, options) {
        return new Promise((resolve) => {

            const readStream = fs.createReadStream(filePath, options);
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

        const resHeaders = this.getDefaultHeaders(filePath);
        if (method === 'HEAD') {
            resHeaders['Accept-Ranges'] = 'bytes';
            return this.endResponse(response, 200, resHeaders);
        }

        const eTag = resHeaders['ETag'],
            lastModified = resHeaders['Last-Modified'],
            fileSize = resHeaders['Content-Length'];

        //if it is not a range request, negotiate content
        if (typeof headers['range'] === 'undefined') {
            if (this.negotiateContent(headers, eTag, lastModified))
                return this.endResponse(response, 304);
            else
                return this.endStream(filePath, response, 200, resHeaders);
        }

        const {status, ranges} = this.validateRangeRequest(
            headers, eTag, lastModified, fileSize
        );

        //if status is 200, we are sending everything.
        if(status === 200)
            return this.endStream(filePath, response, 200, resHeaders);

        //range not satisfiable
        if (status === 416)
            return this.endResponse(response, 416);

        //if it is a single range request, respond
        if (ranges.length === 1) {
            const {start, end, length} = ranges[0];
            return this.endStream(filePath, response, 206, Object.assign(
                {},
                resHeaders,
                {
                    'Content-Length': length,
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`
                }
            ), {start, end});
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
            filePath = path.resolve('../httpErrors/' + status + '.html');
        else
            filePath = path.resolve(this.rootDir, baseDir, filePath);

        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory())
            return response.status(status).end();

        const headers = this.getDefaultHeaders(filePath);
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
        const absPath = path.resolve(this.rootDir, filePath);
        if (!fs.existsSync(absPath) || fs.statSync(absPath).isDirectory())
            return Promise.reject(new Error(absPath + ' does not exists'));

        const resHeaders = this.getDefaultHeaders(filePath);
        filename = typeof filename === 'string' && filename?
            filename : path.parse(absPath).base;

        resHeaders['Content-Disposition'] = 'attachment; filename="' + filename + '"';

        return this.endStream(absPath, response, 200, resHeaders);
    }
}