import {ServerResponse} from 'http';

/**
 * return object identity
*/
Object.defineProperty(ServerResponse.prototype, Symbol.toStringTag, {
    get() {
        return 'RServerResponse';
    }
});

/**
 * sends file intended for download to the client
 *@param {string} filePath - file relative path
 *@param {string} [filename] - suggested file download name that the browser uses while
 * saving the file. defaults to the files base name.
 *@param {Function} callback - the callback function to execute once the operation
 * completes or fails
*/
ServerResponse.prototype.download = function(filePath, filename, callback) {
    this.staticFileServer.serveDownload(this, filePath, filename, callback);
};

export default ServerResponse;