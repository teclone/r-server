import RServer from './RServer.js';
import RouteWrapper from './RouteWrapper.js';

export default class RServerApp {

    /**
     *@param {string} [configPath] - user defined configuration file location.
    */
    constructor(configPath) {
        this.server = new RServer(configPath);
    }

    /**
     * return instance identity
    */
    get [Symbol.toStringTag]() {
        return 'RserverApp';
    }

    /**
     * performs route rules for http OPTIONS method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    options(url, callback, options) {
        this.server.router.options(url, callback, options);
    }

    /**
     * performs route rules for http HEAD method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    head(url, callback, options) {
        this.server.router.head(url, callback, options);
    }

    /**
     * performs route rules for http GET method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    get(url, callback, options) {
        this.server.router.get(url, callback, options);
    }

    /**
     * performs route rules for http POST method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    post(url, callback, options) {
        this.server.router.post(url, callback, options);
    }

    /**
     * performs route rules for http PUT method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    put(url, callback, options) {
        this.server.router.put(url, callback, options);
    }

    /**
     * performs route rules for http DELETE method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    delete(url, callback, options) {
        this.server.router.delete(url, callback, options);
    }

    /**
     * performs route rules for all http method verbs
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    all(url, callback, options) {
        this.server.router.all(url, callback, options);
    }

    /**
     * returns a route wrapper for the given url
     *@returns {RouteWrapper}
    */
    route(url) {
        return new RouteWrapper(this.server.router, url);
    }

    /**
     * use a middleware
     *@param {Function} middleware - the middleware function
    */
    use(middleware) {
        this.server.router.use(middleware);
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
     * returns boolean value indicating if the app is listening for request
    */
    get listening() {
        return this.server.listening;
    }

    /**
     * returns the bound address that the app is listening on
     *@returns {Object}
    */
    address() {
        return this.server.address();
    }
}