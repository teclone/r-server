import Util from './Util.js';
import RouteWrapper from './RouteWrapper.js';

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
        this.middlewares = [];
        this.inheritMiddlewares = inheritMiddlewares === false? false : true;
    }

    /**
     * return object identity
    */
    get [Symbol.toStringTag]() {
        return 'Router';
    }

    /**
     * performs route rules for http OPTIONS method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    options(url, callback, options) {
        this.routes.options.push([url, callback, options]);
    }

    /**
     * performs route rules for http HEAD method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    head(url, callback, options) {
        this.routes.head.push([url, callback, options]);
    }

    /**
     * performs route rules for http GET method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    get(url, callback, options) {
        this.routes.get.push([url, callback, options]);
    }

    /**
     * performs route rules for http POST method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    post(url, callback, options) {
        this.routes.post.push([url, callback, options]);
    }

    /**
     * performs route rules for http PUT method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    put(url, callback, options) {
        this.routes.put.push([url, callback, options]);
    }

    /**
     * performs route rules for http DELETE method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    delete(url, callback, options) {
        this.routes.delete.push([url, callback, options]);
    }

    /**
     * performs route rules for all http method verbs
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    all(url, callback, options) {
        this.routes.all.push([url, callback, options]);
    }

    /**
     * returns a route wrapper for the given url
     *@returns {RouteWrapper}
    */
    route(url) {
        return new RouteWrapper(this, url);
    }

    /**
     * use a middleware
     *@param {Function} middleware - the middleware function
    */
    use(middleware) {
        if (Util.isCallable(middleware))
            this.middlewares.push(middleware);
    }
}