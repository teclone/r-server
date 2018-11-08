/**
 * Routing engine module.
 * Handles Routing. supports parameter catching and allows data type enforcement
 *@module Engine
*/
import Util from './Util.js';

export default class Engine {

    /**
     *@param {string} url - the request url
     *@param {string} method - the request method
     *@param {http.IncomingMessage} request - the request instance
     *@param {Response} response - the response instance
     *@param {Array} [middlewares] - Array of middlewares
    */
    constructor(url, method, request, response, middlewares) {

        this.resolved = false;
        this.request = request;
        this.response = response;
        this.middlewares = Util.isArray(middlewares)? middlewares : [];

        this.url = url.toLowerCase().replace(/[#?].*$/, '').replace(/^\/+/, '').replace(/\/+$/, '');
        this.method = method.toUpperCase();

        this.params = []; //create a simple [paramName, paramValue] tuple
    }

    /**
     * return class identifier
     *@private
     *@type {string}
    */
    get [Symbol.toStringTag]() {
        return 'Engine';
    }

    /**
     * sets or overrides the existing middlewares
     *@private
     *@param {Array} middlewares - array of middlewares
    */
    use(middlewares) {
        if (Util.isArray(middlewares))
            this.middlewares = middlewares;
    }

    /**
     * runs the routes template callback function
     *@private
     *@param {Function} callback - route callback function
    */
    async run(callback) {
        let cont = false;

        const next = function () {
            cont = true;
        };

        const params = [];
        this.params.forEach(([, param]) => {
            params.push(param);
        });

        for (const middleware of this.middlewares) {
            cont = false;

            await middleware(this.request, this.response, next, ...params);
            //if middleware says continue and response.end is not called, then continue
            if (cont && !this.response.finished)
                continue;

            //else if the response is not ended, end it
            if (!this.response.finished)
                this.response.end();

            return;
        }

        await callback(this.request, this.response, ...params);
    }

    /**
     * decomposes the template token into data type and name
     *@private
     *@param {string} routeToken - the route template token to be decomposed
     *@param {string} pathToken - the corresponding path token for this route template token
     *@returns {Object} returns object containing dataType and name
     * keys
    */
    deComposeRouteToken(routeToken, pathToken) {
        let storeAsParam = false;

        if (/\{([-\w:]+)\}/.exec(routeToken)) {
            storeAsParam = true;
            routeToken = RegExp.$1;
        }

        let [dataType, name] = routeToken.indexOf(':') > -1? routeToken.split(':') : ['', routeToken],
            value = pathToken;

        switch(dataType.toLowerCase()) {
            case 'int':
            case 'integer':
                value = Number.parseInt(pathToken);
                break;
            case 'float':
            case 'double':
            case 'number':
                value = Number.parseFloat(pathToken);
                break;
            case 'bool':
            case 'boolean':
                value = ['0', 'false', ''].includes(pathToken.toString().toLowerCase())?
                    false : true;
                break;
        }

        if (Number.isNaN(value))
            value = 0;

        if (storeAsParam)
            this.params.push([name, value]);

        return {name, value, dataType};
    }

    /**
     * analyses base url and creates a regex for it. then matches and returns the result
     *@private
     *@param {string} routeUrl - a route's url
     *@returns {boolean}
    */
    matchUrl(routeUrl) {
        /*create matching regular expression*/
        let tokens = routeUrl? routeUrl.replace(/^\/+/, '').replace(/\/+$/, '').split('/') : [],
            pattern = tokens.map(function(token) {
                let pattern = '';
                if (/^\{[\w:-]+\}$/.exec(token))
                    pattern = '[^/]+';

                else if (/^\{[\w:-]+\}\?$/.exec(token))
                    pattern = '([^/]+)?';

                else if (token === '*')
                    pattern = '.*';

                else
                    pattern = token.replace(/\\-/g, '-').replace(/-/g, '\\-');

                return pattern;
            }).join('/');

        let regex = new RegExp('^' + pattern + '$', 'i'); //regex is case insensitive
        return regex.test(this.url);
    }

    /**
     *@private
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
     *@private
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
     *@private
     *@param {string} routeUrl - the route's url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
     *@param {Array} [options.methods] - array of methods allowed
     *@param {string} [overrideMethod] - a string indicating the only method allowed for the route
     *@returns {Promise} - the promise resolves to a boolean value
    */
    process(routeUrl, callback, options, overrideMethod) {
        return new Promise((resolve) => {
            if (this.resolved)
                return resolve(true);

            this.params = []; //reset the params tuple
            routeUrl = routeUrl.toLowerCase().replace(/^\/+/, '').replace(/\/+$/, '');

            if (!this.validateRoute(callback, overrideMethod) || !this.validateOptions(options) || !this.matchUrl(routeUrl))
                return resolve(false);

            let pathTokens = this.url !== ''? this.url.split('/') : [],
                routeTokens = routeUrl !== ''? routeUrl.split('/') : [];

            let i = -1;
            while (++i < routeTokens.length) {
                let pathToken = pathTokens[i],
                    routeToken = routeTokens[i];

                if (routeToken === '*') {
                    //final route token. add remaining url and pass it to the callback
                    this.params.push(['asterisk', pathTokens.slice(i).join('/')]);
                    break;
                }
                this.deComposeRouteToken(routeToken, pathToken);
            }

            this.resolved = true;

            this.run(callback).then(() => {
                resolve(true);
            });
        });
    }

    /**
     * performs route rules for all http method verbs
     *@param {string} routeUrl - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
     *@param {Array} [options.methods] - array of methods allowed
     *@returns {Promise}
    */
    all(routeUrl, callback, options) {
        return this.process(routeUrl, callback, options, '');
    }

    /**
     * performs route rules for only GET request method verb
     *@param {string} routeUrl - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
     *@returns {Promise}
    */
    get(routeUrl, callback, options) {
        return this.process(routeUrl, callback, options, 'GET');
    }

    /**
     * performs route rules for only HEAD request method verb
     *@param {string} routeUrl - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
     *@returns {Promise}
    */
    head(routeUrl, callback, options) {
        return this.process(routeUrl, callback, options, 'HEAD');
    }

    /**
     * performs route rules for only OPTIONS request method verb
     *@param {string} routeUrl - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
     *@returns {Promise}
    */
    options(routeUrl, callback, options) {
        return this.process(routeUrl, callback, options, 'OPTIONS');
    }

    /**
     * performs route rules for only DELETE method verb
     *@param {string} routeUrl - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
     *@returns {Promise}
    */
    delete(routeUrl, callback, options) {
        return this.process(routeUrl, callback, options, 'DELETE');
    }

    /**
     * performs route rules for only POST request method verb
     *@param {string} routeUrl - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
     *@returns {Promise}
    */
    post(routeUrl, callback, options) {
        return this.process(routeUrl, callback, options, 'POST');
    }

    /**
     * performs route rules for only PUT request method verb
     *@param {string} routeUrl - the route url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
     *@returns {Promise}
    */
    put(routeUrl, callback, options) {
        return this.process(routeUrl, callback, options, 'PUT');
    }
}