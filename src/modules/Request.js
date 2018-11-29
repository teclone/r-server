/**
 *@module Request
*/

import Util from './Util';
import {IncomingMessage as Request} from 'http';

const proto = Request.prototype;

/**
 *@type {boolean}
 *@name isHttps
 *@memberof Request#
*/
Util.defineGetter(proto, 'isHttps', function() {
    return this.connection.encrypted;
});

/**
 *@type {string}
 *@name hostname
 *@memberof Request#
*/
Util.defineGetter(proto, 'hostname', function() {
    const host = this.headers['host'];
    return typeof host === 'string'? host.replace(/:\d+$/, '') : '';
});

export default Request;