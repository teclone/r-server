import defaultConfig from '../.server';
import BodyParser from './BodyParser';
import Engine from './Engine';
import FileServer from './FileServer';
import Logger from './Logger';
import Router from './Router';
import * as fs from 'fs';
import { Server as HttpServer, createServer as createHttpServer } from 'http';
import { Server as HttpsServer, createServer as createHttpsServer } from 'https';
import * as path from 'path';
import Response from './Response';
import Request from './Request';
import {
  Config,
  RServerConfig,
  RouteInstance,
  MiddlewareInstance,
  ListenerCallback,
  Url,
  Method,
  Callback,
  Middleware,
  CallbackOptions,
  MiddlewareOptions,
  RouteId,
  MiddlewareId,
} from '../@types';
import { isString, copy, isNumber, scopeCallback, expandToNumeric } from '@forensic-js/utils';
import { joinPaths, getEntryPath } from '@forensic-js/node-utils';
import { AddressInfo } from 'net';
import Wrapper from './Wrapper';

export default class App {
  private httpServer: HttpServer = createHttpServer({
    ServerResponse: Response,
    IncomingMessage: Request,
  });

  private httpsServer: HttpsServer | null = null;

  private entryPath: string = '';

  private config: RServerConfig;

  private router: Router = new Router(false);

  private mountedRouters: Router[] = [];

  private logger: Logger;

  private fileServer: FileServer;

  private bodyParser: BodyParser;

  private activeServers: number = 0;

  private closeCallback: ListenerCallback | null = null;

  constructor(config: string | Config) {
    /* istanbul ignore else */
    this.entryPath = getEntryPath();

    this.config = this.resolveConfig(this.entryPath, config);
    this.logger = new Logger(this.entryPath, this.config);
    this.fileServer = new FileServer(this.entryPath, this.config, this.logger);
    this.bodyParser = new BodyParser(this.entryPath, this.config);

    //setup https server if it is enabled
    const httpsConfig = this.config.https;
    if (httpsConfig.enabled) {
      const options: object = {
        ServerResponse: Response,
        IncomingMessage: Request,
      };
      Object.entries(httpsConfig.credentials).reduce((result, [key, value]) => {
        result[key] = key === 'passphrase' ? key : fs.readFileSync(path.resolve(this.entryPath, value));
        return result;
      }, options);

      this.httpsServer = createHttpsServer(options);
    }
  }

  /**
   * returns server intro
   */
  private getServerIntro(server: HttpServer | HttpsServer) {
    const result = {
      name: server instanceof HttpsServer ? 'Https' : 'Http',
      address: '',
    };
    if (server.listening) {
      const { address, port } = server.address() as AddressInfo;
      /* istanbul ignore else */
      if (address === '::') {
        result.address = `${result.name.toLowerCase()}://localhost:${port}/`;
      } else {
        result.address = `${result.name.toLowerCase()}://${address}:${port}/`;
      }
    }
    return result;
  }

  /**
   * resolves and merges the configuration objects
   */
  private resolveConfig(entryPath: string, config: string | Config): RServerConfig {
    if (isString(config)) {
      const absPath = path.resolve(entryPath, config);
      if (fs.existsSync(absPath)) {
        config = require(absPath);
      } else {
        config = {};
      }
    }

    const resolvedConfig: RServerConfig = copy({}, defaultConfig, config as RServerConfig);

    // resolve to numeric value
    resolvedConfig.maxMemory = expandToNumeric(resolvedConfig.maxMemory);

    // prioritize node_env setting to config file setting
    const NODE_ENV = process.env.NODE_ENV;
    if (isString(NODE_ENV) && NODE_ENV !== '') {
      if (NODE_ENV.toLowerCase().indexOf('prod') > -1) {
        resolvedConfig.env = 'prod';
      } else if (NODE_ENV.toLowerCase().indexOf('dev') > -1) {
        resolvedConfig.env = 'dev';
      }
    }

    const HTTPS_PORT = process.env.HTTPS_PORT;
    if (isNumber(HTTPS_PORT) || (isString(HTTPS_PORT) && /^\d{3}/.test(HTTPS_PORT))) {
      resolvedConfig.https.port = Number.parseInt(HTTPS_PORT);
    }
    return resolvedConfig;
  }

