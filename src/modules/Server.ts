import { rServerConfig as defaultConfig } from '../.server.config';
import { BodyParser } from './BodyParser';
import { Engine } from './Engine';
import { FileServer } from './FileServer';
import { Logger } from './Logger';
import { Router } from './Router';
import * as fs from 'fs';

import {
  Http2SecureServer,
  createSecureServer as createHttp2SecureServer,
  ServerHttp2Session,
} from 'http2';

import { createServer as createHttp1SecureServer } from 'https';
import type { Server as HttpServer } from 'http';
import { createServer } from 'http';
import * as path from 'path';

import {
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
  ServerResponse,
  ServerRequest,
} from '../@types';
import { copy, scopeCallback, expandToNumeric, isObject } from '@teclone/utils';
import { AddressInfo } from 'net';
import { Wrapper } from './Wrapper';
import { EntityTooLargeException } from '../Exceptions/EntityTooLargeException';
import { config } from 'dotenv';
import { join } from 'path';
import { handleError } from './Utils';

import { Http2Request } from './Http2Request';
import { Http1Request } from './Http1Request';

import { Http1Response } from './Http1Response';
import { Http2Response } from './Http2Response';
import { DEFAULT_CONFIG_FILE } from './Constants';

export interface ServerConstructorOptions<
  Http1Rq extends typeof Http1Request,
  Http2Rq extends typeof Http2Request,
  Http1Rs extends typeof Http1Response,
  Http2Rs extends typeof Http2Response
> {
  configFile?: string;
  config?: RServerConfig;

  Http1ServerRequest?: Http1Rq;
  Http2ServerRequest?: Http2Rq;

  Http1ServerResponse?: Http1Rs;
  Http2ServerResponse?: Http2Rs;
}

export class Server<
  Http1Rq extends typeof Http1Request = typeof Http1Request,
  Http2Rq extends typeof Http2Request = typeof Http2Request,
  Http1Rs extends typeof Http1Response = typeof Http1Response,
  Http2Rs extends typeof Http2Response = typeof Http2Response
