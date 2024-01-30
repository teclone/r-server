import { makeArray, isBoolean, stripSlashes } from '@teclone/utils';
import { Wrapper } from './Wrapper';
import {
  Callback,
  Middleware,
  Method,
  MiddlewareInstance,
  Routes,
  RouteId,
  MiddlewareId,
  RouteInstance,
} from '../@types';
import { ALL_METHODS, assignMiddlewareId, assignRouteId } from './Constants';

interface RouterConstructOpts {
  /**
   * indicating if parent middlewares should be inherited when it gets mounted, defaults to true.
   */
  inheritMiddlewares?: boolean;

  /**
   * defines routers base path
   */
  basePath?: string;
}
export class Router {
  private basePath = '';

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
  constructor(opts?: RouterConstructOpts) {
    this.inheritMiddlewares = opts?.inheritMiddlewares ?? true;
    this.setBasePath(opts?.basePath || '');
  }

  /**
   * resolves the url route by joining it to the base path
   */
  private resolvePath(path: string): string {
    return stripSlashes([this.basePath, stripSlashes(path)].join('/'));
  }

  /**
   * resolves a route callback options
   */
  private resolveMiddlewares(use?: Middleware | Middleware[]): Middleware[] {
    return use ? makeArray(use) : [];
  }

  /**
   * resolves a use middleware options
   */
  private resolveMethods(method: Method | Method[]): Method[] {
    const methods = method ? makeArray(method) : ['*'];
    if (methods.includes('*')) {
      return ALL_METHODS;
    } else {
      return methods as Method[];
    }
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
    path: string,
    callback: Callback,
    use?: Middleware | Middleware[]
  ): RouteId {
    const routeId = assignRouteId();

    const resolvedPath = this.resolvePath(path);
    const methods = this.resolveMethods(method);

    for (const method of methods) {
      this.routes[method].push([
        routeId,
        resolvedPath,
        callback,
        this.resolveMiddlewares(use),
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
    path: string,
    callback: Callback,
    use?: Middleware | Middleware[]
  ): RouteId {
    return this.set('options', path, callback, use);
  }

  /**
   * stores route rules for http HEAD method
   *
   * @param url - route url
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  head(
    path: string,
    callback: Callback,
    use?: Middleware | Middleware[]
  ): RouteId {
    return this.set('head', path, callback, use);
  }

  /**
   * stores route rules for http GET method
   *
   * @param url - route url
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  get(
    path: string,
    callback: Callback,
    use?: Middleware | Middleware[]
  ): RouteId {
    return this.set('get', path, callback, use);
  }

  /**
   * stores route rules for http POST method
   *
   * @param url - route url
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  post(
    path: string,
    callback: Callback,
    use?: Middleware | Middleware[]
  ): RouteId {
    return this.set('post', path, callback, use);
  }

  /**
   * stores route rules for http PUT method
   *
   * @param url - route url
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  put(
    path: string,
    callback: Callback,
    use?: Middleware | Middleware[]
  ): RouteId {
    return this.set('put', path, callback, use);
  }

  /**
   * stores route rules for http DELETE method
   *
   * @param url - route url
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  delete(
    path: string,
    callback: Callback,
    use?: Middleware | Middleware[]
  ): RouteId {
    return this.set('delete', path, callback, use);
  }

  /**
   * stores route rules for all http methods
   *
   * @param url - route url
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  any(
    path: string,
    callback: Callback,
    use?: Middleware | Middleware[]
  ): RouteId {
    return this.set('*', path, callback, use);
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
    path: string,
    middleware: Middleware | Middleware[],
    operation?: Method | Method[]
  ): MiddlewareId {
    const middlewareId = assignMiddlewareId();

    this.middlewares.push([
      middlewareId,
      this.resolvePath(path),
      this.resolveMiddlewares(middleware),
      new Set(this.resolveMethods(operation)),
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

    ALL_METHODS.forEach((key) => {
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
