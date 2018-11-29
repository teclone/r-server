/**
 *@module Request
*/

import {IncomingMessage as Request} from 'http';

Object.defineProperties(Request.prototype, {
    /**
     *@type {boolean}
     *@memberof Request#
    */
    isHttps: {
        configurable: true,
        get() {
            return this.connection.encrypted;
        }
    },

    /**
     *@type {string}
     *@memberof Request#
    */
    hostname: {
        configurable: true,
        get() {
            const host = this.headers['host'];
            return typeof host === 'string'? host.replace(/:\d+$/, '') : '';
        }
    }
});

export default Request;