> {
  private server: HttpServer | null = null;

  private secureServer: HttpServer | Http2SecureServer | null = null;

  private entryPath: string = '';

  private config: RServerConfig = {};

  private router: Router = new Router(false);

  private mountedRouters: Router[] = [];

  private logger: Logger;

  private bodyParser: BodyParser;

  private fileServer: FileServer;

  private errorCallback: ErrorCallback | null = null;

  readonly env: Env;

  constructor(
    options?: ServerConstructorOptions<Http1Rq, Http2Rq, Http1Rs, Http2Rs>
  ) {
    const { configFile, config = {} } = options || {};

    this.entryPath = process.cwd();
    this.config = this.resolveConfig(
      this.entryPath,
      configFile || DEFAULT_CONFIG_FILE,
      config
    );

    this.env = (process.env.NODE_ENV || 'development') as Env;

    this.loadEnv(this.entryPath, this.env);

    this.logger = new Logger({
      accessLogFile: this.config.accessLog,
      errorLogFile: this.config.errorLog,
    });

    this.bodyParser = new BodyParser({
      encoding: this.config.encoding,
      tempDir: this.config.tempDir,
    });

    this.fileServer = new FileServer(this.entryPath, this.config);

    this.createServers(options);
  }

  /**
   * resolves and merges the configuration objects
   */
  private resolveConfig(
    entryPath: string,
    configFile: string,
    config?: RServerConfig
  ): RServerConfig {
    let configFromFile: RServerConfig;

    try {
      const absPath = path.resolve(entryPath, configFile);
      configFromFile = require(absPath);
    } catch (ex) {
      console.log(
        `Failed to load server configuration at ${configFile}. proceeding without it`
      );
    }

    const resolvedConfig = copy(
      {},
      defaultConfig,
      configFromFile,
      config
    ) as RServerConfig;

    // resolve to numeric value
    resolvedConfig.maxMemory = expandToNumeric(resolvedConfig.maxMemory);

    const directoriesToResolve: Array<keyof RServerConfig> = [
      'accessLog',
      'errorLog',
      'tempDir',
    ];
    directoriesToResolve.forEach((key) => {
      resolvedConfig[key as any] = path.resolve(
        entryPath,
        resolvedConfig[key as any]
      );
    });

    return resolvedConfig;
  }

  private createServers(
    opts: ServerConstructorOptions<Http1Rq, Http2Rq, Http1Rs, Http2Rs>
  ) {
    const { https } = this.config;

    // create a non secure server if https is not enabled or
    // if we should redirect http to https
    if (!https.enabled || https.enforce) {
      this.server = createServer(
        {
          IncomingMessage: opts?.Http1ServerRequest || Http1Request,
          // @ts-ignore
          ServerResponse: opts?.Http1ServerResponse || Http1Response,
        },
        null
      );
    }

    // create secure server if enabled
    if (https.enabled) {
      const credentials = Object.keys(https.credentials).reduce(
        (result, key) => {
          const value = https.credentials[key];
          result[key] =
            key === 'passphrase'
              ? value
              : fs.readFileSync(path.resolve(this.entryPath, value));
          return result;
        },
        {}
      );

      switch (https.version) {
        case '1':
          // @ts-ignore
          this.secureServer = createHttp1SecureServer(
            {
              ...credentials,
              IncomingMessage: opts?.Http1ServerRequest || Http1Request,
              // @ts-ignore
              ServerResponse: opts?.Http1ServerResponse || Http1Response,
            },
            null
          );
          break;

        default:
          this.secureServer = createHttp2SecureServer(
            {
              ...credentials,

              Http2ServerRequest: opts?.Http2ServerRequest || Http2Request,
              // @ts-ignore
              Http2ServerResponse: opts?.Http2ServerResponse || Http2Response,

              allowHTTP1: true,
            },
            null
          );
      }
    }
  }

  /**
   * server root directory
   */
  get rootDir() {
    return this.entryPath;
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
   * returns server intro
   */
  private getServerIntro(
    server: HttpServer | Http2SecureServer,
    isSecureServer?: boolean
  ) {
    const result = {
      name: isSecureServer ? 'https' : 'http',
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
    request: ServerRequest,
    response: ServerResponse
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
  private onResponseFinish(request: ServerRequest, response: ServerResponse) {
    response.endedAt = new Date();
    this.bodyParser.cleanUpTempFiles(request.files);
    this.logger.profile(request, response);
  }

  /**
   * parse all request data
   */
  private parseRequestData(request: ServerRequest, url: Url) {
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
  private onRequestEnd(request: ServerRequest, response: ServerResponse) {
    if (request.error) {
      return;
    }

    request.endedAt = response.startedAt = new Date();
    const { url } = request;

    this.parseRequestData(request, url);
    const method = request.method.toLowerCase() as Method;

    return this.cordinateRoutes(url, method, request, response).then(
      (status) => {
        if (!status) {
          return this.fileServer
            .serve(url, method, request.headers, response)
            .then((status) => {
              if (!status) {
                return this.fileServer.serveHttpErrorFile(404, response);
              }
              return true;
            });
        }
        return true;
      }
    );
  }

  /**
   * handle on request error event
   */
  private onRequestError(
    err: Error,
    request: ServerRequest,
    response: ServerResponse
  ) {
    request.error = true;
    handleError(err, response);
  }

  /**
   * handle request data event
   */
  private onRequestData(chunk: Buffer, request: ServerRequest) {
    if (!request.entityTooLarge) {
      const newEntityLength = request.buffer.length + chunk.length;
      const maxMemory = this.config.maxMemory as number;
      if (!maxMemory || newEntityLength <= maxMemory) {
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
    request: ServerRequest,
    response: ServerResponse,
    isSecureServer: boolean
  ) {
    request.startedAt = new Date();
    request.encrypted = isSecureServer;

    response.fileServer = this.fileServer;
    response.logger = this.logger;
    response.req = request;

    response.errorCallback = this.errorCallback;

    request.init(isSecureServer);

    //enforce https if set
    const httpsConfig = this.config.https;
    if (httpsConfig.enabled && !request.encrypted && httpsConfig.enforce) {
      response.redirect(
        `https://${path.join(
          request.hostname + ':' + this.address().https.port,
          request.url
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
  private closeServer(server: HttpServer | Http2SecureServer, resolve, reject) {
    if (server && server.listening) {
      server.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    } else {
      resolve(true);
    }
  }

  /**
   * binds all event handlers on the server
   */
  private initServer(
    server: HttpServer | Http2SecureServer,
    isSecureServer: boolean,
    resolve,
    reject
  ) {
    const activeSessions = new Set<ServerHttp2Session>();

    if (!server) {
      return resolve();
    }

    // store active sessions
    server
      .on('session', (session) => {
        activeSessions.add(session);
        session.on('close', () => activeSessions.delete(session));
      })

      //handle error event
      .on('error', (err: any) => {
        const intro = this.getServerIntro(server, isSecureServer);
        this.logger.warn(
          `${intro.name} Server Error: ${err.code} ${err.message}`
        );
        server.close(() => reject(err));
      })

      // handle client error
      .on('clientError', (err: any, socket) => {
        if ((err && err.code === 'ECONNRESET') || !socket || !socket.writable) {
          return;
        }
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      })

      //handle server listening event
      .on('listening', () => {
        const intro = this.getServerIntro(server, isSecureServer);
        this.logger.info(`${intro.name} server started at ${intro.address}`);
        resolve(true);
      })

      // handle close event
      .on('close', () => {
        // destroy all active sessions
        activeSessions.forEach((session) => session.close());
        activeSessions.clear();

        const intro = this.getServerIntro(server, isSecureServer);
        this.logger.info(`${intro.name} connection closed successfully`);
      })

      //handle server request
      .on('request', scopeCallback(this.onRequest, this, isSecureServer));
  }

  /**
   * returns boolean indicating if the server is listening
   */
  get listening() {
    return Boolean(this.server?.listening || this.secureServer?.listening);
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
    return this.config as Required<RServerConfig>;
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

    let resolvedPortConfig: { httpPort?: number; httpsPort?: number } = {};
    if (isObject(port)) {
      resolvedPortConfig = port;
    } else if (port) {
      resolvedPortConfig = { httpPort: port };
    }

    const { httpPort = this.config.port, httpsPort = this.config.https.port } =
      resolvedPortConfig;

    return Promise.all([
      this.server
        ? new Promise((resolve, reject) => {
            this.initServer(this.server, false, resolve, reject);
            this.server.listen(httpPort || 8000);
          })
        : Promise.resolve(null),

      this.secureServer
        ? new Promise((resolve, reject) => {
            this.initServer(this.secureServer, true, resolve, reject);
            this.secureServer.listen(httpsPort || 9000);
          })
        : Promise.resolve(null),
    ]).then(() => true);
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
        this.closeServer(this.server, resolve, reject);
      }),
      new Promise((resolve, reject) => {
        this.closeServer(this.secureServer, resolve, reject);
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

    if (this.server?.listening) {
      result.http = this.server.address() as AddressInfo;
    }
    if (this.secureServer?.listening) {
      result.https = this.secureServer.address() as AddressInfo;
    }

    return result;
  }
}
