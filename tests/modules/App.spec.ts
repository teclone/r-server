import {
  httpHost,
  dummyCallback,
  dummyMiddleware,
  httpsEnabledConfig,
  withTeardown,
  sendRequest,
} from '../helpers';
import * as path from 'path';
import * as fs from 'fs';
import { App } from '../../src/modules/App';
import { Router } from '../../src/modules/Router';
import { Method } from '../../src/@types';
import { Wrapper } from '../../src/modules/Wrapper';

describe(`App`, function () {
  let app: App = null;

  const getTemplate = (method: Exclude<Method, '*'> | 'any') => {
    return function () {
      const banner =
        'should call main router to store the given route rule for ' +
        (method === 'any'
          ? 'all http method verbs'
          : 'http ' + method.toUpperCase() + ' method');

      it(banner, function () {
        const spy = jest.spyOn(app.getRouter(), method);
        app[method]('/', dummyCallback);

        expect(spy.mock.calls[0][0]).toEqual('/');
        expect(spy.mock.calls[0][1]).toEqual(dummyCallback);

        spy.mockRestore();
      });
    };
  };

  beforeEach(function () {
    app = new App({});
  });

  describe('#constructor(config: string | Config)', function () {
    it(`should create an rserver app instance`, function () {
      expect(app).toBeInstanceOf(App);
    });

    it(`should setup https app if https is enabled`, function () {
      const app = new App({ config: httpsEnabledConfig });
      expect(app).toBeInstanceOf(App);
    });

    it(`should resolve the env settings and prioritize the value of process.env.NODE_ENV ahead of config's env value`, function () {
      process.env.NODE_ENV = 'production';
      let app = new App({ config: httpsEnabledConfig });
      expect(app.getConfig().env).toEqual('production');

      process.env.NODE_ENV = 'development';
      app = new App({ config: httpsEnabledConfig });
      expect(app.getConfig().env).toEqual('development');

      process.env.NODE_ENV = '';
    });

    it(`should resolve the env settings and prioritize the value of process.env.HTTPS_PORT ahead of config's https.port value`, function () {
      process.env.HTTPS_PORT = '6000';
      let app = new App({
        config: { https: { port: 5000, enabled: true } },
      });
      expect(app.getConfig().https.port).toEqual(6000);

      process.env.HTTPS_PORT = '';
    });
  });

  describe('#listening', function () {
    it(`should return true if https or http app is listening for requests`, function () {
      expect(app.listening).toBeFalsy();
    });
  });

  describe('#getRouter(): Router', function () {
    it(`should return the app instance main router`, function () {
      expect(app.getRouter()).toBeInstanceOf(Router);
    });
  });

  describe('#getMountedRouters(): Router[]', function () {
    it(`should return an array of the app instance mounted routers`, function () {
      expect(app.getMountedRouters()).toEqual([]);
    });
  });

  describe('#getConfig()', function () {
    it(`should return the resolved app config object`, function () {
      expect(app.getConfig()).toHaveProperty('env');
    });
  });

  describe('.setErrorCallback(errorCallback: ErrorCallback)', function () {
    it(`should set the app instance Error Callback handler`, function () {
      app.setErrorCallback((err, req, res) => {
        return res.end();
      });
    });
  });

  describe('#setBasePath(path: string)', function () {
    it(`should call the main router to set the global base path for all registered routes`, function () {
      const spy = jest.spyOn(app.getRouter(), 'setBasePath');
      app.setBasePath('api/v1');

      expect(spy.mock.calls[0][0]).toEqual('api/v1');
      spy.mockRestore();
    });
  });

  describe(
    `#options(url: Url, callback: Callback,
        options: Middleware | Middleware[] | CallbackOptions | null = null)`,
    getTemplate('options')
  );

  describe(
    `#head(url: Url, callback: Callback,
        options: Middleware | Middleware[] | CallbackOptions | null = null)`,
    getTemplate('head')
  );

  describe(
    `#get(url: Url, callback: Callback,
        options: Middleware | Middleware[] | CallbackOptions | null = null)`,
    getTemplate('get')
  );

  describe(
    `#post(url: Url, callback: Callback,
        options: Middleware | Middleware[] | CallbackOptions | null = null)`,
    getTemplate('post')
  );

  describe(
    `#put(url: Url, callback: Callback,
        options: Middleware | Middleware[] | CallbackOptions | null = null)`,
    getTemplate('put')
  );

  describe(
    `#delete(url: Url, callback: Callback,
        options: Middleware | Middleware[] | CallbackOptions | null = null)`,
    getTemplate('delete')
  );

  describe(
    `#any(url: Url, callback: Callback,
        options: Middleware | Middleware[] | CallbackOptions | null = null)`,
    getTemplate('any')
  );

  describe('#route(url: Url): Wrapper', function () {
    it(`should create and return a Route Wrapper for the given url`, function () {
      expect(app.route('user')).toBeInstanceOf(Wrapper);
    });
  });

  describe(`use(url: Url, middleware: Middleware | Middleware[],
        options: Method | Method[] | MiddlewareOptions | null = null)`, function () {
    it(`should call main router to register a middleware to be called whenever the
            given route url is visited`, function () {
      const spy = jest.spyOn(app.getRouter(), 'use');

      app.use('/', dummyMiddleware);
      expect(spy.mock.calls[0][0]).toEqual('/');
      spy.mockRestore();
    });
  });

  describe('#mount(baseUrl: Url, router: Router)', function () {
    it(`should resolve all routes registered in the mountable router and store the router
        inside the mountedRouters array`, function () {
      app.setBasePath('api/v1');
      app.get('login', dummyCallback);

      const router = new Router(true);
      router.get('/', dummyCallback);
      router.get('{id}', dummyCallback);
      router.get('{id}/posts', dummyCallback);

      app.mount('users', router);

      expect(app.getMountedRouters()).toHaveLength(1);
      expect(app.getRouter().getRoutes().get[0][1]).toEqual('api/v1/login');
      expect(app.getMountedRouters()[0].getRoutes().get[0][1]).toEqual(
        'api/v1/users'
      );
      expect(app.getMountedRouters()[0].getRoutes().get[1][1]).toEqual(
        'api/v1/users/{id}'
      );
      expect(app.getMountedRouters()[0].getRoutes().get[2][1]).toEqual(
        'api/v1/users/{id}/posts'
      );
    });
  });

  describe('#removeRoute(id: RouteId)', function () {
    it(`should find the route with the given id and remove it, returning true if route with id exists`, function () {
      const routeId = app.get('login', dummyCallback);
      expect(app.removeRoute(routeId)).toBeTruthy();
    });

    it(`should also search in mounted routers, returning true if router is found`, function () {
      const router = new Router(true);
      const routeId = router.get('profile', dummyCallback);
      app.mount('user', router);

      expect(app.removeRoute(routeId)).toBeTruthy();
    });

    it(`should also search in mounted routers, returning false if router is not found`, function () {
      const router = new Router(true);
      router.get('profile', dummyCallback);
      app.mount('user', router);

      expect(app.removeRoute(0)).toBeFalsy();
    });

    it(`should find the route with the given id and remove it, returning false if route with id does not exists`, function () {
      app.get('login', dummyCallback);
      expect(app.removeRoute(-1)).toBeFalsy();
    });
  });

  describe('#removeMiddleware(id: MiddlewareId)', function () {
    it(`should find the middleware with the given id and remove it, returning true if route with id exists`, function () {
      const middlewareId = app.use('*', dummyMiddleware);
      expect(app.removeMiddleware(middlewareId)).toBeTruthy();
    });

    it(`should also search in mounted routers, returning true if middleware exists`, function () {
      const router = new Router(true);
      const middlewareId = router.use('profile', dummyMiddleware);
      app.mount('user', router);

      expect(app.removeMiddleware(middlewareId)).toBeTruthy();
    });

    it(`should also search in mounted routers, returning false if middleware does not exist`, function () {
      const router = new Router(true);
      router.use('profile', dummyMiddleware);
      app.mount('user', router);

      expect(app.removeMiddleware(-1)).toBeFalsy();
    });

    it(`should find the middleware with the given id and remove it, returning false if middleware with id does not exist`, function () {
      app.use('*', dummyMiddleware);
      expect(app.removeMiddleware(0)).toBeFalsy();
    });
  });

  describe('#listen(port?: number | null)', function () {
    it(`should start the application at the given port, returning a promise`, function () {
      return withTeardown(
        app,
        app.listen(3000).then(() => {
          expect(app.address().http.port).toEqual(3000);
        })
      );
    });

    it(`should use the value of process.env.PORT if given and port is not given`, function () {
      process.env.PORT = '5000';
      return withTeardown(
        app,
        app.listen().then(() => {
          expect(app.address().http.port).toEqual(5000);
          process.env.PORT = '';
        })
      );
    });

    it(`should start up the https app if enabled at a default of 9000`, function () {
      const app = new App({ config: httpsEnabledConfig });
      return withTeardown(
        app,
        app.listen(3000).then(() => {
          const address = app.address();

          expect(address.http.port).toEqual(3000);
          expect(address.https.port).toEqual(9000);
        })
      );
    });

    it(`should default http port parameter to 8080 if no port is given and process.env.PORT is not
        set`, function () {
      return withTeardown(
        app,
        app.listen().then(() => {
          expect(app.address().http.port).toEqual(8080);
        })
      );
    });

    it(`should do nothing if app is already listening`, function () {
      return withTeardown(
        app,
        app
          .listen()
          .then(() => app.listen())
          .then((result) => {
            expect(result).toEqual(true);
          })
      );
    });
  });

  describe('#close()', function () {
    it(`should close and stop apps from listening for further connections`, function () {
      const app = new App({ config: httpsEnabledConfig });
      return withTeardown(
        app,
        app
          .listen()
          .then(() => {
            expect(app.listening).toBeTruthy();
            return app.close();
          })
          .then(() => {
            expect(app.listening).toBeFalsy();
          })
      );
    });

    it(`should skip closing https app if it is not enabled`, function () {
      return withTeardown(
        app,
        app
          .listen()
          .then(() => {
            expect(app.listening).toBeTruthy();
            return app.close();
          })
          .then(() => {
            expect(app.listening).toBeFalsy();
          })
      );
    });

    it(`should do nothing if app is not listening`, function () {
      return app.close().then((result) => {
        expect(result).toEqual(true);
      });
    });
  });

  describe('#address(): {http: AddressInfo | null, https: AddressInfo | null}', function () {
    it(`should return app address info that contains info for both http and https
            app`, function () {
      const address = app.address();
      expect(address).toHaveProperty('http');
      expect(address).toHaveProperty('https');
    });

    it(`each app address should be null when it is not listening for connections`, function () {
      const address = app.address();
      expect(address.http).toBeNull();
      expect(address.https).toBeNull();
    });

    it(`each app address should be an AddressInfo when it is listening for connections`, function () {
      const app = new App({ config: httpsEnabledConfig });
      return withTeardown(
        app,
        app.listen().then(() => {
          expect(app.address().http).not.toBeNull();
          expect(app.address().https).not.toBeNull();
        })
      );
    });
  });

  describe('App Error', function () {
    // it(`should handle app error such as trying to listen on an already taken port and
    //     log warning message to the console`, function () {
    //   const app2 = new App({});
    //   app.listen(null, function () {
    //     expect(function () {
    //       app2.listen(null);
    //     }).not.toThrow();
    //     closeApp(app, done);
    //   });
    // });
  });

  describe('Client Error', function () {
    it(`should handle every client error on the app by simply ending the socket`, function () {
      return withTeardown(
        app,
        app.listen().then(() => {
          // @ts-ignore
          app.httpServer.emit('clientError');
        })
      );
      // app.listen(null, function() {
      //   expect(function() {
      //     app.httpApp.emit('clientError');
      //     closeApp(app, done);
      //   }).not.toThrow();
      // });
    });
  });

  describe('Request Error', function () {
    it(`should handle every request error on the app, ending the request`, function () {
      const app = new App({
        config: {
          env: 'production',
        },
      });
      app.get('say-hi', (req, res) => {
        req.emit('error', new Error('request error'));
        return res.end();
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({ uri: `${httpHost}say-hi` }).then((res) => {
            expect(res.statusCode).toEqual(400);
          });
        })
      );
    });
  });

  describe('413 Response code', function () {
    it(`should send 413 error code if request data exceeds app maxMemory value`, function () {
      const app = new App({
        config: {
          maxMemory: 10,
        },
      });
      const form = {
        name: 'Harrison',
        password: 'passwd_243',
      };
      app.post('/process-data', (req, res) => {
        return res.json(req.body);
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({
            uri: `${httpHost}process-data`,
            method: 'post',
            form,
          }).then((res) => {
            expect(res.statusCode).toEqual(413);
          });
        })
      );
    });

    // it(`should send 413 error code if request data exceeds app maxMemory value`, function () {
    //   const app = new App({
    //     config: {
    //       maxMemory: 10,
    //     },
    //   });
    //   app.post('/process-data', (req, res) => {
    //     return res.json(req.body);
    //   });

    //   return withTeardown(
    //     app,
    //     app.listen().then(() => {
    //       return sendRequest({
    //         uri: `${httpHost}process-data`,
    //         method: 'post',
    //         formData: {
    //           cv: fs.createReadStream(
    //             path.resolve(__dirname, '../helpers/multipart.log')
    //           ),
    //         },
    //       }).then((res) => {
    //         expect(res.statusCode).toEqual(413);
    //       });
    //     })
    //   );
    // });
  });

  describe(`enforce https`, function () {
    it(`should enforce https by redirecting all http requests to the https address`, function () {
      const app = new App({
        config: {
          https: {
            enabled: true,
            enforce: true,
          },
        },
      });

      app.get('/say-protocol', (req, res) => {
        return res.end(req.encrypted ? 'https' : 'http');
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({
            uri: `${httpHost}say-protocol`,
            rejectUnauthorized: false,
          }).then((res) => {
            expect(res.body).toEqual('https');
          });
        })
      );
    });
  });

  describe(`serve static file`, function () {
    it(`should serve static public file if file exists`, function () {
      const filePath = path.resolve(__dirname, '../../public/index.html');

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({ uri: `${httpHost}index.html` }).then((res) => {
            expect(res.body).toEqual(fs.readFileSync(filePath, 'utf8'));
          });
        })
      );
    });
  });

  describe(`serve 404 http error file`, function () {
    it(`should serve 404 http error file if request path does not exist`, function () {
      const filePath = path.resolve(__dirname, '../../src/httpErrors/404.html');

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({ uri: `${httpHost}index1.html` }).then((res) => {
            expect(res.body).toEqual(fs.readFileSync(filePath, 'utf8'));
          });
        })
      );
    });
  });

  describe(`parse request body`, function () {
    it(`should parse request body, and make them available as body, data and files property
        on the request object`, function () {
      const form = {
        name: 'Harrison',
        password: 'passwd_243',
      };
      app.post('/check-data', (req, res) => {
        return res.json(req.body);
      });

      return withTeardown(
        app,
        app.listen().then(() => {
          return sendRequest({
            uri: `${httpHost}check-data`,
            method: 'post',
            form,
          }).then((res) => {
            expect(JSON.parse(res.body)).toEqual(form);
          });
        })
      );
    });
  });

  describe('routing', () => {
    const routeRequests = (app: App, uri: string) => {
      return withTeardown(
        app,
        app
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
          })
      );
    };

    describe('main routing', function () {
      it(`should start the routing engine on the main router if request path did not map
        to a public file, and run the matching registered all method route if any`, function () {
        app.any('/hi', function (req, res) {
          return res.end();
        });

        const uri = `${httpHost}hi`;

        return routeRequests(app, uri);
      });

      it(`should start the routing engine on the main router if request path did not map
        to a public file, and run the matching registered all method route if any`, function () {
        const callback = (req, res) => {
          return res.end();
        };
        app.get('/hi', callback);
        app.post('/hi', callback);
        app.put('/hi', callback);
        app.delete('/hi', callback);
        app.head('/hi', callback);
        app.options('/hi', callback);

        const uri = `${httpHost}hi`;

        return routeRequests(app, uri);
      });
    });

    describe('mounted routing', function () {
      it(`should start the routing engine on the mounted routers if request path did not map
        to a public file, and did not get resolved by the main router, and run the matching registered all method route if any`, function () {
        const router = new Router(false);

        router.any('/{id}', function (req, res) {
          return res.end();
        });

        app.mount('users', router);

        const uri = `${httpHost}users/1`;

        return routeRequests(app, uri);
      });

      it(`should start the routing engine on the mounted routers if request path did not map
        to a public file and was not resolved by the main router, and run the matching registered route for the current request method,
        if all routes fails`, function () {
        const callback = (req, res) => {
          return res.end();
        };
        const router = new Router(true);

        router.get('/{id}', callback);
        router.post('/{id}', callback);
        router.put('/{id}', callback);
        router.delete('/{id}', callback);
        router.head('/{id}', callback);
        router.options('/{id}', callback);

        app.mount('users', router);

        const uri = `${httpHost}users/1`;
        return routeRequests(app, uri);
      });
    });
  });
});
