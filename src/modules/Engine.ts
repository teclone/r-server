import {
    Url, MiddlewareInstance, RouteInstance, ResolvedCallbackOptions, Method,
    RouteParameter, ResolvedMiddlewareOptions, Middleware, Next, Parameter
} from '../@types';
import Response from './Response';
import Request from './Request';
import Logger from './Logger';
import { isObject, stripSlashes } from '@forensic-js/utils';
import {replace} from '@forensic-js/regex';
import { DOUBLE_TOKEN_REGEX, SINGLE_TOKEN_REGEX } from './Constants';

export default class Engine {

    private resolved: boolean = false;

    private request: Request;

    private response: Response;

    private middlewares: MiddlewareInstance[];

    private method: string;

    private url: Url;

    private logger: Logger;

    constructor(url: Url, method: string, request: Request, response: Response, logger: Logger) {

        this.resolved = false;
        this.request = request;
        this.response = response;
        this.middlewares = [];
        this.logger = logger;

        this.url = stripSlashes(url.replace(/[#?].*$/, ''));
        this.method = method.toLowerCase();
    }

    /**
     * returns the parameter value
     */
    private getParameterValue(parameter: RouteParameter) {
        return parameter.value;
    }

    /**
     * capture route parameters
     */
    private captureParameter(routeToken: string, urlToken: string,
        parameters: RouteParameter[]): RouteParameter[] {

        const processToken = (token: string, value: string) => {
            const [dataType, name] = token.indexOf(':') > -1? token.split(':') : ['string', token];
            let result: string | number | boolean = value;

            switch(dataType.toLowerCase()) {
                case 'int':
                    result = Number.parseInt(value);
                    break;

                case 'float':
                case 'number':
                case 'numeric':
                    result = Number.parseFloat(value);
                    break;

                case 'bool':
                case 'boolean':
                    result = result.toLowerCase();
                    result = !['0', 'false', '', 'null', 'nil', 'undefined', 'no', 'none'].includes(value);
                    break;
            }
            if(Number.isNaN(result as number)) {
                result = 0;
            }
            return {
                name,
                dataType,
                value: result
            };
        };

        if (DOUBLE_TOKEN_REGEX.test(routeToken)) {
            const token1 = RegExp.$1;
            const separator = RegExp.$2;
            const token2 = RegExp.$3;

            const values = urlToken? urlToken.split(separator) : ['', ''];
            parameters.push(processToken(token1, values[0]));
            parameters.push(processToken(token2, values[1]));
        }
        else if (SINGLE_TOKEN_REGEX.test(routeToken)) {
            const token = RegExp.$1;
            parameters.push(processToken(token, urlToken));
        }
        return parameters;
    }

    /**
     * runs through the route, and captures parameters
     */
    private captureParameters(routeUrl): RouteParameter[]  {

        const parameters: RouteParameter[] = [];

        //split the tokens.
        const routeTokens = routeUrl !== ''? routeUrl.split('/') : [];
        const urlTokens = this.url !== ''? this.url.split('/') : [];

        // if the route tokens is greater than the url tokens, fill with empty string
        const len = routeTokens.length;
        const difference = len - urlTokens.length;

        if (difference > 0) {
            Array(difference).fill('').forEach(item => {
                urlTokens.push(item);
            });
        }

        let i = -1;
        while (++i < len) {

            const urlToken = urlTokens[i];
            const routeToken = routeTokens[i];

            // if it is final route token, store remaining url
            if (routeToken === '*' && (i + 1) === len) {
                parameters.push({
                    name: '*', dataType: 'string', value: urlTokens.slice(i).join('/')
                });
                break;
            }
            else {
                this.captureParameter(routeToken, urlToken, parameters);
            }
        }
        return parameters;
    }

    /**
     * check if route url matches request url
     */
    private matchUrl(routeUrl: Url): boolean {
        /* create matching regular expression */
        const tokens = routeUrl? routeUrl.split('/') : [];
        const max = tokens.length - 1;

        const pattern = tokens.map((token, index) => {

            if (index === max && /[^)]\?$/.test(token)) {
                token = `(${token.substring(0, token.length - 1)})?`;
            }
            if (token === '*') {
                return '.*';
            }
            else {
                token = replace(DOUBLE_TOKEN_REGEX, '[^/]+$:2[^/]+', token);
                token = replace(SINGLE_TOKEN_REGEX, '[^/]+', token);
            }
            return token;

        }).join('/');

        const regex = new RegExp('^' + pattern + '$', 'i'); //regex is case insensitive
        return regex.test(this.url) || regex.test(this.url + '/');
    }

    /**
     * validate that the middleware method matches request method
     */
    private validateMiddleware(options: ResolvedMiddlewareOptions | null): boolean {
        if (isObject<ResolvedMiddlewareOptions>(options)) {
            return options.method.includes(this.method as Method);
        }
        else {
            return true;
        }
    }

    /**
     * validate that the route method matches the request method
     */
    private validateRoute(overrideMethod?: Method): boolean {
        if (overrideMethod && this.method !== overrideMethod) {
            return false;
        }
        else {
            return true;
        }
    }

    /**
     * asynchronously runs the middleware
     */
    private async runMiddlewares(middlewares: Middleware[], parameters: Parameter[]) {

        let proceed: boolean = true;

        const next: Next = () => {
            proceed = true;
        };

        for (const middleware of middlewares) {
            proceed = false;
            await middleware(this.request, this.response, next, ...parameters);
            if (!proceed) {
                if (!this.response.finished) {
                    this.response.end();
                }
                break;
            }
        }
        return proceed;
    }

    /**
     * asynchronously runs the matching route
     */
    private async runRoute(route: RouteInstance, parameters: RouteParameter[]) {

        for(const [url, middlewares, options] of this.middlewares) {
            const middlewareUrl = stripSlashes(url);
            if (this.validateMiddleware(options) && this.matchUrl(middlewareUrl)) {
                const middlewareParameters = this.captureParameters(middlewareUrl);
                if (!(await this.runMiddlewares(middlewares, middlewareParameters.map(this.getParameterValue)))) {
                    return;
                }
            }
        }

        const [, callback, routeOptions] = route;
        const parameterValues = parameters.map(this.getParameterValue);

        //run localised middlewares if any
        if (isObject<ResolvedCallbackOptions>(routeOptions)) {
            if (!(await this.runMiddlewares(routeOptions.middleware, parameterValues))) {
                return;
            }
        }

        await callback(this.request, this.response, ...parameterValues);
    }

    /**
     * processes the route
     */
    private async process(route: RouteInstance, overrideMethod?: Method) {

        const routeUrl = stripSlashes(route[0]);
        if (!this.resolved && this.validateRoute(overrideMethod) && this.matchUrl(routeUrl)) {

            this.resolved = true;
            const parameters = this.captureParameters(routeUrl);
            try {
                await this.runRoute(route, parameters);
            }
            catch(ex) {
                this.logger.fatal(ex, this.response);
            }
            return true;
        }
        else {
            return false;
        }
    }

    /**
     * sets or overrides the existing middlewares
     */
    use(middlewares: MiddlewareInstance[]): this {
        this.middlewares = middlewares;
        return this;
    }

    /**
     * stores route rules for http OPTIONS method
     */
    options(route: RouteInstance) {
        return this.process(route, 'options');
    }

    /**
     * stores route rules for http HEAD method
     */
    head(route: RouteInstance) {
        return this.process(route, 'head');
    }

    /**
     * stores route rules for http GET method
     */
    get(route: RouteInstance) {
        return this.process(route, 'get');
    }

    /**
     * stores route rules for http POST method
     */
    post(route: RouteInstance) {
        return this.process(route, 'post');
    }

    /**
     * stores route rules for http PUT method
     */
    put(route: RouteInstance) {
        return this.process(route, 'put');
    }

    /**
     * stores route rules for http DELETE method
     */
    delete(route: RouteInstance) {
        return this.process(route, 'delete');
    }

    /**
     * stores route rules for all http methods
     */
    all(route: RouteInstance) {
        return this.process(route);
    }
}