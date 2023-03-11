import { rServerConfig as defaultConfig } from '../.server';
import { BodyParser } from './BodyParser';
import { Engine } from './Engine';
import { FileServer } from './FileServer';
import { Logger } from './Logger';
import { Router } from './Router';
import * as fs from 'fs';
import { Server as HttpServer, createServer as createHttpServer } from 'http';
import {
  Server as HttpsServer,
  createServer as createHttpsServer,
} from 'https';
import * as path from 'path';
import { Response } from './Response';
import { Request } from './Request';
import {
  Config,
  RServerConfig,
  RouteInstance,
  MiddlewareInstance,
  Url,
  Method,
  Callback,
  Middleware,
  CallbackOptions,
  MiddlewareOptions,
  RouteId,
  MiddlewareId,
  ErrorCallback,
  Env,
} from '../@types';
import { copy, scopeCallback, expandToNumeric, isObject } from '@teclone/utils';
import { AddressInfo } from 'net';
import { Wrapper } from './Wrapper';
import { EntityTooLargeException } from '../Exceptions/EntityTooLargeException';
import { config } from 'dotenv';
import { join } from 'path';
import { handleError } from './Utils';

export interface AppConstructorOptions<
  Rq extends Request = Request,
  Rs extends Response = Response
> {
  configFile?: string;
  config?: Config;
  Request?: Rs;
  Response?: Rq;
}

export class App<Rq extends Request = Request, Rs extends Response = Response> {
  private constructOptions: AppConstructorOptions<Rq, Rs>;

  private httpServer: HttpServer | null = null;

  private httpsServer: HttpsServer | null = null;

  private entryPath: string = '';

  private config: RServerConfig = {};

  private router: Router = new Router(false);

  private mountedRouters: Router[] = [];

  private logger: Logger;

  private bodyParser: BodyParser;

  private errorCallback: ErrorCallback | null = null;

  constructor(options?: AppConstructorOptions<Rq, Rs>) {
    const { configFile, config = {} } = options || {};

    this.constructOptions = options || {};

    this.entryPath = process.cwd();
    this.config = this.resolveConfig(this.entryPath, configFile, config);

    this.loadEnv(this.entryPath, this.config.env);

    this.logger = new Logger(this.config);
    this.bodyParser = new BodyParser(this.config);

    this.createServers();
  }

  createServers() {
    const {
      Request: RequestToUse = Request,
      Response: ResponseToUse = Response,
    } = this.constructOptions;

    this.httpServer = createHttpServer(
      {
        ServerResponse: ResponseToUse,
        IncomingMessage: RequestToUse,
      } as any,
      null
    );

    //setup https server if it is enabled
    const httpsConfig = this.config.https;
    if (httpsConfig.enabled) {
      const options: object = {
        ServerResponse: ResponseToUse,
        IncomingMessage: RequestToUse,
      };

      Object.entries(httpsConfig.credentials).reduce((result, [key, value]) => {
        result[key] =
          key === 'passphrase'
            ? key
            : fs.readFileSync(path.resolve(this.entryPath, value));
        return result;
      }, options);

      this.httpsServer = createHttpsServer(options, null);
    }
  }

  /**
   * returns the env variable
   */
  get env() {
    return this.config.env;
  }

  /**
   * load env settings
   */
  private loadEnv(entryPath: string, env: Env) {
    try {
      config();
      config({
        path: path.resolve(entryPath, `.${env}`),
      });
    } catch (ex) {}
  }