  /**
   * runs the array of route instances until a matched route is found
   */
  private async runRoutes(engine: Engine, api: Method, routes: RouteInstance[]) {
    for (const route of routes) {
      if (await engine[api](route)) {
        return true;
      }
    }
    return false;
  }

  /**
   * cordinates how routes are executed, including mounted routes
   */
  private async cordinateRoutes(url: Url, method: string, request: Request, response: Response) {
    method = method.toLowerCase();

    //create the engine, with zero middlewares yet
    const engine = new Engine(url, method, request, response, this.logger);
    const routes = this.router.getRoutes();

    //run on the main router thread
    engine.use(this.router.getMiddlewares());

    if (await this.runRoutes(engine, 'all', routes.all)) {
      return true;
    }
    if (await this.runRoutes(engine, method as Method, routes[method])) {
      return true;
    }

    //run on the mounted routers' thread
    for (const mountedRouter of this.mountedRouters) {
      const middlewares = mountedRouter.shouldInheritMiddlewares()
        ? [...this.router.getMiddlewares(), ...mountedRouter.getMiddlewares()]
        : mountedRouter.getMiddlewares();

      const mountedRoutes = mountedRouter.getRoutes();
      engine.use(middlewares);

      if (await this.runRoutes(engine, 'all', mountedRoutes.all)) {
        return true;
      }
      /* istanbul ignore else */
      if (await this.runRoutes(engine, method as Method, mountedRoutes[method])) {
        return true;
      }
    }

    return false;
  }

  /**
   * perform house keeping
   */
  private onResponseFinish(request: Request, response: Response) {
    response.endedAt = new Date();
    this.bodyParser.cleanUpTempFiles(request.files);
    this.logger.profile(request, response);
  }

  /**
   * handle on response error event
   */
  private onResponseError(err, response) {
    this.logger.fatal(err, response);
  }

  /**
   * parse all request data
   */
  private parseRequestData(request: Request, url: Url) {
    //parse query
    request.query = this.bodyParser.parseQueryString(url);

    //parse the request body
    if (request.buffer.length > 0) {
      let contentType = 'text/plain';
      /* istanbul ignore else */
      if (request.headers['content-type']) {
        contentType = request.headers['content-type'];
      }
      const result = this.bodyParser.parse(request.buffer, contentType);
      request.body = result.body;
      request.files = result.files;
    }
    copy(request.data, request.query, request.body);
  }

  /**
   * handle onrequest end event
   */
  private onRequestEnd(request: Request, response: Response) {
    //if the response is already sent, such as fatal errors, just return.
    request.endedAt = response.startedAt = new Date();

    response.fileServer = this.fileServer;
    response.request = request;

    if (!response.finished) {
      if (request.entityTooLarge) {
        return response.status(413).end();
      }

      let { url, method } = request;

      this.parseRequestData(request, url as string);
      return this.cordinateRoutes(url as string, method as string, request, response).then(status => {
        if (!status) {
          return this.fileServer.serve(url as string, request, response).then(status => {
            if (!status) {
              return this.fileServer.serveHttpErrorFile(response, 404);
            }
            return true;
          });
        }
        return true;
      });
    }
  }

  /**
   * handle on request error event
   */
  private onRequestError(err, response) {
    this.logger.fatal(err, response);
  }

  /**
   * handle request data event
   */
  private onRequestData(chunk: Buffer, request: Request) {
    if (request.buffer.length + chunk.length <= this.config.maxMemory) {
      request.buffer = Buffer.concat([request.buffer, chunk]);
    } else {
      request.entityTooLarge = true;
    }
  }

