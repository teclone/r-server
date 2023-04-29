import type {
  Url,
  MiddlewareInstance,
  RouteInstance,
  ResolvedCallbackOptions,
  RouteParameter,
  Middleware,
  Next,
  ServerResponse,
  ServerRequest,
} from '../@types';
import { fillArray, isObject, stripSlashes } from '@teclone/utils';
import { replace } from '@teclone/regex';
import { DOUBLE_TOKEN_REGEX, SINGLE_TOKEN_REGEX } from './Constants';
import { handleError } from './Utils';

const generateNext = () => {
  let status = false;

  const next: Next = () => {
    return (status = true);
  };

  next.status = () => {
    return status;
  };

  next.reset = () => {
    return !(status = false);
  };

  return next;
};

export class Engine {
  private resolved = false;

  private request: ServerRequest;

  private response: ServerResponse;

  private middlewares: MiddlewareInstance[];

  private method: string;

  private url: Url;

  constructor(
    url: Url,
    method: string,
    request: ServerRequest,
    response: ServerResponse
  ) {
    this.resolved = false;
    this.request = request;
    this.response = response;
    this.middlewares = [];

    this.url = stripSlashes(url.replace(/[#?].*$/, ''));
    this.method = method.toLowerCase();
  }

  /**
   * capture route parameters
   */
  private captureParameter(
    routeToken: string,
    urlToken: string,
    parameters: RouteParameter[]
  ): RouteParameter[] {
    const processToken = (token: string, value: string) => {
      const [dataType, name] =
        token.indexOf(':') > -1 ? token.split(':') : ['string', token];
      let result: string | number | boolean = value;

      switch (dataType.toLowerCase()) {
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
          result = ![
            '0',
            'false',
            '',
            'null',
            'nil',
            'undefined',
            'no',
            'none',
          ].includes(value);
          break;
      }

      if (Number.isNaN(result as number)) {
        result = 0;
      }

      return {
        name,
        dataType,
        value: result,
      };
    };

    if (DOUBLE_TOKEN_REGEX.test(routeToken)) {
      const token1 = RegExp.$1;
      const separator = RegExp.$2;
      const token2 = RegExp.$3;

      const values = urlToken ? urlToken.split(separator) : ['', ''];
      parameters.push(processToken(token1, values[0]));
      parameters.push(processToken(token2, values[1]));
    } else if (SINGLE_TOKEN_REGEX.test(routeToken)) {
      const token = RegExp.$1;
      parameters.push(processToken(token, urlToken));
    }
    return parameters;
  }

  /**
   * reduce parameters to object value
   * @param parameters
   */
  private reduceParams(parameters: RouteParameter[]) {
    return parameters.reduce((acc, current) => {
      acc[current.name] = current.value;
      return acc;
    }, {});
  }

  /**
   * runs through the route, and captures parameters
   */
  private captureParameters(routeUrl: string): RouteParameter[] {
    const parameters: RouteParameter[] = [];

    const removeEmpty = (arg: string) => arg !== '';

    //split the tokens.
    const routeTokens = routeUrl.split('/').filter(removeEmpty);
    const urlTokens = this.url.split('/').filter(removeEmpty);

    // if the route tokens is greater than the url tokens, fill with empty string
    const len = routeTokens.length;
    fillArray(urlTokens, len, '');

    let i = -1;
    while (++i < len) {
      const urlToken = urlTokens[i];
      const routeToken = routeTokens[i];

      // if it is final route token, store remaining url
      if (routeToken === '*' && i + 1 === len) {
        parameters.push({
          name: 'rest',
          dataType: 'string',
          value: urlTokens.slice(i).join('/'),
        });
        break;
      } else {
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
    const tokens = routeUrl ? routeUrl.split('/') : [];
    const max = tokens.length - 1;

    const pattern = tokens
      .map((token, index) => {
        if (index === max && /[^)]\?$/.test(token)) {
          token = `(${token.substring(0, token.length - 1)})?`;
        }
        if (token === '*') {
          return '.*';
        } else {
          token = replace(DOUBLE_TOKEN_REGEX, '[^/]+$:2[^/]+', token);
          token = replace(SINGLE_TOKEN_REGEX, '[^/]+', token);
        }
        return token;
      })
      .join('/');

    const regex = new RegExp('^' + pattern + '$', 'i'); //regex is case insensitive
    return regex.test(this.url) || regex.test(this.url + '/');
  }

  /**
   * asynchronously runs the middleware
   */
  private async runMiddlewares(
    middlewares: Middleware[],
    parameters: RouteParameter[]
  ) {
    const next = generateNext();

    for (let i = 0; i < middlewares.length; i++) {
      const middleware = middlewares[i];
      next.reset();
      await middleware(this.request, this.response, next, {
        params: this.reduceParams(parameters),
      });

      if (next.status() === false) {
        break;
      }
    }

    if (
      next.status() === false &&
      (!this.response.writableFinished || !this.response.finished)
    ) {
      this.response.end();
    }

    return next.status();
  }

  /**
   * asynchronously runs the matching route
   */
  private async runRoute(route: RouteInstance, parameters: RouteParameter[]) {
    for (let i = 0; i < this.middlewares.length; i++) {
      const [, url, middlewares, options] = this.middlewares[i];
      const middlewareUrl = stripSlashes(url);

      const methods = options.method;

      if (
        methods.length === 0 ||
        !methods.includes(this.method as any) ||
        !this.matchUrl(middlewareUrl)
      ) {
        continue;
      }

      const middlewareParameters = this.captureParameters(middlewareUrl);

      const shouldContinue = await this.runMiddlewares(
        middlewares,
        middlewareParameters
      );

      if (!shouldContinue) {
        return;
      }
    }

    const [, , callback, routeOptions] = route;

    //run localised middlewares if any
    if (isObject<ResolvedCallbackOptions>(routeOptions)) {
      if (!(await this.runMiddlewares(routeOptions.use, parameters))) {
        return;
      }
    }

    return callback(this.request, this.response, {
      params: this.reduceParams(parameters),
    });
  }

  /**
   * processes the route
   */
  async process(route: RouteInstance) {
    const routeUrl = stripSlashes(route[1]);
    if (this.resolved) {
      return true;
    }

    if (!this.matchUrl(routeUrl)) {
      return false;
    }

    this.resolved = true;
    const parameters = this.captureParameters(routeUrl);

    try {
      await this.runRoute(route, parameters);
    } catch (ex) {
      handleError(ex, this.response);
    }
    return true;
  }

  /**
   * sets or overrides the existing middlewares
   */
  use(middlewares: MiddlewareInstance[]): this {
    this.middlewares = middlewares;
    return this;
  }
}