  /**
   * resolves and merges the configuration objects
   */
  private resolveConfig(
    entryPath: string,
    configFile?: string,
    config?: Config
  ): RServerConfig {
    let configFromFile: RServerConfig;

    if (configFile) {
      const absPath = path.resolve(entryPath, configFile);
      if (fs.existsSync(absPath)) {
        configFromFile = require(absPath);
      }
    }

    const resolvedConfig = copy(
      {},
      defaultConfig,
      configFromFile,
      config
    ) as RServerConfig;

    resolvedConfig.env =
      resolvedConfig.env || (process.env.NODE_ENV as Env) || 'development';

    // resolve to numeric value
    resolvedConfig.maxMemory = expandToNumeric(resolvedConfig.maxMemory);

    // resolve ports
    if (!resolvedConfig.port) {
      resolvedConfig.port = Number.parseInt(process.env.PORT || '8000');
    }

    if (!resolvedConfig.https.port) {
      resolvedConfig.https.port = Number.parseInt(
        process.env.HTTPS_PORT || '9000'
      );
    }

    resolvedConfig.entryPath = entryPath;
    return resolvedConfig;
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
   * runs the array of route instances until a matched route is found
   */
  private async runRoutes(method: Method, engine: Engine, router: Router) {
    const routes = router.getRoutes()[method];
    for (const route of routes) {
      if (await engine.process(route)) {
        return true;
      }
    }
    return false;
  }

  /**
   * cordinates how routes are executed, including mounted routes
   */
  private async cordinateRoutes(
    url: Url,
    method: string,
    request: Request,
    response: Response
  ) {
    method = method.toLowerCase();

    //create the engine
    const engine = new Engine(url, method, request, response);

    //run main router
    engine.use(this.router.getMiddlewares());

    if (await this.runRoutes(method as Method, engine, this.router)) {
      return true;
    }

    //run mounted routers
    for (const mountedRouter of this.mountedRouters) {
      const middlewares = mountedRouter.shouldInheritMiddlewares()
        ? [...this.router.getMiddlewares(), ...mountedRouter.getMiddlewares()]
        : mountedRouter.getMiddlewares();

      engine.use(middlewares);

      /* istanbul ignore else */
      if (await this.runRoutes(method as Method, engine, mountedRouter)) {
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

      //TODO: add support for content encoding
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
    if (request.error) {
      return;
    }

    request.endedAt = response.startedAt = new Date();

    let { url, method } = request;

    this.parseRequestData(request, url as string);
    return this.cordinateRoutes(
      url as string,
      method as string,
      request,
      response
    ).then((status) => {
      if (!status) {
        const fileServer = new FileServer(this.config, request, response);
        return fileServer.serve(url as string).then((status) => {
          if (!status) {
            return fileServer.serveHttpErrorFile(404);
          }
          return true;
        });
      }
      return true;
    });
  }

  /**
   * handle on request error event
   */
  private onRequestError(err: Error, request: Request, response: Response) {
    request.error = true;
    handleError(err, response);
  }

  /**
   * handle request data event
   */
  private onRequestData(chunk: Buffer, request: Request, response: Response) {
    if (!request.entityTooLarge) {
      const newEntityLength = request.buffer.length + chunk.length;
      if (!this.config.maxMemory || newEntityLength <= this.config.maxMemory) {
        request.buffer = Buffer.concat([request.buffer, chunk]);
      } else {
        request.entityTooLarge = true;
        request.emit('error', new EntityTooLargeException());
      }
    }
  }

  /**
   * handles onrequest events
   */
  private onRequest(
    request: Request,
    response: Response,
    server: HttpServer | HttpsServer
  ) {
    request.method = request.method.toLowerCase() as any;
    request.startedAt = new Date();

    request.hostname = (request.headers['host'] as string).replace(/:\d+$/, '');
    request.encrypted = server instanceof HttpsServer;

    response.config = this.config;
    response.logger = this.logger;
    response.req = request;
    response.errorCallback = this.errorCallback;

    //enforce https if set
    const httpsConfig = this.config.https;
    if (httpsConfig.enabled && !request.encrypted && httpsConfig.enforce) {
      response.redirect(
        `https://${path.join(
          request.hostname + ':' + httpsConfig.port,
          request.url as string
        )}`
      );
    } else {
      //handle on request error
      request.on(
        'error',
        scopeCallback(this.onRequestError, this, [request, response])
      );

      //handle on data event
      request.on(
        'data',
        scopeCallback(this.onRequestData, this, [request, response])
      );

      //handle on end event
      request.on(
        'end',
        scopeCallback(this.onRequestEnd, this, [request, response])
      );

      //clean up resources once the response has been sent out
      response.on(
        'finish',
        scopeCallback(this.onResponseFinish, this, [request, response])
      );
    }
  }

  /**
   * binds all event handlers on the server
   */
  private closeServer(server: HttpServer | HttpsServer, resolve, reject) {
    if (server && server.listening) {
      server.close((err) => {
        resolve(true);
      });
    } else {
      resolve(true);
    }
  }

  /**
   * binds all event handlers on the server
   */
  private initServer(server: HttpServer | HttpsServer, resolve, reject) {
    //handle error event
    server
      .on('error', (err: any) => {
        const intro = this.getServerIntro(server);
        this.logger.warn(
          `${intro.name} Server Error: ${err.code} ${err.message}`
        );
        server.close(() => reject(err));
      })

      // handle client error
      .on('clientError', (err, socket) => {
        if ((err && err.code === 'ECONNRESET') || !socket || !socket.writable) {
          return;
        }
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      })

      //handle server listening event
      .on('listening', () => {
        const intro = this.getServerIntro(server);
        this.logger.info(`${intro.name} server started at ${intro.address}`);
        resolve(true);
      })

      // handle close event
      .on('close', () => {
        const intro = this.getServerIntro(server);
        this.logger.info(`${intro.name} connection closed successfully`);
      })

      //handle server request
      .on('request', scopeCallback(this.onRequest, this, server));
  }

  /**
   * returns boolean indicating if the server is listening
   */
  get listening() {
    return (
      (this.httpsServer && this.httpsServer.listening) ||
      this.httpServer.listening
    );
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
   * sets the app intance callback error handler
   * @param errorCallback app instance error callback
   */
  setErrorCallback(errorCallback: ErrorCallback) {
    this.errorCallback = errorCallback;
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
  ) {
    return this.router.options(url, callback, options);
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
  ) {
    return this.router.head(url, callback, options);
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
  ) {
    return this.router.get(url, callback, options);
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
  ) {
    return this.router.post(url, callback, options);
  }

  /**
   * stores route rules for http PUT method
   * @param url - route url
   * @param callback - route callback handler
   * @param options - route configuration object or middleware or array of middlewares
   */
  put(
    url: Url,
    callback: Callback,
    options?: Middleware | Middleware[] | CallbackOptions
  ) {
    return this.router.put(url, callback, options);
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
  ) {
    return this.router.delete(url, callback, options);
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
  ) {
    this.router.any(url, callback, options);
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
  use(
    url: Url,
    middleware: Middleware | Middleware[],
    options?: Method | Method[] | MiddlewareOptions
  ) {
    return this.router.use(url, middleware, options);
  }

  /**
   * mounts a router to the server instance
   */
  mount(baseUrl: Url, router: Router) {
    const mainRouterBasePath = this.router.getBasePath();
    const resolve = (instance: RouteInstance | MiddlewareInstance) => {
      instance[1] = join(mainRouterBasePath, baseUrl, instance[1]);
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
  listen(port?: number | { httpPort?: number; httpsPort?: number }) {
    if (this.listening) {
      this.logger.warn(
        'Server already started. You must close the server first'
      );
      return Promise.resolve(true);
    }

    this.createServers();

    let resolvedPortConfig: { httpPort?: number; httpsPort?: number } = {};
    if (isObject(port)) {
      resolvedPortConfig = port;
    } else if (port) {
      resolvedPortConfig = { httpPort: port };
    }

    const { httpPort = this.config.port, httpsPort = this.config.https.port } =
      resolvedPortConfig;

    return new Promise((resolve, reject) => {
      this.initServer(this.httpServer, resolve, reject);
      this.httpServer.listen(httpPort);
    }).then(() => {
      if (this.httpsServer !== null) {
        return new Promise((resolve, reject) => {
          this.initServer(this.httpsServer, resolve, reject);
          this.httpsServer.listen(httpsPort);
        });
      }
      return true;
    });
  }

  /**
   * closes server
   * @param callback callback function to execute when connection closes
   */
  close() {
    if (!this.listening) {
      return Promise.resolve(true);
    }

    return Promise.all([
      new Promise((resolve, reject) => {
        this.closeServer(this.httpServer, resolve, reject);
      }),
      new Promise((resolve, reject) => {
        this.closeServer(this.httpsServer, resolve, reject);
      }),
    ]).then(() => true);
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
