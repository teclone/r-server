/**
 *@module Response
*/
import Util from './Util';
import {ServerResponse as Response} from 'http';

/*
 * catch the built in setHeader and end method.
*/
const setHeader = Response.prototype.setHeader,
    end = Response.prototype.end;

/**
 * sets a given http header on the response object
 * it is chainable
 *@param {string} name - the header name
 *@param {string|number} value - the header value
 *@returns {this}
*/
Response.prototype.setHeader = function(name, value) {
    setHeader.call(this, name, value);
    return this;
};

/**
 * calls the setHeader method on every response header name: value pair in the given
 * headers object
 *@param {Object} headers - object of header name: value pairs
 *@returns {this}
*/
Response.prototype.setHeaders = function(headers) {

    if (Util.isPlainObject(headers)) {
        Object.entries(headers).forEach(([name, value]) => {
            this.setHeader.call(this, name, value);
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
 * ends the response and returns a promise
 *
 *@param {string|Buffer} [data] - response data
 *@param {string} encoding - response data encoding
 *@returns {Promise}
*/
Response.prototype.end = function(data, encoding) {
    return new Promise((resolve) => {
        end.call(this, data, encoding, () => {
            resolve(true);
        });
    });
};

/**
 * sends json content back to the browser
 *@param {string|Object} data - json string or json object
 *@returns {Promise}
*/
Response.prototype.json = function(data) {
    if (typeof data !== 'string')
        data = JSON.stringify(data);

    return this.setHeader('Content-Type', 'application/json').end(data);
};

/**
 * sends file intended for download to the client
 *@param {string} filePath - file relative path
 *@param {string} [filename] - suggested file download name that the browser uses while
 * saving the file. defaults to the files base name.
 * completes or fails
 *@returns {Promise}
*/
Response.prototype.download = function(filePath, filename) {
    return this.fileServer.serveDownload(this.request, this, filePath, filename);
};

/**
 * Redirect client to the given url
 *@param {string} path - path to redirect user to
 *@param {number} [status=302] - redirect status code
*/
Response.prototype.redirect = function(path, status) {
    return this.status(status || 302).setHeader('Location', path).end();
};

export default Response;