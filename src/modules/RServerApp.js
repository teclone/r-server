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
     *@param {string} baseUrl - the base url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    all(baseUrl, callback, options) {
        this.server.addRoute('all', baseUrl, callback, options);
    }

    /**
     * performs route rules for all http GET method verbs
     *@param {string} baseUrl - the base url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    get(baseUrl, callback, options) {
        this.server.addRoute('get', baseUrl, callback, options);
    }

    /**
     * performs route rules for all http OPTIONS method verbs
     *@param {string} baseUrl - the base url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    options(baseUrl, callback, options) {
        this.server.addRoute('options', baseUrl, callback, options);
    }

    /**
     * performs route rules for all http POST method verbs
     *@param {string} baseUrl - the base url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    post(baseUrl, callback, options) {
        this.server.addRoute('post', baseUrl, callback, options);
    }

    /**
     * performs route rules for all http PUT method verbs
     *@param {string} baseUrl - the base url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    put(baseUrl, callback, options) {
        this.server.addRoute('put', baseUrl, callback, options);
    }

    /**
     * performs route rules for all http HEAD method verbs
     *@param {string} baseUrl - the base url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    head(baseUrl, callback, options) {
        this.server.addRoute('head', baseUrl, callback, options);
    }

    /**
     * performs route rules for all http DELETE method verbs
     *@param {string} baseUrl - the base url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    delete(baseUrl, callback, options) {
        this.server.addRoute('delete', baseUrl, callback, options);
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