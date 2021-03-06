import {
  makeArray,
  isObject,
  isBoolean,
  stripSlashes,
  isUndefined,
} from '@teclone/utils';
import Wrapper from './Wrapper';
import {
  Callback,
  CallbackOptions,
  Middleware,
  Url,
  Method,
  MiddlewareOptions,
  MiddlewareInstance,
  Routes,
  RouteId,
  MiddlewareId,
  RouteInstance,
} from '../@types';
import { joinPaths } from '@teclone/node-utils';
import { assignMiddlewareId, assignRouteId } from './Constants';

export default class Router {
  private basePath: string = '';

  private routes: Routes = {
    options: [],
    head: [],
    get: [],
    post: [],
    put: [],
    delete: [],
    all: [],
  };

  private middlewares: MiddlewareInstance[] = [];

  private inheritMiddlewares: boolean;

  /**
   *
   * @param inheritMiddlewares - boolean indicating if parent middlewares should be inherited.
   */
  constructor(inheritMiddlewares: boolean) {
    this.inheritMiddlewares = inheritMiddlewares;
  }

  /**
   * resolves the url route by joining it to the base path
   */
  private resolveUrl(url: string): string {
    url = joinPaths(this.basePath, stripSlashes(url));
    return url !== '.' ? url : '';
  }

  /**
   * sets the route rule for a given http method
   *
   * @param method - the http method
   * @param url - route url
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  private set(
    method: Method,
    url: Url,
    callback: Callback,
    options?: Middleware | Middleware[] | CallbackOptions,
  ): RouteId {
    const resolvedOptions = isUndefined(options)
      ? null
      : {
          middleware: isObject<CallbackOptions>(options)
            ? makeArray(options.middleware)
            : makeArray(options),
        };

    const routeId = assignRouteId();
    this.routes[method].push([routeId, this.resolveUrl(url), callback, resolvedOptions]);
    return routeId;
  }

  /**
   * returns the routes.
   */
  getRoutes() {
    return this.routes;
  }

  /**
   * returns the middlewares
   */
  getMiddlewares() {
    return this.middlewares;
  }

  /**
   * returns routing base path that gets prepended to all route and middleware urls
   */
  getBasePath(): string {
    return this.basePath;
  }

  /**
   * sets routing base path that gets prepended to all route and middleware urls
   */
  setBasePath(basePath: string): this {
    this.basePath = stripSlashes(basePath);
    return this;
  }

  /**
   * stores route rules for http OPTIONS method
   *
   * @param url - route url
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  options(
    url: Url,
    callback: Callback,
    options?: Middleware | Middleware[] | CallbackOptions,
  ): RouteId {
    return this.set('options', url, callback, options);
  }

  /**
   * stores route rules for http HEAD method
   *
   * @param url - route url
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  head(
    url: Url,
    callback: Callback,
    options?: Middleware | Middleware[] | CallbackOptions,
  ): RouteId {
    return this.set('head', url, callback, options);
  }

  /**
   * stores route rules for http GET method
   *
   * @param url - route url
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  get(
    url: Url,
    callback: Callback,
    options?: Middleware | Middleware[] | CallbackOptions,
  ): RouteId {
    return this.set('get', url, callback, options);
  }

  /**
   * stores route rules for http POST method
   *
   * @param url - route url
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  post(
    url: Url,
    callback: Callback,
    options?: Middleware | Middleware[] | CallbackOptions,
  ): RouteId {
    return this.set('post', url, callback, options);
  }

  /**
   * stores route rules for http PUT method
   *
   * @param url - route url
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  put(
    url: Url,
    callback: Callback,
    options?: Middleware | Middleware[] | CallbackOptions,
  ): RouteId {
    return this.set('put', url, callback, options);
  }

  /**
   * stores route rules for http DELETE method
   *
   * @param url - route url
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  delete(
    url: Url,
    callback: Callback,
    options?: Middleware | Middleware[] | CallbackOptions,
  ): RouteId {
    return this.set('delete', url, callback, options);
  }

  /**
   * stores route rules for all http methods
   *
   * @param url - route url
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  all(
    url: Url,
    callback: Callback,
    options?: Middleware | Middleware[] | CallbackOptions,
  ): RouteId {
    return this.set('all', url, callback, options);
  }

  /**
   * creates and returns a route wrapper for the given url
   */
  route(url: string): Wrapper {
    return new Wrapper(this, url);
  }

  /**
   * registers a middleware to be called whenever the given url is visited
   *
   * @param url - url to apply middleware to. use * to appy to all urls
   * @param middleware - the middleware or array of middlewares
   * @param options - middleware configuration option. here, you can specify the http method
   * that the middleware will run against
   *@returns {MiddlewareId} returns the middleware id, can be used to delete the middleware.
   */
  use(
    url: Url,
    middleware: Middleware | Middleware[],
    options?: Method | Method[] | MiddlewareOptions,
  ): MiddlewareId {
    middleware = makeArray(middleware);
    const resolvedOptions = isUndefined(options)
      ? null
      : {
          method: isObject<MiddlewareOptions>(options)
            ? makeArray(options.method)
            : makeArray(options),
        };
    const middlewareId = assignMiddlewareId();
    this.middlewares.push([
      middlewareId,
      this.resolveUrl(url),
      middleware,
      resolvedOptions,
    ]);

    return middlewareId;
  }

  /**
   * returns a boolean indicating if router inherits parent's middlewares when mounted
   * @param status - if given, it sets this value
   */
  shouldInheritMiddlewares(status?: boolean): boolean {
    if (isBoolean(status)) {
      this.inheritMiddlewares = status;
    }
    return this.inheritMiddlewares;
  }

  /**
   * removes a given route
   * @param id route id
   */
  removeRoute(id: RouteId): boolean {
    const findIndex = (routeInstance: RouteInstance) => routeInstance[0] === id;

    const keys = Object.keys(this.routes);
    for (const key of keys) {
      const route = this.routes[key] as RouteInstance[];
      const index = route.findIndex(findIndex);

      if (index !== -1) {
        route.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  /**
   * removes a given middleware. returns true if it succeeds, otherwise, it returns false
   * @param id middleware id
   */
  removeMiddleware(id: RouteId): boolean {
    const findIndex = (middlewareInstance: MiddlewareInstance) =>
      middlewareInstance[0] === id;
    const middlewares = this.middlewares;

    const index = middlewares.findIndex(findIndex);
    if (index !== -1) {
      middlewares.splice(index, 1);
      return true;
    }
    return false;
  }
}
