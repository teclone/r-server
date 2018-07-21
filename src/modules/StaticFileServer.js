/**
 * static file server module
*/
import path from 'path';

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
}