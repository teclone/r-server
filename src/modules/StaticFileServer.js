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
}