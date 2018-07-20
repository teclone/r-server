/**
 * mini Router module.
 * Handles Routing. supports parameter catching and allows data type enforcement
*/
import Util from './Util.js';

export default class Router {

    /**
     *@param {string} url - the request url
     *@param {string} method - the request method
     *@param {http.IncomingMessage} request - the request instance
     *@param {http.ServerResponse} response - the response instance
     *@param {Array} middlewares - Array of middlewares
     *@returns {Router}
    */
    constructor(url, method, request, response, middlewares) {

        this.resolved = false;
        this.request = request;
        this.response = response;
        this.middlewares = middlewares;

        this.url = url.toLowerCase().replace(/[#?].*$/, '').replace(/^\/+/, '').replace(/\/+$/, '');
        this.method = method.toUpperCase();

        this.params = []; //create a simple [paramName, paramValue] tuple
    }

    /**
     * return class identifier
    */
    get [Symbol.toStringTag]() {
        return 'Router';
    }

    /**
     *@param {Object} [options] - optional configuration options
     *@param {Array} [options.methods] - array of methods allowed
     *@returns {boolean}
    */
    validateOptions(options) {
        options = Util.isPlainObject(options)? options : {};
        let result = true;

        //validate request method. the request method should be among the options.methods item.
        if (Util.isArray(options.methods)) {
            let method = this.method;
            result = options.methods.some((testMethod) => {
                return typeof testMethod === 'string' && testMethod.toUpperCase() === method;
            });
        }
        return result;
    }

    /**
     *@description - checks if the request method is ok and that callback is a function
     *@param {Function} callback - the callback function
     *@param {string} [overrideMethod] - method to use
     *@returns {boolean}
    */
    validateRoute(callback, overrideMethod) {
        return Util.isCallable(callback) && (!overrideMethod ||
            this.method === overrideMethod.toUpperCase());
    }

    /**
     * processes the route
     *@param {string} routeUrl - the route's url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
     *@param {Array} [options.methods] - array of methods allowed
     *@param {string} [overrideMethod] - a string indicating the only method allowed for the route
     *@returns {boolean}
    */
    process(routeUrl, callback, options, overrideMethod) {
        if (this.resolved)
            return;

        this.params = []; //reset the params tuple
        routeUrl = routeUrl.toLowerCase().replace(/^\/+/, '').replace(/\/+$/, '');

        if (!this.validateRoute(callback, overrideMethod) || !this.validateOptions(options))
            return;
    }

    /**
     * performs route rules for all http method verbs
     *@param {string} routeUrl - the route url
     *@param {Function} - callback function
     *@param {Object} [options] - optional configuration options
     *@param {Array} [options.methods] - array of methods allowed
    */
    route(routeUrl, callback, options) {
        this.process(routeUrl, callback, options, '');
    }

    /**
     * performs route rules for only GET request method verb
     *@param {string} routeUrl - the route url
     *@param {Function} - callback function
     *@param {Object} [options] - optional configuration options
    */
    get(routeUrl, callback, options) {
        this.process(routeUrl, callback, options, 'GET');
    }

    /**
     * performs route rules for only HEAD request method verb
     *@param {string} routeUrl - the route url
     *@param {Function} - callback function
     *@param {Object} [options] - optional configuration options
    */
    head(routeUrl, callback, options) {
        this.process(routeUrl, callback, options, 'HEAD');
    }

    /**
     * performs route rules for only OPTIONS request method verb
     *@param {string} routeUrl - the route url
     *@param {Function} - callback function
     *@param {Object} [options] - optional configuration options
    */
    options(routeUrl, callback, options) {
        this.process(routeUrl, callback, options, 'OPTIONS');
    }

    /**
     * performs route rules for only DELETE method verb
     *@param {string} routeUrl - the route url
     *@param {Function} - callback function
     *@param {Object} [options] - optional configuration options
    */
    delete(routeUrl, callback, options) {
        this.process(routeUrl, callback, options, 'DELETE');
    }

    /**
     * performs route rules for only POST request method verb
     *@param {string} routeUrl - the route url
     *@param {Function} - callback function
     *@param {Object} [options] - optional configuration options
    */
    post(routeUrl, callback, options) {
        this.process(routeUrl, callback, options, 'POST');
    }

    /**
     * performs route rules for only PUT request method verb
     *@param {string} routeUrl - the route url
     *@param {Function} - callback function
     *@param {Object} [options] - optional configuration options
    */
    put(routeUrl, callback, options) {
        this.process(routeUrl, callback, options, 'PUT');
    }
}