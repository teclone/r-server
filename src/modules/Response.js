/**
 *@module Response
*/
import {ServerResponse as Response} from 'http';
import Util from './Util';

/**
 * catch the built in setHeader and setHeaders method.
*/
const setHeader = Response.prototype.setHeader;

/**
 * make the setHeader method chainable
 *@returns {this}
*/
Response.prototype.setHeader = function(name, value) {
    setHeader.call(this, name, value);
    return this;
};

/**
 * make the setHeaders method chainable
 *@returns {this}
*/
Response.prototype.setHeaders = function(headers) {

    if (Util.isPlainObject(headers)) {
        Object.entries(headers).forEach(current => {
            setHeader.call(this, ...current);
        });
    }

    return this;
};

/**
 * sets the status code for the response
 *@param {int} code - status code
 *@returns {this}
*/
Response.prototype.status = function(code) {
    this.statusCode = code;
    return this;
};

/**
 * sends json content back to the browser
 *@param {string|Object} data - json string or json object
 *@returns {this}
*/
Response.prototype.json = function(data) {
    if (typeof data !== 'string')
        data = JSON.stringify(data);

    this.setHeader('Content-Type', 'application/json').end(data);
    return this;
};

/**
 * sends file intended for download to the client
 *@param {string} filePath - file relative path
 *@param {string} [filename] - suggested file download name that the browser uses while
 * saving the file. defaults to the files base name.
 *@param {Function} callback - the callback function to execute once the operation
 * completes or fails
*/
Response.prototype.download = function(filePath, filename, callback) {
    this.fileServer.serveDownload(this, filePath, filename, callback);
};

export default Response;