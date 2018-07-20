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
}