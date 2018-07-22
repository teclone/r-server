import {ServerResponse} from 'http';

export default {
    /**
     * returns an RServerResponse class
     *@param {StaticFileServer} staticFileServer - static file server instance
     *@returns {RServerResponse}
    */
    getClass(staticFileServer) {

        return class extends ServerResponse {
            /**
             * call the super class.
            */
            constructor(...args) {
                super(...args);
            }

            /**
             * return the instance identifier
            */
            get [Symbol.toStringTag]() {
                return 'RServerResponse';
            }

            /**
             * sends file intended for download to the client
             *@param {string} filePath - file relative path
             *@param {string} [filename] - suggested file download name that the browser uses while
             * saving the file. defaults to the files base name.
             *@param {Function} callback - the callback function to execute once the operation
             * completes or fails
            */
            download(filePath, filename, callback) {
                staticFileServer.serveDownload(this, filePath, filename, callback);
            }
        };
    }
};