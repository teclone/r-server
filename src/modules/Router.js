/**
 * mini Router module.
 * Handles Routing. supports parameter catching and allows data type enforcement
*/

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