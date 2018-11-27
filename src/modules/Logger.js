/**
 *@module Logger
*/
import { ENV, ERROR_LEVELS } from './Constants';
import Response from './Response';
import fs from 'fs';

export default class Logger {

    /**
     *@param {string} errorLog - path to error log file
     *@param {string} accessLog - path to access log file
     *@param {Object} config - the server config object
    */
    constructor(errorLog, accessLog, config) {

        this.config = config;
        this.errorHandle = null;
        this.accessHandle = null;

        this.init(errorLog, accessLog);
    }

    /**
     *@type {string}
    */
    get [Symbol.toStringTag]() {
        return 'Logger';
    }

    /**
     * initializes the log files
     *@param {string} errorLog - path to error log file
     *@param {string} accessLog - path to access log file
     *@return {this}
    */
    init(errorLog, accessLog) {
        this.errorHandle = fs.openSync(errorLog, 'a');
        this.accessHandle = fs.openSync(accessLog, 'a');
        return this;
    }

    /**
     * close the handles once the server is closed
     *@return {this}
    */
    close() {
        fs.closeSync(this.errorHandle);
        fs.closeSync(this.accessHandle);
        return this;
    }

    /**
     * runs the error logging
     *@param {number} level - the error level
     *@param {string} stack - the error stack trace
     *@return {this}
    */
    logError(level, stack) {
        const now = new Date();
        fs.writeSync(
            this.errorHandle,
            `[${now.toUTCString()}] [${level}] ${stack}\r\n`
        );
        return this;
    }

    /**
     * logs access information
     *@param {http.IncomingMessage} req - the request object
     *@param {Response} res - the response object
     *@return {this}
    */
    logAccess(req, res) {
        const protocol = req.isHttps? 'Https' : 'Http';
        const log = `[${req.startTime.toUTCString()}] "${req.method} ${req.url}`
        +
        ` ${protocol}/${req.httpVersion}" ${res.statusCode}\r\n`;

        fs.writeSync(this.accessHandle, log);
        return this;
    }

    /**
     * log request response profile
     *@param {http.IncomingMessage} req - the request object
     *@param {Response} res - the response object
     *@return {this}
    */
    profile(req, res) {
        this.logAccess(req, res);
        if (this.config.env === ENV.DEVELOPMENT && this.config.profileRequest) {
            if (res.statusCode >= 400)
                console.log('%s: %s \x1b[31m%d\x1b[0m ~%dms ~%dms\x1b[0m', req.method, req.url,
                    res.statusCode, res.startTime - req.startTime, Date.now() - res.startTime);
            else
                console.log('%s: %s \x1b[32m%d\x1b[0m ~%dms ~%dms\x1b[0m', req.method, req.url,
                    res.statusCode, res.startTime - req.startTime, Date.now() - res.startTime);
        }
        return this;
    }

    /**
     * logs fatal error to error log ile and ends the response
     *@param {Error} ex - the exception object
     *@param {Response} response - the response object
     *@param {number} [errorCode=500] - response error code to use while ending the response.
     * defaults to 500 in production mode, and 200 in development mode if not given
     *@return {this}
    */
    fatal({stack}, response, errorCode) {

        this.logError(ERROR_LEVELS.FATAL, stack);

        /* istanbul ignore else */
        if (response instanceof Response && !response.finished) {
            errorCode = this.config.env === ENV.PRODUCTION? 500 : 200;

            stack = this.config.env === ENV.PRODUCTION? undefined : stack;
            response.status(errorCode).end(stack);
        }
        return this;
    }

    /**
     * log error message to the console
     *@param {string} message - the error message
     *@return {this}
    */
    warn(message) {
        console.log('\x1b[1m\x1b[31m%s\x1b[0m', message);
        return this;
    }

    /**
     * log info message to the console
     *@param {string} message - the info message
     *@return {this}
    */
    info(message) {
        console.log('\x1b[1m\x1b[32m%s\x1b[0m', message);
        return this;
    }
}