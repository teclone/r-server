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
     *@param {Request} request - the request instance
     *@param {Response} response - the response instance
     *@param {Logger} logger - the logger instance
    */
    constructor(url, method, request, response, logger) {

        this.resolved = false;
        this.request = request;
        this.response = response;
        this.middlewares = [];
        this.logger = logger;

        this.url = this.resolveUrl(url);
        this.method = method.toUpperCase();
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
     * cleans up the url, and makes it ready for matching and processing
     *@param {string} url - the url
     *@returns {string}
    */
    resolveUrl(url) {
        return url.toLowerCase().replace(/[#?].*$/, '')
            .replace(/^\/+/, '').replace(/\/+$/, '');
    }

    /**
     * stores the route parameter into the params array if the routeToken is a capturing
     * token. It also decomposes the token into data type and name, applying appropriate cast
     * logic to the captured value.
     *@private
     *@param {string} routeToken - the route token
     *@param {string} urlToken - the corresponding url token for the route token
     *@param {Array} [params=[]] - array to store captured parameter
     *@returns {Array}
    */
    captureRouteParameter(routeToken, urlToken, params) {
        params = Util.isArray(params)? params : [];

        //if route token is not a capturing one. return the params immediately
        if (!/^\{([-\w:]+)\}\??$/.test(routeToken))
            return params;

        routeToken = RegExp.$1;
        const [type, name] = routeToken.indexOf(':') > -1?
            routeToken.split(':') : ['string', routeToken];

        let value = urlToken;
        switch(type.toLowerCase()) {
            case 'int':
                value = Number.parseInt(urlToken);
                break;
            case 'float':
            case 'number':
            case 'numeric':
                value = Number.parseFloat(urlToken);
                break;
            case 'bool':
            case 'boolean':
                urlToken = urlToken.toString().toLowerCase();
                value = ['0', 'false', '', 'null', 'nil', 'undefined', 'no', 'none'].includes(urlToken)?
                    false : true;
                break;
        }

        if (Number.isNaN(value))
            value = 0;

        params.push([name, value]);
        return params;
    }

    /**
     * analyses base url and creates a regex for it. then matches and returns the result
     *@private
     *@param {string} routeUrl - a route's url
     *@returns {boolean}
    */
    matchUrl(routeUrl) {
        /*create matching regular expression*/
        const tokens = routeUrl? routeUrl.replace(/^\/+/, '').replace(/\/+$/, '').split('/') : [],
            pattern = tokens.map((token) => {
                let pattern = token;
                if (/^\{[\w:-]+\}$/.test(token)) {
                    pattern = '[^/]+';
                }

                else if (/^\{[\w:-]+\}\?$/.exec(token)) {
                    pattern = '([^/]+)?';
                    //add trailing / to the request url, to help match this pattern
                }

                else if (token === '*') {
                    pattern = '.*';
                }

                return pattern;
            }).join('/');

        const regex = new RegExp('^' + pattern + '$', 'i'); //regex is case insensitive
        return regex.test(this.url) || regex.test(this.url + '/');
    }

    /**
     * validate that the options are ok
     *@private
     *@param {routeOptions|middlewareOptions} options - optional configuration options
     *@returns {boolean}
    */
    validateOptions(overrideMethod, options) {
        if (overrideMethod && this.method !== overrideMethod.toUpperCase())
            return false;

        let result = true;

        //validate methods
        const methods = Util.value(['methods', 'method'], options);
        if (methods !== undefined) {
            result = Util.makeArray(methods).some(method => {
                return typeof method === 'string' && method.toUpperCase() === this.method;
            });
        }
        return result;
    }

    /**
     * runs the whole processes
     *@private
     *@param {string} routeUrl - the route's url
     *@param {routeOptions} [options] - optional configuration options
     *@param {string} [overrideMethod] - a string indicating the only method allowed for the route
     *@returns {boolean|Array}
    */
    runValidations(routeUrl, options, overrideMethod) {
        if (!this.validateOptions(overrideMethod, options) || !this.matchUrl(routeUrl))
            return false;

        routeUrl = this.resolveUrl(routeUrl);

        //split the tokens.
        let urlTokens = this.url !== ''? this.url.split('/') : [],
            routeTokens = routeUrl !== ''? routeUrl.split('/') : [];

        //if the route token is greater than the url tokens, then fill it with empty strings
        const difference = routeTokens.length - urlTokens.length;
        if (difference > 0)
            urlTokens = urlTokens.concat(new Array(difference).fill(''));

        const params = [],
            len = routeTokens.length;

        let i = -1;
        while (++i < len) {
            let urlToken = urlTokens[i],
                routeToken = routeTokens[i];

            if (routeToken === '*') {
                //final route token. add remaining url and name it as asterisks
                params.push(['asterisks', urlTokens.slice(i).join('/')]);
                break;
            }
            this.captureRouteParameter(routeToken, urlToken, params);
        }

        return params.map(([, param]) => {
            return param;
        });
    }

    /**
     * asynchronously runs the middleware
    */
    async runMiddlewares(middlewares, middlewareParams) {
        let cont = true,
            next = function() {
                cont = true;
            };

        for (const middleware of middlewares) {
            cont = false;
            await middleware(this.request, this.response, next, ...middlewareParams);
            if (!cont) {
                if (!this.response.finished)
                    this.response.end();

                break;
            }
        }
        return cont;
    }

    /**
     * asynchronously call the runMiddlewares method on each middleware that applies to the
     * route, and running the route callback if all the executed middlewares executes the next
     * callback
     *@private
     *@param {Function} callback - route callback function
     *@param {Array} params - array of parameter to apply to the route callback
     *@param {routeOptions} [options] - optional configuration options
    */
    async run(callback, params, options) {
        //run middlewares
        for (const [url, middlewares, options] of this.middlewares) {

            let middlewareParams = this.runValidations(url, options || {});
            if (middlewareParams === false || await this.runMiddlewares(middlewares, middlewareParams))
                continue;
            else
                return;
        }

        //run route localized middlewares.
        const middlewares = Util.makeArray(
            Util.value(['middlewares', 'middleware'], options)
        ).filter(middleware => Util.isCallable(middleware));

        if (await this.runMiddlewares(middlewares, params))
            await callback(this.request, this.response, ...params);
    }

    /**
     * processes the route
     *@private
     *@param {string} routeUrl - the route's url
     *@param {Function} callback - callback function
     *@param {routeOptions} [options] - optional configuration options
     *@param {string} [overrideMethod] - a string indicating the only method allowed for the route
     *@returns {Promise} - the promise resolves to a boolean value
    */
    async process(routeUrl, callback, options, overrideMethod) {
        options = Util.isPlainObject(options)? options : {};

        // if it has been resolved, return
        if (this.resolved)
            return true;

        routeUrl = this.resolveUrl(routeUrl);
        const params = this.runValidations(routeUrl, options, overrideMethod);

        if (!params)
            return false;

        this.resolved = true;

        try {
            await this.run(callback, params, options);
            // if (!this.response.finished)
            //     this.response.end();
        }
        catch(ex) {
            this.logger.fatal(ex, this.response);
        }
        return true;
    }

    /**
     * performs route rules for all http method verbs
     *@param {string} routeUrl - the route url
     *@param {Function} callback - callback function
     *@param {routeOptions} [options] - optional configuration options
     *@returns {Promise}
    */
    all(routeUrl, callback, options) {
        return this.process(routeUrl, callback, options, '');
    }

    /**
     * performs route rules for only GET request method verb
     *@param {string} routeUrl - the route url
     *@param {Function} callback - callback function
     *@param {routeOptions} [options] - optional configuration options
     *@returns {Promise}
    */
    get(routeUrl, callback, options) {
        return this.process(routeUrl, callback, options, 'GET');
    }

    /**
     * performs route rules for only HEAD request method verb
     *@param {string} routeUrl - the route url
     *@param {Function} callback - callback function
     *@param {routeOptions} [options] - optional configuration options
     *@returns {Promise}
    */
    head(routeUrl, callback, options) {
        return this.process(routeUrl, callback, options, 'HEAD');
    }

    /**
     * performs route rules for only OPTIONS request method verb
     *@param {string} routeUrl - the route url
     *@param {Function} callback - callback function
     *@param {routeOptions} [options] - optional configuration options
     *@returns {Promise}
    */
    options(routeUrl, callback, options) {
        return this.process(routeUrl, callback, options, 'OPTIONS');
    }

    /**
     * performs route rules for only DELETE method verb
     *@param {string} routeUrl - the route url
     *@param {Function} callback - callback function
     *@param {routeOptions} [options] - optional configuration options
     *@returns {Promise}
    */
    delete(routeUrl, callback, options) {
        return this.process(routeUrl, callback, options, 'DELETE');
    }

    /**
     * performs route rules for only POST request method verb
     *@param {string} routeUrl - the route url
     *@param {Function} callback - callback function
     *@param {routeOptions} [options] - optional configuration options
     *@returns {Promise}
    */
    post(routeUrl, callback, options) {
        return this.process(routeUrl, callback, options, 'POST');
    }

    /**
     * performs route rules for only PUT request method verb
     *@param {string} routeUrl - the route url
     *@param {Function} callback - callback function
     *@param {routeOptions} [options] - optional configuration options
     *@returns {Promise}
    */
    put(routeUrl, callback, options) {
        return this.process(routeUrl, callback, options, 'PUT');
    }

    /**
     * sets or overrides the existing middlewares
     *@private
     *@param {Array} middlewares - array of middlewares
     *@returns {this}
    */
    use(middlewares) {
        if (Util.isArray(middlewares))
            this.middlewares = middlewares;

        return this;
    }
}