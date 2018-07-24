import RServer from './RServer.js';

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
     * performs route rules for all http method verbs
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    all(url, callback, options) {
        this.server.addRoute('all', url, callback, options);
    }

    /**
     * performs route rules for http GET method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    get(url, callback, options) {
        this.server.addRoute('get', url, callback, options);
    }

    /**
     * performs route rules for http OPTIONS method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    options(url, callback, options) {
        this.server.addRoute('options', url, callback, options);
    }

    /**
     * performs route rules for http POST method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    post(url, callback, options) {
        this.server.addRoute('post', url, callback, options);
    }

    /**
     * performs route rules for http PUT method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    put(url, callback, options) {
        this.server.addRoute('put', url, callback, options);
    }

    /**
     * performs route rules for http HEAD method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    head(url, callback, options) {
        this.server.addRoute('head', url, callback, options);
    }

    /**
     * performs route rules for http DELETE method verb
     *@param {string} url - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    delete(url, callback, options) {
        this.server.addRoute('delete', url, callback, options);
    }

    /**
     * use a middleware
     *@param {Function} middleware - the middleware function
    */
    use(middleware) {
        this.server.use(middleware);
    }

    /**
     * starts the serve to listen on a given port
     *@param {number} [port=8131] - the port to listen on. defaults to port 8131
    */
    listen(port) {
        this.server.listen(port);
    }

    /**
     * closes the connection
    */
    close() {
        this.server.close();
    }
}