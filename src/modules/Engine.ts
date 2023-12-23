import type {
  MiddlewareInstance,
  RouteInstance,
  RouteParameter,
  Middleware,
  Next,
  Method,
  PathParameters,
} from '../@types';
import { fillArray, stripSlashes } from '@teclone/utils';
import { replace } from '@teclone/regex';
import { DOUBLE_TOKEN_REGEX, SINGLE_TOKEN_REGEX } from './Constants';

import { ServerRequest } from './Request';
import { ServerResponse } from './Response';

const generateNext = () => {
  let status = false;

  const next: Next = () => {
    return (status = true);
  };

  next.status = () => {
    return status;
  };

  next.reset = () => {
    status = false;
  };

  return next;
};

export class Engine {
  private resolved = false;

  private request: ServerRequest;

  private response: ServerResponse;

  private method: Method;

  private path: string;

  constructor(
    path: string,
    method: Method,
    request: ServerRequest,
    response: ServerResponse
  ) {
    this.resolved = false;
    this.request = request;
    this.response = response;

    this.path = stripSlashes(path);
    this.method = method;
  }

  /**
   * capture route parameters
   */
  private captureParameter(
    routeToken: string,
    pathToken: string,
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

      const values = pathToken ? pathToken.split(separator) : ['', ''];
      parameters.push(processToken(token1, values[0]));
      parameters.push(processToken(token2, values[1]));
    } else if (SINGLE_TOKEN_REGEX.test(routeToken)) {
      const token = RegExp.$1;
      parameters.push(processToken(token, pathToken));
    }

    return parameters;
  }

  /**
   * runs through the route, and captures parameters
   */
  private captureParameters(routePath: string) {
    routePath = stripSlashes(routePath);

    const parameters: RouteParameter[] = [];

    //split the tokens.
    const routeTokens = routePath.split('/');
    const pathTokens = this.path.split('/');

    // if the route tokens is greater than the path tokens, fill with empty string
    const len = routeTokens.length;
    fillArray(pathTokens, len, '');

    let i = -1;
    while (++i < len) {
      const pathToken = pathTokens[i];
      const routeToken = routeTokens[i];

      // if it is final route token, store remaining url
      if (routeToken === '*' && i + 1 === len) {
        parameters.push({
          name: '__rest',
          dataType: 'string',
          value: pathTokens.slice(i).join('/'),
        });
        break;
      } else {
        this.captureParameter(routeToken, pathToken, parameters);
      }
    }

    return parameters.reduce((acc, current) => {
      acc[current.name] = current.value;
      return acc;
    }, {} as PathParameters);
  }

  /**
   * check if route url matches request url
   */
  private matchPath(routePath: string): boolean {
    routePath = stripSlashes(routePath);

    /* create matching regular expression */
    const tokens = routePath ? routePath.split('/') : [];
    const max = tokens.length - 1;

    const pattern = tokens
      .map((token, index) => {
        // if it is the last token and it is optional, put it inside an optional regex pattern
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

    // the second test is necessary to capture optional path
    return regex.test(this.path) || regex.test(this.path + '/');
  }

  /**
   * processes the route
   */
  async process(
    routeInstances: RouteInstance[],
    middlewareInstances: MiddlewareInstance[] = []
  ) {
    const method = this.method;
    if (this.resolved) {
      return true;
    }

    const routeInstance = routeInstances.find((routeInstance) =>
      this.matchPath(routeInstance[1])
    );

    if (!routeInstance) {
      return false;
    }

    const [, routePath, routeCallback, routeMiddlewares] = routeInstance;

    const matchingMiddlewares: Array<[string, Middleware[]]> =
      middlewareInstances
        .filter(([, middlewarePath, , methods]) => {
          return methods.has(method) && this.matchPath(middlewarePath);
        })
        .map(([, middlewarePath, middleware]) => [middlewarePath, middleware]);

    if (routeMiddlewares.length) {
      matchingMiddlewares.push([routePath, routeMiddlewares]);
    }

    // execute middlewares
    const next = generateNext();

    for (const [middlewarePath, middlewares] of matchingMiddlewares) {
      const pathParams = this.captureParameters(middlewarePath);
      for (const middleware of middlewares) {
        next.reset();

        await middleware(this.request, this.response, next, {
          pathParams,
        });

        if (!next.status()) {
          break;
        }
      }

      // stop executing and return true
      if (!next.status()) {
        return true;
      }
    }

    const routePathParams = this.captureParameters(routePath);
    await routeCallback(this.request, this.response, {
      pathParams: routePathParams,
    });

    return true;
  }
}
