import {
  httpHost,
  dummyCallback,
  dummyMiddleware,
  httpsEnabledConfig,
  sendRequest,
} from '../helpers';
import * as path from 'path';
import * as fs from 'fs';
import { Router } from '../../src/modules/Router';
import { Method } from '../../src/@types';
import { Wrapper } from '../../src/modules/Wrapper';
import { Server } from '../../src/modules/Server';

describe(`Server`, function () {
  let server: Server;

  const getTemplate = (method: Exclude<Method, '*'> | 'any') => {
    return function () {
      const banner =
        'should call main router to store the given route rule for ' +
        (method === 'any'
          ? 'all http method verbs'
          : 'http ' + method.toUpperCase() + ' method');

      it(banner, function () {
        const spy = jest.spyOn(server.getRouter(), method);
        server[method]('/', dummyCallback);

        expect(spy.mock.calls[0][0]).toEqual('/');
        expect(spy.mock.calls[0][1]).toEqual(dummyCallback);

        spy.mockRestore();
      });
    };
  };

  beforeEach(function () {
    server = new Server();
  });

  afterEach(() => {
    return server.close();
  });

  describe('#constructor(options?: ServerConstructorOptions<Rq, Rs>)', function () {
    it(`should create an rserver app instance`, function () {
      expect(server).toBeInstanceOf(Server);
    });

    it(`should setup https app if https is enabled`, function () {
      const server = new Server({ config: httpsEnabledConfig });
      expect(server).toBeInstanceOf(Server);
    });

    it(`should resolve env to process.env.NODE_ENV if set`, function () {
      process.env.NODE_ENV = 'production';
      let server = new Server({ config: httpsEnabledConfig });
      expect(server.env).toEqual('production');

      process.env.NODE_ENV = 'development';
      server = new Server({ config: httpsEnabledConfig });
      expect(server.env).toEqual('development');

      process.env.NODE_ENV = '';
    });
  });

  describe('#listening', function () {
    it(`should return true if https or http app is listening for requests`, function () {
      expect(server.listening).toBeFalsy();
    });
  });

  describe('#getRouter(): Router', function () {
    it(`should return the app instance main router`, function () {
      expect(server.getRouter()).toBeInstanceOf(Router);
    });
  });

  describe('#getMountedRouters(): Router[]', function () {
    it(`should return an array of the app instance mounted routers`, function () {
      expect(server.getMountedRouters()).toEqual([]);
    });
  });

  describe('#getConfig()', function () {
    it(`should return the resolved app config object`, function () {
      expect(server.getConfig()).toHaveProperty('accessLog');
    });
  });

  describe('.setErrorCallback(errorCallback: ErrorCallback)', function () {
    it(`should set the app instance Error Callback handler`, function () {
      server.setErrorCallback((err, req, res) => {
        return res.end();
      });
    });
  });

  describe('#setBasePath(path: string)', function () {
    it(`should call the main router to set the global base path for all registered routes`, function () {
      const spy = jest.spyOn(server.getRouter(), 'setBasePath');
      server.setBasePath('api/v1');

      expect(spy.mock.calls[0][0]).toEqual('api/v1');
      spy.mockRestore();
    });
  });

  describe(
    `#options(url: Url, callback: Callback, use?: Middleware | Middleware[])`,
    getTemplate('options')
  );

  describe(
    `#head(url: Url, callback: Callback, use?: Middleware | Middleware[])`,
    getTemplate('head')
  );

  describe(
    `#get(url: Url, callback: Callback, use?: Middleware | Middleware[])`,
    getTemplate('get')
  );

  describe(
    `#post(url: Url, callback: Callback, use?: Middleware | Middleware[])`,
    getTemplate('post')
  );

  describe(
    `#put(url: Url, callback: Callback, use?: Middleware | Middleware[])`,
    getTemplate('put')
  );

  describe(
    `#delete(url: Url, callback: Callback, use?: Middleware | Middleware[])`,
    getTemplate('delete')
  );

  describe(
    `#any(url: Url, callback: Callback, use?: Middleware | Middleware[])`,
    getTemplate('any')
  );

  describe('#route(url: Url): Wrapper', function () {
    it(`should create and return a Route Wrapper for the given url`, function () {
      expect(server.route('user')).toBeInstanceOf(Wrapper);
    });
  });

  describe(`use(url: Url, middleware: Middleware | Middleware[],
        options: Method | Method[] | MiddlewareOptions | null = null)`, function () {
    it(`should call main router to register a middleware to be called whenever the
            given route url is visited`, function () {
      const spy = jest.spyOn(server.getRouter(), 'use');

      server.use('/', dummyMiddleware);
      expect(spy.mock.calls[0][0]).toEqual('/');
      spy.mockRestore();
    });
  });

  describe('#mount(baseUrl: Url, router: Router)', function () {
    it(`should resolve all routes registered in the mountable router and store the router
        inside the mountedRouters array`, function () {
      server.setBasePath('api/v1');
      server.get('login', dummyCallback);

      const router = new Router({ inheritMiddlewares: true });
      router.get('/', dummyCallback);
      router.get('{id}', dummyCallback);
      router.get('{id}/posts', dummyCallback);

      server.mount('users', router);

      expect(server.getMountedRouters()).toHaveLength(1);
      expect(server.getRouter().getRoutes().get[0][1]).toEqual('api/v1/login');
      expect(server.getMountedRouters()[0].getRoutes().get[0][1]).toEqual(
        'api/v1/users'
      );
      expect(server.getMountedRouters()[0].getRoutes().get[1][1]).toEqual(
        'api/v1/users/{id}'
      );
      expect(server.getMountedRouters()[0].getRoutes().get[2][1]).toEqual(
        'api/v1/users/{id}/posts'
      );
    });
  });

  describe('#removeRoute(id: RouteId)', function () {
    it(`should find the route with the given id and remove it, returning true if route with id exists`, function () {
      const routeId = server.get('login', dummyCallback);
      expect(server.removeRoute(routeId)).toBeTruthy();
    });

    it(`should also search in mounted routers, returning true if router is found`, function () {
      const router = new Router({ inheritMiddlewares: true });
      const routeId = router.get('profile', dummyCallback);
      server.mount('user', router);

      expect(server.removeRoute(routeId)).toBeTruthy();
    });

    it(`should also search in mounted routers, returning false if router is not found`, function () {
      const router = new Router({ inheritMiddlewares: true });
      router.get('profile', dummyCallback);
      server.mount('user', router);

      expect(server.removeRoute(0)).toBeFalsy();
    });

    it(`should find the route with the given id and remove it, returning false if route with id does not exists`, function () {
      server.get('login', dummyCallback);
      expect(server.removeRoute(-1)).toBeFalsy();
    });
  });

  describe('#removeMiddleware(id: MiddlewareId)', function () {
    it(`should find the middleware with the given id and remove it, returning true if route with id exists`, function () {
      const middlewareId = server.use('*', dummyMiddleware);
      expect(server.removeMiddleware(middlewareId)).toBeTruthy();
    });

    it(`should also search in mounted routers, returning true if middleware exists`, function () {
      const router = new Router({ inheritMiddlewares: true });
      const middlewareId = router.use('profile', dummyMiddleware);
      server.mount('user', router);

      expect(server.removeMiddleware(middlewareId)).toBeTruthy();
    });

    it(`should also search in mounted routers, returning false if middleware does not exist`, function () {
      const router = new Router({ inheritMiddlewares: true });
      router.use('profile', dummyMiddleware);
      server.mount('user', router);

      expect(server.removeMiddleware(-1)).toBeFalsy();
    });

    it(`should find the middleware with the given id and remove it, returning false if middleware with id does not exist`, function () {
      server.use('*', dummyMiddleware);
      expect(server.removeMiddleware(0)).toBeFalsy();
    });
  });

  describe('#listen(port?: number | null)', function () {
    it(`should start the application at the given port, returning a promise`, function () {
      return server.listen(3000).then(() => {
        expect(server.address().http?.port).toEqual(3000);
      });
    });

    it(`should start up the https app if enabled at a default port of 9000`, function () {
      server = new Server({ config: httpsEnabledConfig });
      return server.listen(3000).then(() => {
        const address = server.address();
        expect(address.https?.port).toEqual(9000);
      });
    });

    it(`should default http port parameter to 8000 if no port is set`, function () {
      return server.listen().then(() => {
        expect(server.address().http?.port).toEqual(8000);
      });
    });

    it(`should do nothing if app is already listening`, function () {
      return server
        .listen()
        .then(() => server.listen())
        .then((result) => {
          expect(result).toEqual(true);
        });
    });
  });

  describe('#close()', function () {
    it(`should close and stop apps from listening for further connections`, function () {
      const server = new Server({ config: httpsEnabledConfig });
      return server
        .listen()
        .then(() => {
          expect(server.listening).toBeTruthy();
          return server.close();
        })
        .then(() => {
          expect(server.listening).toBeFalsy();
        });
    });

    it(`should skip closing https app if it is not enabled`, function () {
      return server
        .listen()
        .then(() => {
          expect(server.listening).toBeTruthy();
          return server.close();
        })
        .then(() => {
          expect(server.listening).toBeFalsy();
        });
    });

    it(`should do nothing if app is not listening`, function () {
      return server.close().then((result) => {
        expect(result).toEqual(true);
      });
    });
  });

  describe('#address(): {http: AddressInfo | null, https: AddressInfo | null}', function () {
    it(`should return app address info that contains info for both http and https
            app`, function () {
      const address = server.address();
      expect(address).toHaveProperty('http');
      expect(address).toHaveProperty('https');
    });

    it(`each app address should be null when it is not listening for connections`, function () {
      const address = server.address();
      expect(address.http).toBeNull();
      expect(address.https).toBeNull();
    });

    it(`each app address should be an AddressInfo when it is listening for connections`, function () {
      server = new Server({
        config: { https: { enabled: true, enforce: true } },
      });
      return server.listen().then(() => {
        expect(server.address().http).not.toBeNull();
        expect(server.address().https).not.toBeNull();
      });
    });
  });

  describe('Listen Errors', function () {
    it(`should reject with error if listen operation fails for any reason`, function () {
      const server2 = new Server({});

      return server
        .listen()
        .then(() => {
          expect(server.listening).toBeTruthy();
          return expect(server2.listen()).rejects.toThrow();
        })
        .then(() => {
          expect(server2.listening).toEqual(false);
        });
    });

    it(`should avoid listening again if server is already listening, and log warning to console (dev mode only)`, function () {
      return server.listen().then(() => {
        expect(server.listening).toBeTruthy();
        return expect(server.listen()).resolves.toEqual(true);
      });
    });
  });

  describe('Request Error', function () {
    it(`should handle every request error on the server, ending the request`, function () {
      server.get('say-hi', (req, res) => {
        req.emit('error', new Error('request error'));
        return res.end();
      });

      return server.listen().then(async () => {
        return expect(
          sendRequest({ uri: `${httpHost}say-hi` })
        ).rejects.toHaveProperty('statusCode', 400);
      });
    });
  });

  describe('413 Response code', function () {
    it(`should send 413 error code if request data exceeds app maxMemory value`, function () {
      server = new Server({
        config: {
          maxMemory: 10,
        },
      });

      const form = {
        name: 'Harrison',
        password: 'passwd_243',
      };

      server.post('/process-data', (req, res) => {
        return res.json(req.data);
      });

      return server.listen().then(async () => {
        return expect(
          sendRequest({
            uri: `${httpHost}process-data`,
            method: 'post',
            form,
          })
        ).rejects.toMatchObject({
          statusCode: 413,
        });
      });
    });
  });

  describe(`enforce https`, function () {
    it(`should enforce https by redirecting all http requests to the https address`, function () {
      server = new Server({
        config: {
          https: {
            enabled: true,
            enforce: true,
          },
        },
      });

      server.get('/say-protocol', (req, res) => {
        return res.end(req.encrypted ? 'https' : 'http');
      });

      return server.listen().then(() => {
        return sendRequest({
          uri: `${httpHost}say-protocol`,
          rejectUnauthorized: false,
        }).then((res) => {
          expect(res.body).toEqual('https');
        });
      });
    });
  });

  describe(`serve static file`, function () {
    it(`should serve static public file if file exists`, function () {
      const filePath = path.resolve(__dirname, '../../public/index.html');
      return server.listen().then(() => {
        return sendRequest({ uri: `${httpHost}index.html` }).then((res) => {
          expect(res.body).toEqual(fs.readFileSync(filePath, 'utf8'));
        });
      });
    });
  });

  describe(`serve 404 http error file`, function () {
    it(`should serve 404 http error file if request path does not exist`, function () {
      const filePath = path.resolve(__dirname, '../../src/httpErrors/404.html');
      return server.listen().then(() => {
        return expect(
          sendRequest({ uri: `${httpHost}index1.html` })
        ).rejects.toMatchObject({
          response: {
            body: fs.readFileSync(filePath, { encoding: 'utf-8' }),
          },
        });
      });
    });
  });

  describe(`parse request body`, function () {
    it(`should parse request body, and make them available as body, data and files property
        on the request object`, function () {
      const form = {
        name: 'Harrison',
        password: 'passwd_243',
      };
      server.post('/check-data', (req, res) => {
        return res.json(req.data);
      });

      return server.listen().then(() => {
        return sendRequest({
          uri: `${httpHost}check-data`,
          method: 'post',
          form,
        }).then((res) => {
          expect(JSON.parse(res.body)).toEqual(form);
        });
      });
    });
  });

  describe('routing', () => {
    const routeRequests = (uri: string) => {
      return server
        .listen()
        .then(() => {
          return sendRequest({ uri, method: 'get' }).then((res) => {
            expect(res.statusCode).toEqual(200);
          });
        })
        .then(() => {
          return sendRequest({ uri, method: 'post' }).then((res) => {
            expect(res.statusCode).toEqual(200);
          });
        })
        .then(() => {
          return sendRequest({ uri, method: 'put' }).then((res) => {
            expect(res.statusCode).toEqual(200);
          });
        })
        .then(() => {
          return sendRequest({ uri, method: 'head' }).then((res) => {
            expect(res.statusCode).toEqual(200);
          });
        })
        .then(() => {
          return sendRequest({ uri, method: 'delete' }).then((res) => {
            expect(res.statusCode).toEqual(200);
          });
        })
        .then(() => {
          return sendRequest({ uri, method: 'options' }).then((res) => {
            expect(res.statusCode).toEqual(200);
          });
        });
    };

    describe('main routing', function () {
      it(`should start the routing engine on the main router if request path did not map
        to a public file, and run the matching registered all method route if any`, function () {
        server.any('/hi', function (req, res) {
          return res.end();
        });

        const uri = `${httpHost}hi`;

        return routeRequests(uri);
      });

      it(`should start the routing engine on the main router if request path did not map
        to a public file, and run the matching registered all method route if any`, function () {
        const callback = (req, res) => {
          return res.end();
        };
        server.get('/hi', callback);
        server.post('/hi', callback);
        server.put('/hi', callback);
        server.delete('/hi', callback);
        server.head('/hi', callback);
        server.options('/hi', callback);

        const uri = `${httpHost}hi`;

        return routeRequests(uri);
      });
    });

    describe('mounted routing', function () {
      it(`should start the routing engine on the mounted routers if request path did not map
        to a public file, and did not get resolved by the main router, and run the matching registered all method route if any`, function () {
        const router = new Router({ inheritMiddlewares: false });

        router.any('/{id}', function (req, res) {
          return res.end();
        });

        server.mount('users', router);

        const uri = `${httpHost}users/1`;

        return routeRequests(uri);
      });

      it(`should start the routing engine on the mounted routers if request path did not map
        to a public file and was not resolved by the main router, and run the matching registered route for the current request method,
        if all routes fails`, function () {
        const callback = (req, res) => {
          return res.end();
        };
        const router = new Router({ inheritMiddlewares: true });

        router.get('/{id}', callback);
        router.post('/{id}', callback);
        router.put('/{id}', callback);
        router.delete('/{id}', callback);
        router.head('/{id}', callback);
        router.options('/{id}', callback);

        server.mount('users', router);

        const uri = `${httpHost}users/1`;
        return routeRequests(uri);
      });
    });
  });
});
