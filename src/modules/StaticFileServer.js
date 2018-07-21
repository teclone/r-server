/**
 * static file server module
*/
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export default class {
    /**
     *@param {string} rootDir - the project root directory
     *@param {Array} publicPaths - array of public paths to serve static files from
     *@param {Object} mimeTypes - object of file mime types
     *@param {Array} defaultDocuments - array of folder default documents
     *@param {string} cacheControl - cache control header for static files
    */
    constructor(rootDir, publicPaths, mimeTypes, defaultDocuments, cacheControl) {
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
     * ends the response.
     *@param {http.ServerResponse} response - the response object
     *@param {number} status - response status code
     *@param {Object} headers - the response headers to write
     *@param {string|Buffer} [data] - response data to send
     *@returns {boolean}
    */
    endResponse(response, status, headers, data) {
        response.writeHead(status, headers || {});
        if (data)
            response.end(data);
        else
            response.end();
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
            headers['if-modified-since'].replace(/GMT.*/i, 'GMT') === fileMTime)
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
}