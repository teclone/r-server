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
     *@param {RServerResponse} response - the response instance
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
     * runs the routes template callback function
     *@param {Function} - route callback function
    */
    run(callback) {
        let cont = false,
            next = function () {
                cont = true;
            };

        for (const middleware of this.middlewares) {
            cont = false;
            Util.runSafe(middleware, null, [this.request, this.response, next]);

            if (cont && !this.response.finished)
                continue;
            //if middleware failed to end the response, end it
            else if (!this.response.finished)
                this.response.end();

            return;
        }

        let values = [];
        for (const [, value] of this.params)
            values.push(value);

        Util.runSafe(callback, null, [this.request, this.response, ...values]);
    }

    /**
     * decomposes the template token into data type and name
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
     *@param {string} routeUrl - a route's url
     *@returns {boolean}
    */
    matchUrl(routeUrl) {
        /**create matching regular expression*/
        let tokens = routeUrl? routeUrl.split('/') : [],
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

        if (!this.validateRoute(callback, overrideMethod) || !this.validateOptions(options) ||
            !this.matchUrl(routeUrl))
            return;

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
        this.run(callback);
    }

    /**
     * performs route rules for all http method verbs
     *@param {string} routeUrl - the route url
     *@param {Function} - callback function
     *@param {Object} [options] - optional configuration options
     *@param {Array} [options.methods] - array of methods allowed
    */
    all(routeUrl, callback, options) {
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