  /**
   * handles onrequest events
   */
  private onRequest(request: Request, response: Response, server: HttpServer | HttpsServer) {
    request.method = request.method.toLowerCase() as Method;
    request.startedAt = new Date();
    request.hostname = (request.headers['host'] as string).replace(/:\d+$/, '');
    request.encrypted = server instanceof HttpsServer;

    //handle on request error
    request.on('error', scopeCallback(this.onRequestError, this, response));

    //handle on data event
    request.on('data', scopeCallback(this.onRequestData, this, request));

    //handle on data event
    request.on('end', scopeCallback(this.onRequestEnd, this, [request, response]));

    //handle on response error
    response.on('error', scopeCallback(this.onResponseError, this, response));

    //clean up resources once the response has been sent out
    response.on('finish', scopeCallback(this.onResponseFinish, this, [request, response]));

    //enforce https if set
    const httpsConfig = this.config.https;
    if (httpsConfig.enabled && !request.encrypted && httpsConfig.enforce) {
      response.redirect(`https://${path.join(request.hostname + ':' + httpsConfig.port, request.url as string)}`);
    }
  }

  /**
   * handle server close event
   */
  private onClose(server: HttpServer | HttpsServer) {
    this.activeServers -= 1;

    const intro = this.getServerIntro(server);
    this.logger.info(`${intro.name} connection closed successfully`);

    if (this.activeServers === 0 || this.httpsServer === null) {
      const callback = this.closeCallback as ListenerCallback;

      this.closeCallback = null;
      this.logger.close();

      callback();
    }
  }

  /**
   * handles server listening event
   */
  private onListening(server: HttpServer | HttpsServer, callback: ListenerCallback) {
    this.activeServers += 1;
    const intro = this.getServerIntro(server);

    this.logger.info(`${intro.name} server started at ${intro.address}`);

    if (this.activeServers === 2 || this.httpsServer === null) {
      callback();
    }
  }

  /**
   * handles client error events
   */
  // private onClientError(err, socket: Socket) {
  //     socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  // }

  /**
   * handle server error events
   */
  private onServerError(err, server: HttpServer | HttpsServer) {
    const intro = this.getServerIntro(server);
    this.logger.warn(`${intro.name} Server Error: ${err.code} ${err.message}`);
    this.close(() => {});
  }

  /**
   * binds all event handlers on the server
   */
  private initServer(server: HttpServer | HttpsServer, callback: ListenerCallback) {
    //handle on error event
    server
      .on('error', scopeCallback(this.onServerError, this, server))

      //handle server client error
      //.on('clientError', scopeCallback(this.onClientError, this))

      //handle server listening event
      .on('listening', scopeCallback(this.onListening, this, [server, callback]))

      //handle server close event
      .on('close', scopeCallback(this.onClose, this, server))

      //handle server request
      .on('request', scopeCallback(this.onRequest, this, server));
  }

  /**
   * returns boolean indicating if the server is listening
   */
  get listening() {
    return (this.httpsServer && this.httpsServer.listening) || this.httpServer.listening;
  }

  /**
   * returns the server instance router
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * returns the server instance mounted routers
   */
  getMountedRouters(): Router[] {
    return this.mountedRouters;
  }

  /**
   * returns the resolved server config object
   */
  getConfig() {
    return this.config;
  }

  /**
   * sets routing base path that gets prepended to all route and middleware urls
   */
  setBasePath(basePath: string) {
    this.router.setBasePath(basePath);
  }

  /**
   * stores route rules for http OPTIONS method
   *
   * @param url - route url
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  options(url: Url, callback: Callback, options?: Middleware | Middleware[] | CallbackOptions) {
    return this.router.options(url, callback, options);
  }

  /**
   * stores route rules for http HEAD method
   *
   * @param url - route url
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  head(url: Url, callback: Callback, options?: Middleware | Middleware[] | CallbackOptions) {
    return this.router.head(url, callback, options);
  }

  /**
   * stores route rules for http GET method
   *
   * @param url - route url
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  get(url: Url, callback: Callback, options?: Middleware | Middleware[] | CallbackOptions) {
    return this.router.get(url, callback, options);
  }

  /**
   * stores route rules for http POST method
   *
   * @param url - route url
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  post(url: Url, callback: Callback, options?: Middleware | Middleware[] | CallbackOptions) {
    return this.router.post(url, callback, options);
  }

  /**
   * stores route rules for http PUT method
   * @param url - route url
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  put(url: Url, callback: Callback, options?: Middleware | Middleware[] | CallbackOptions) {
    return this.router.put(url, callback, options);
  }

  /**
   * stores route rules for http DELETE method
   *
   * @param url - route url
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  delete(url: Url, callback: Callback, options?: Middleware | Middleware[] | CallbackOptions) {
    return this.router.delete(url, callback, options);
  }

  /**
   * stores route rules for all http methods
   *
   * @param url - route url
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  all(url: Url, callback: Callback, options?: Middleware | Middleware[] | CallbackOptions) {
    this.router.all(url, callback, options);
  }

  /**
   * returns a route wrapper for the given url
   */
  route(url: Url): Wrapper {
    return new Wrapper(this.router, url);
  }

