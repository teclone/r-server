import {
  makeArray,
  isObject,
  isBoolean,
  stripSlashes,
  isCallable,
  isString,
} from '@teclone/utils';
import { Wrapper } from './Wrapper';
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
  ResolvedCallbackOptions,
  ResolvedMiddlewareOptions,
} from '../@types';
import { assignMiddlewareId, assignRouteId, ROUTE_KEYS } from './Constants';
import { getRouteKeys } from './Utils';
import { join } from 'path';

export class Router {
  private basePath: string = '';

  private routes: Routes = {
    options: [],
    head: [],
    get: [],
    post: [],
    put: [],
    delete: [],
  };

  private middlewares: MiddlewareInstance[] = [];

  private inheritMiddlewares: boolean;

  /**
   *
   * @param inheritMiddlewares - boolean indicating if parent middlewares should be inherited, defaults to true.
   */
  constructor(inheritMiddlewares: boolean = true) {
    this.inheritMiddlewares = inheritMiddlewares;
  }

  /**
   * resolves the url route by joining it to the base path
   */
  private resolveUrl(url: string): string {
    url = join(this.basePath, stripSlashes(url));
    return url !== '.' ? url : '';
  }

  /**
   * resolves a route callback options
   */
  private resolveCallbackOptions(
    options?: Middleware | Middleware[] | CallbackOptions
  ) {
    let resolvedOptions: ResolvedCallbackOptions = null;

    if (isCallable(options) || Array.isArray(options)) {
      resolvedOptions = { use: makeArray(options) };
    } else if (isObject(options)) {
      resolvedOptions = {
        use: makeArray(options.use),
        options: options.options,
      };
    }

    return resolvedOptions;
  }

  /**
   * resolves a use middleware options
   */
  private resolveMiddlewareOptions(
    options: Method | Method[] | MiddlewareOptions = '*'
  ) {
    let resolvedOptions: ResolvedMiddlewareOptions = null;

    if (isString(options) || Array.isArray(options)) {
      resolvedOptions = { method: getRouteKeys(options) };
    } else if (isObject(options)) {
      resolvedOptions = {
        method: getRouteKeys(options.method || '*'),
        options: options.options,
      };
    }

    return resolvedOptions;
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
    options?: Middleware | Middleware[] | CallbackOptions
  ): RouteId {
    const routeId = assignRouteId();

    const resolvedOptions = this.resolveCallbackOptions(options);
    const resolvedUrl = this.resolveUrl(url);

    for (const routeKey of getRouteKeys(method)) {
      this.routes[routeKey].push([
        routeId,
        resolvedUrl,
        callback,
        resolvedOptions,
      ]);
    }

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
    options?: Middleware | Middleware[] | CallbackOptions
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
    options?: Middleware | Middleware[] | CallbackOptions
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
    options?: Middleware | Middleware[] | CallbackOptions
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
    options?: Middleware | Middleware[] | CallbackOptions
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
    options?: Middleware | Middleware[] | CallbackOptions
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
    options?: Middleware | Middleware[] | CallbackOptions
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
  any(
    url: Url,
    callback: Callback,
    options?: Middleware | Middleware[] | CallbackOptions
  ): RouteId {
    return this.set('*', url, callback, options);
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
    options?: Method | Method[] | MiddlewareOptions
  ): MiddlewareId {
    middleware = makeArray(middleware);

    const resolvedOptions = this.resolveMiddlewareOptions(options);
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
   * sets or gets the inherit parent's middlewares flag.
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
    let found = false;

    ROUTE_KEYS.forEach((key) => {
      const route: RouteInstance[] = this.routes[key];

      const index = route.findIndex(findIndex);
      if (index !== -1) {
        route.splice(index, 1);
        found = true;
      }
    });

    return found;
  }

  /**
   * removes a given middleware. returns true if it succeeds, otherwise, it returns false
   * @param id middleware id
   */
  removeMiddleware(id: RouteId): boolean {
    const findIndex = (instance: MiddlewareInstance) => instance[0] === id;
    const middlewares = this.middlewares;

    const index = middlewares.findIndex(findIndex);
    if (index !== -1) {
      middlewares.splice(index, 1);
      return true;
    }
    return false;
  }
}
