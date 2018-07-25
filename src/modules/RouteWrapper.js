export default class RouteWrapper {

    /**
     *@param {Router} router - the router instance
     *@param {string} url - the route url to wrap around
    */
    constructor(router, url) {
        this.router = router;
        this.url = url;
    }

    /**
     * return object identity
    */
    get [Symbol.toStringTag]() {
        return 'RouteWrapper';
    }

    /**
     * performs route rules for http OPTIONS method verb
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
     *@returns {RouteWrapper}
    */
    options(callback, options) {
        this.router.options(this.url, callback, options);
        return this;
    }

    /**
     * performs route rules for http HEAD method verb
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
     *@returns {RouteWrapper}
    */
    head(callback, options) {
        this.router.head(this.url, callback, options);
        return this;
    }

    /**
     * performs route rules for http GET method verb
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
     *@returns {RouteWrapper}
    */
    get(callback, options) {
        this.router.get(this.url, callback, options);
        return this;
    }

    /**
     * performs route rules for http POST method verb
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
     *@returns {RouteWrapper}
    */
    post(callback, options) {
        this.router.post(this.url, callback, options);
        return this;
    }

    /**
     * performs route rules for http PUT method verb
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
     *@returns {RouteWrapper}
    */
    put(callback, options) {
        this.router.put(this.url, callback, options);
        return this;
    }

    /**
     * performs route rules for http DELETE method verb
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
     *@returns {RouteWrapper}
    */
    delete(callback, options) {
        this.router.delete(this.url, callback, options);
        return this;
    }

    /**
     * performs route rules for all http method verbs
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
     *@returns {RouteWrapper}
    */
    all(callback, options) {
        this.router.all(this.url, callback, options);
        return this;
    }
}