  /**
   * removes a given route
   * @param id route id
   */
  removeRoute(id: RouteId): boolean {
    if (!this.router.removeRoute(id)) {
      for (const mountedRouter of this.mountedRouters) {
        if (mountedRouter.removeRoute(id)) {
          return true;
        }
      }
      return false;
    } else {
      return true;
    }
  }

  /**
   * removes a given middleware
   * @param id middleware id
   */
  removeMiddleware(id: MiddlewareId): boolean {
    if (!this.router.removeMiddleware(id)) {
      for (const mountedRouter of this.mountedRouters) {
        if (mountedRouter.removeMiddleware(id)) {
          return true;
        }
      }
      return false;
    } else {
      return true;
    }
  }

  /**
   * registers a middleware to be called whenever the given url is visited
   *
   * @param url - url to apply middleware to. use * to appy to all urls
   * @param middleware - the middleware or array of middlewares
   * @param options - middleware configuration option. here, you can specify the http method
   * that the middleware will run against
   */
  use(url: Url, middleware: Middleware | Middleware[], options?: Method | Method[] | MiddlewareOptions) {
    return this.router.use(url, middleware, options);
  }

  /**
   * mounts a router to the server instance
   */
  mount(baseUrl: Url, router: Router) {
    const mainRouterBasePath = this.router.getBasePath();
    const resolve = (instance: RouteInstance | MiddlewareInstance) => {
      instance[1] = joinPaths(mainRouterBasePath, baseUrl, instance[1]);
    };

    //resolve all routes, each apiRoutes is of the form [url, callback, options]
    const routes = router.getRoutes();
    for (const api of Object.keys(routes)) {
      const apiRoutes = routes[api] as Array<RouteInstance>;
      apiRoutes.forEach(resolve, this);
    }

    //resolve all middlewares. each middleware is of the format [url, callback, options]
    const middlewares = router.getMiddlewares();
    middlewares.forEach(resolve);

    this.mountedRouters.push(router);
  }

  /**
   * starts the server at a given port
   */
  listen(port?: number | null, callback: ListenerCallback = () => {}) {
    const envPort = Number.parseInt(process.env.PORT || '0');
    if (this.listening) {
      this.logger.warn('Server already started. You must close the server first');
    } else {
      this.initServer(this.httpServer, callback);
      this.httpServer.listen(envPort || port || 8000);

      if (this.httpsServer !== null) {
        this.initServer(this.httpsServer, callback);
        this.httpsServer.listen(this.config.https.port);
      }
    }
  }

  /**
   * closes server
   * @param callback callback function to execute when connection closes
   */
  close(callback: ListenerCallback = () => {}) {
    if (this.listening) {
      this.closeCallback = callback;
      this.httpServer.close();
      if (this.httpsServer && this.httpsServer.listening) {
        this.httpsServer.close();
      }
    }
  }

  /**
   * returns http and https server address
   */
  address() {
    const result: { http: AddressInfo | null; https: AddressInfo | null } = {
      http: null,
      https: null,
    };

    if (this.httpServer.listening) {
      result.http = this.httpServer.address() as AddressInfo;
    }
    if (this.httpsServer && this.httpsServer.listening) {
      result.https = this.httpsServer.address() as AddressInfo;
    }
    return result;
  }
}
