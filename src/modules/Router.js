/**
 *@module Router
*/
import Util from './Util.js';
import Wrapper from './Wrapper.js';

/**
 *@typedef {Object} routeOptions
 *@param {Function[]} [methods] - array of http methods allowed
 *@param {Function|Function[]} [middleware] - a middleware funtion or array of middlewares to
 * apply specifically on the route
*/

/**
 *@typedef {Object} middlewareOptions
*/
export default class Router {

    /**
     * creates router
     *@param {boolean} [inheritMiddlewares=true] - boolean value indicating if parent
     * middlewares should be inherited. defaults to true
    */
    constructor(inheritMiddlewares) {
        this.routes = {
            options: [],
            head: [],
            get: [],
            post: [],
            put:[],
            delete: [],
            all: []
        };
        this.middlewares = []; //middlewares
        this.inheritMiddlewares = inheritMiddlewares === false? false : true;
    }

    /**
     * return object identity
     *@type {string}
    */
    get [Symbol.toStringTag]() {
        return 'Router';
    }

    /**
     * performs route rules for http OPTIONS method verb
     *@param {string} method - the route method/api in question
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {routeOptions} [options] - optional configuration options
    */
    set(method, url, callback, options) {
        this.routes[method].push([url, callback, Util.makeObject(options)]);
    }

    /**
     * performs route rules for http OPTIONS method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {routeOptions} [options] - optional configuration options
    */
    options(url, callback, options) {
        this.set('options', url, callback, options);
    }

    /**
     * performs route rules for http HEAD method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {routeOptions} [options] - optional configuration options
    */
    head(url, callback, options) {
        this.set('head', url, callback, options);
    }

    /**
     * performs route rules for http GET method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {routeOptions} [options] - optional configuration options
    */
    get(url, callback, options) {
        this.set('get', url, callback, options);
    }

    /**
     * performs route rules for http POST method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {routeOptions} [options] - optional configuration options
    */
    post(url, callback, options) {
        this.set('post', url, callback, options);
    }

    /**
     * performs route rules for http PUT method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {routeOptions} [options] - optional configuration options
    */
    put(url, callback, options) {
        this.set('put', url, callback, options);
    }

    /**
     * performs route rules for http DELETE method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {routeOptions} [options] - optional configuration options
    */
    delete(url, callback, options) {
        this.set('delete', url, callback, options);
    }

    /**
     * performs route rules for all http method verbs
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {routeOptions} [options] - optional configuration options
    */
    all(url, callback, options) {
        this.set('all', url, callback, options);
    }

    /**
     * returns a route wrapper for the given url
     *@returns {Wrapper}
    */
    route(url) {
        return new Wrapper(this, url);
    }

    /**
     * use a middleware
     *@param {string} url - the url to apply middleware to, use null to apply globally on all
     * urls
     *@param {Function} middleware - the middleware function
     *@param {middlewareOptions} options - middleware optional configuration options
    */
    use(url, middleware, options) {
        if (Util.isCallable(middleware)) {

            if (typeof url !== 'string')
                url = '/'; //this middleware runs on the root url or the mount root url

            this.middlewares.push([url, middleware, Util.makeObject(options)]);
        }
    }
}