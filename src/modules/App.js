/**
 *@module App
*/

/**
 *@typedef {Function|Function[]} middlewares - a middleware or array of middlewares
*/

/**
 *@typedef {string|string]} methods - http method or array of http methods
*/

/**
 *@typedef {Object} routeOptions
 *@param {string} [method] - http method that route applies to
 *@param {string[]} [methods] - array of http methods that route applies to
 *@param {Function} [middleware] - middleware that should be applied specifically on the route
 *@param {Function[]} [middlewares] - array of middlewares that should be applied specifically on
 * the route
*/

/**
 *@typedef {Object} middlewareOptions
 *@param {string} [method] - http method that middleware applies to
 *@param {string[]} [methods] - array of http methods that middleware applies to
*/

import Server from './Server.js';
import Wrapper from './Wrapper.js';

export default class App {

    /**
     *@param {string|Object} [config] - an optional config object or a string relative path to a
     * user defined config file defaults to ".server.config.json"
    */
    constructor(config) {
        this.server = new Server(config);
    }

    /**
     * return instance identity
     *@private
     *@type {string}
    */
    get [Symbol.toStringTag]() {
        return 'App';
    }

    /**
     * performs route rules for http OPTIONS method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {routeOptions|middlewares} [options] - optional configuration options
    */
    options(url, callback, options) {
        this.server.router.options(url, callback, options);
    }

    /**
     * performs route rules for http HEAD method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {routeOptions|middlewares} [options] - optional configuration options
    */
    head(url, callback, options) {
        this.server.router.head(url, callback, options);
    }

    /**
     * performs route rules for http GET method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {routeOptions|middlewares} [options] - optional configuration options
    */
    get(url, callback, options) {
        this.server.router.get(url, callback, options);
    }

    /**
     * performs route rules for http POST method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {routeOptions|middlewares} [options] - optional configuration options
    */
    post(url, callback, options) {
        this.server.router.post(url, callback, options);
    }

    /**
     * performs route rules for http PUT method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {routeOptions|middlewares} [options] - optional configuration options
    */
    put(url, callback, options) {
        this.server.router.put(url, callback, options);
    }

    /**
     * performs route rules for http DELETE method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {routeOptions|middlewares} [options] - optional configuration options
    */
    delete(url, callback, options) {
        this.server.router.delete(url, callback, options);
    }

    /**
     * performs route rules for all http method verbs
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {routeOptions|middlewares} [options] - optional configuration options
    */
    all(url, callback, options) {
        this.server.router.all(url, callback, options);
    }

    /**
     * returns a route wrapper for the given url
     *@returns {Wrapper}
    */
    route(url) {
        return new Wrapper(this.server.router, url);
    }

    /**
     * use a middleware
     *@param {string} url - the url to apply middleware to, use null to apply globally on all
     * urls
     *@param {Function} middleware - the middleware function
     *@param {middlewareOptions|methods} [options] - middleware options or http methods that
     * middleware applies to
    */
    use(url, middleware, options) {
        this.server.router.use(url, middleware, options);
    }

    /**
     * mounts the router (mini-app) on the main app
     *@param {string} baseUrl - the base url
     *@param {Router} router - the router (mini-app)
    */
    mount(baseUrl, router) {
        this.server.mount(baseUrl, router);
    }

    /**
     * starts the serve to listen on a given port
     *@param {number} [port=4000] - the port to listen on. defaults to port 4000
     *@param {Function} [callback] - a callback function to execute once the server starts
     * listening
    */
    listen(port, callback) {
        this.server.listen(port, callback);
    }

    /**
     * closes the connection
     *@param {Function} [callback] - a callback function to execute once the server gets closed
    */
    close(callback) {
        this.server.close(callback);
    }

    /**
     *@type {boolean}
     * boolean value indicating if the http server is listening for request
    */
    get listening() {
        return this.server.listening;
    }

    /**
     *@type {boolean}
     * boolean value indicating if the https server is listening for request
    */
    get httpsListening() {
        return this.server.httpsListening;
    }

    /**
     * returns the bound address that the app's http server is listening on
     *@returns {Object}
    */
    address() {
        return this.server.address();
    }

    /**
     * returns the bound address that the app's https server is listening on
     *@returns {Object}
    */
    httpsAddress() {
        return this.server.httpsAddress();
    }
}