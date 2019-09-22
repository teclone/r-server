import { httpHost, dummyCallback, dummyMiddleware, closeServer, httpsEnabledConfig } from '../helpers';
import request from 'request';
import * as path from 'path';
import * as fs from 'fs';
import App from '../../src/modules/App';
import Router from '../../src/modules/Router';
import { Method } from '../../src/@types';
import Wrapper from '../../src/modules/Wrapper';

describe(`App`, function() {
  let app: App = null;

  const getTemplate = (method: Method) => {
    return function() {
      const banner =
        'should call main router to store the given route rule for ' +
        (method === 'all' ? 'all http method verbs' : 'http ' + method.toUpperCase() + ' method');

      it(banner, function() {
        const spy = jest.spyOn(app.getRouter(), method);
        app[method]('/', dummyCallback);

        expect(spy.mock.calls[0][0]).toEqual('/');
        expect(spy.mock.calls[0][1]).toEqual(dummyCallback);

        spy.mockRestore();
      });
    };
  };

  beforeEach(function() {
    app = new App({});
  });

  describe('#constructor(config: string | Config)', function() {
    it(`should create an Rapp instance`, function() {
      expect(app).toBeInstanceOf(App);
    });

    it(`should setup https app if https is enabled`, function() {
      const app = new App(httpsEnabledConfig);
      expect(app).toBeInstanceOf(App);
    });

    it(`should resolve the env settings and prioritize the value of process.env.NODE_ENV
        if set ahead of config's env value`, function() {
      process.env.NODE_ENV = 'production';
      let app = new App(httpsEnabledConfig);
      expect(app.getConfig().env).toEqual('prod');

      process.env.NODE_ENV = 'development';
      app = new App(httpsEnabledConfig);
      expect(app.getConfig().env).toEqual('dev');

      process.env.NODE_ENV = '';
    });

    it(`should resolve the env settings and prioritize the value of process.env.HTTPS_PORT
        if set ahead of config's https.port value`, function() {
      process.env.HTTPS_PORT = '6000';
      let app = new App({ https: { port: 5000, enabled: true } });
      expect(app.getConfig().https.port).toEqual(6000);

      process.env.HTTPS_PORT = '';
    });
  });

  describe('#listening', function() {
    it(`should return true if https or http app is listening for connection`, function() {
      expect(app.listening).toBeFalsy();
    });
  });

  describe('#getRouter(): Router', function() {
    it(`should return the app instance main router`, function() {
      expect(app.getRouter()).toBeInstanceOf(Router);
    });
  });

  describe('#getMountedRouters(): Router[]', function() {
    it(`should return an array of the app instance mounted routers`, function() {
      expect(app.getMountedRouters()).toEqual([]);
    });
  });

  describe('#getConfig()', function() {
    it(`should return the resolved app config object`, function() {
      expect(app.getConfig()).toHaveProperty('env');
    });
  });

  describe('#setBasePath(path: string)', function() {
    it(`should call the main router to set the global base path for all registered routes`, function() {
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
    `#all(url: Url, callback: Callback,
        options: Middleware | Middleware[] | CallbackOptions | null = null)`,
    getTemplate('all')
  );

  describe('#route(url: Url): Wrapper', function() {
    it(`should create and return a Route Wrapper for the given url`, function() {
      expect(app.route('user')).toBeInstanceOf(Wrapper);
    });
  });

  describe(`use(url: Url, middleware: Middleware | Middleware[],
        options: Method | Method[] | MiddlewareOptions | null = null)`, function() {
    it(`should call main router to register a middleware to be called whenever the
            given route url is visited`, function() {
      const spy = jest.spyOn(app.getRouter(), 'use');

      app.use('/', dummyMiddleware);
      expect(spy.mock.calls[0][0]).toEqual('/');
      spy.mockRestore();
    });
  });

  describe('#mount(baseUrl: Url, router: Router)', function() {
    it(`should resolve all routes registered in the mountable router and store the router
        inside the mountedRouters array`, function() {
      app.setBasePath('api/v1');
      app.get('login', dummyCallback);

      const router = new Router(true);
      router.get('/', dummyCallback);
      router.get('{id}', dummyCallback);
      router.get('{id}/posts', dummyCallback);

      app.mount('users', router);

      expect(app.getMountedRouters()).toHaveLength(1);
      expect(app.getRouter().getRoutes().get[0][1]).toEqual('api/v1/login');
      expect(app.getMountedRouters()[0].getRoutes().get[0][1]).toEqual('api/v1/users');
      expect(app.getMountedRouters()[0].getRoutes().get[1][1]).toEqual('api/v1/users/{id}');
      expect(app.getMountedRouters()[0].getRoutes().get[2][1]).toEqual('api/v1/users/{id}/posts');
    });
  });

  describe('#removeRoute(id: RouteId)', function() {
    it(`should find the route with the given id and remove it, returning true if route with id exists`, function() {
      const routeId = app.get('login', dummyCallback);
      expect(app.removeRoute(routeId)).toBeTruthy();
    });

    it(`should also search in mounted routers, returning true if router is found`, function() {
      const router = new Router(true);
      const routeId = router.get('profile', dummyCallback);
      app.mount('user', router);

      expect(app.removeRoute(routeId)).toBeTruthy();
    });

    it(`should also search in mounted routers, returning false if router is not found`, function() {
      const router = new Router(true);
      router.get('profile', dummyCallback);
      app.mount('user', router);

      expect(app.removeRoute(0)).toBeFalsy();
    });

    it(`should find the route with the given id and remove it, returning false if route with id does not exists`, function() {
      app.get('login', dummyCallback);
      expect(app.removeRoute(-1)).toBeFalsy();
    });
  });

  describe('#removeMiddleware(id: MiddlewareId)', function() {
    it(`should find the middleware with the given id and remove it, returning true if route with id exists`, function() {
      const middlewareId = app.use('*', dummyMiddleware);
      expect(app.removeMiddleware(middlewareId)).toBeTruthy();
    });

    it(`should also search in mounted routers, returning true if middleware exists`, function() {
      const router = new Router(true);
      const middlewareId = router.use('profile', dummyMiddleware);
      app.mount('user', router);

      expect(app.removeMiddleware(middlewareId)).toBeTruthy();
    });

    it(`should also search in mounted routers, returning false if middleware does not exist`, function() {
      const router = new Router(true);
      router.use('profile', dummyMiddleware);
      app.mount('user', router);

      expect(app.removeMiddleware(-1)).toBeFalsy();
    });

    it(`should find the middleware with the given id and remove it, returning false if middleware with id does not exist`, function() {
      app.use('*', dummyMiddleware);
      expect(app.removeMiddleware(0)).toBeFalsy();
    });
  });

  describe('#listen(port?: number | null, callback: ListenerCallback = () => {})', function() {
    it(`should start the application at the given port, calling the callback method once the
            app gets started`, function(done) {
      app.listen(3000, () => {
        expect(app.address().http.port).toEqual(3000);
        closeServer(app, done);
      });
    });

    it(`should use the value of process.env.PORT if set over any given port parameter`, function(done) {
      process.env.PORT = '5000';
      app.listen(3000, () => {
        expect(app.address().http.port).toEqual(5000);
        process.env.PORT = '';
        closeServer(app, done);
      });
    });

    it(`should start up the https app if enabled at a default of 9000`, function(done) {
      const app = new App(httpsEnabledConfig);
      app.listen(3000, () => {
        expect(app.address().http.port).toEqual(3000);
        expect(app.address().https.port).toEqual(9000);
        closeServer(app, done);
      });
    });

    it(`should default http port parameter to 8000 if no port is given and process.env.PORT is not
        set`, function(done) {
      app.listen(null, () => {
        expect(app.address().http.port).toEqual(8000);
        closeServer(app, done);
      });
    });

    it(`should default callback argument to a dummy callback if not provided`, function(done) {
      const close = () => {
        if (app.listening) {
          closeServer(app, done);
        } else {
          schedule();
        }
      };
      const schedule = () => {
        setTimeout(close, 20);
      };

      app.listen();
      schedule();
    });

    it(`should do nothing if app is already listening`, function(done) {
      app.listen(null, () => {
        expect(function() {
          app.listen();
        }).not.toThrow();
        closeServer(app, done);
      });
    });
  });

  describe('#close(callback: ListenerCallback = () => {})', function() {
    it(`should close and stop apps from listening for further connections`, function(done) {
      const app = new App(httpsEnabledConfig);
      app.listen(null, () => {
        expect(app.listening).toBeTruthy();
        app.close(() => {
          expect(app.listening).toBeFalsy();
          done();
        });
      });
    });

    it(`should skip closing https app if it is not enabled`, function(done) {
      app.listen(null, () => {
        expect(app.listening).toBeTruthy();
        app.close(() => {
          expect(app.listening).toBeFalsy();
          done();
        });
      });
    });

    it(`should default callback to a dummy callback if not provided`, function(done) {
      const close = () => {
        if (!app.listening) {
          done();
        } else {
          schedule();
        }
      };

      const schedule = () => {
        setTimeout(close, 20);
      };

      app.listen(null, () => {
        app.close();
        schedule();
      });
    });

    it(`should do nothing if app is not listening`, function() {
      expect(function() {
        app.close();
      }).not.toThrow();
    });
  });

  describe('#address(): {http: AddressInfo | null, https: AddressInfo | null}', function() {
    it(`should return app address info that contains info for both http and https
            app`, function() {
      const address = app.address();
      expect(address).toHaveProperty('http');
      expect(address).toHaveProperty('https');
    });

    it(`each app address should be null when it is not listening for connections`, function() {
      const address = app.address();
      expect(address.http).toBeNull();
      expect(address.https).toBeNull();
    });

    it(`each app address should be an AddressInfo when it is listening for connections`, function(done) {
      const app = new App(httpsEnabledConfig);
      app.listen(null, () => {
        expect(app.address().http).not.toBeNull();
        expect(app.address().https).not.toBeNull();

        closeServer(app, done);
      });
    });
  });

  describe('App Error', function() {
    it(`should handle app error such as trying to listen on an already taken port and
        log warning message to the console`, function(done) {
      const app2 = new App({});
      app.listen(null, function() {
        expect(function() {
          app2.listen(null);
        }).not.toThrow();
        closeServer(app, done);
      });
    });
  });

  // describe('Client Error', function() {
  //     it (`should handle every client error on the app by simply ending the socket`, function(done) {
  //         app.listen(null, function() {
  //             expect(function() {
  //                 app.httpApp.emit('clientError');
  //                 closeServer(app, done);
  //             }).not.toThrow();
  //         });
  //     });
  // });

  describe('Request Error', function() {
    it(`should handle every request error on the app by simply ending the response`, function(done) {
      const app = new App({
        env: 'prod',
      });

      app.get('say-hi', (req, res) => {
        expect(function() {
          req.emit('error', 'something went bad');
        }).not.toThrow();
        return res.end();
      });

      app.listen(null, function() {
        request.get(`${httpHost}say-hi`, (err, res) => {
          expect(res.statusCode).toEqual(500);
          closeServer(app, done);
        });
      });
    });
  });

  describe('Response Error', function() {
    it(`should handle every response error on the app by simply ending the response`, function(done) {
      const app = new App({
        env: 'prod',
      });

      app.get('say-hi', (req, res) => {
        expect(function() {
          res.emit('error', 'something went bad');
        }).not.toThrow();
        return res.end();
      });

      app.listen(null, function() {
        request.get(`${httpHost}say-hi`, (err, res) => {
          expect(res.statusCode).toEqual(500);
          closeServer(app, done);
        });
      });
    });
  });

  describe('413 Response code', function() {
    it(`should send 413 error code if request data exceeds app maxMemory value`, function(done) {
      const app = new App({
        maxMemory: 10,
      });
      const form = {
        name: 'Harrison',
        password: 'passwd_243',
      };
      app.post('/process-data', (req, res) => {
        return res.json(req.body);
      });
      app.listen(null, function() {
        request.post(`${httpHost}process-data`, { form }, (err, res) => {
          expect(res.statusCode).toEqual(413);
          closeServer(app, done);
        });
      });
    });
  });

  describe(`enforce https`, function() {
    it(`should enforce https by redirecting all http requests to the https address`, function(done) {
      const app = new App({
        https: {
          enabled: true,
          enforce: true,
        },
      });

      app.get('/say-protocol', (req, res) => {
        return res.end(req.encrypted ? 'https' : 'http');
      });

      app.listen(null, function() {
        request(`${httpHost}say-protocol`, { rejectUnauthorized: false }, (err, res, body) => {
          expect(body).toEqual('https');
          closeServer(app, done);
        });
      });
    });
  });

  describe(`serve static file`, function() {
    it(`should serve static public file if file exists`, function(done) {
      const filePath = path.resolve(__dirname, '../../public/index.html');
      app.listen(null, function() {
        request.get(`${httpHost}index.html`, null, (err, res, body) => {
          expect(body).toEqual(fs.readFileSync(filePath, 'utf8'));
          closeServer(app, done);
        });
      });
    });
  });

  describe(`serve 404 http error file`, function() {
    it(`should serve 404 http error file if request path does not exist`, function(done) {
      const filePath = path.resolve(__dirname, '../../src/httpErrors/404.html');
      app.listen(null, function() {
        request.get(`${httpHost}index1.html`, null, (err, res, body) => {
          expect(body).toEqual(fs.readFileSync(filePath, 'utf8'));
          closeServer(app, done);
        });
      });
    });
  });

  describe(`parse request body`, function() {
    it(`should parse request body, and make them available as body, data and files property
        on the request object`, function(done) {
      const form = {
        name: 'Harrison',
        password: 'passwd_243',
      };
      app.post('/check-data', (req, res) => {
        return res.json(req.body);
      });
      app.listen(null, function() {
        request.post(`${httpHost}check-data`, { form }, (err, res, body) => {
          expect(JSON.parse(body)).toEqual(form);
          closeServer(app, done);
        });
      });
    });
  });

  describe(`main routing`, function() {
    it(`should start the routing engine on the main router if request path did not map
        to a public file, and run the matching registered all method route if any`, function(done) {
      app.all('/hi', function(req, res) {
        return res.end();
      });
      const host = `${httpHost}hi`;
      app.listen(null, function() {
        request.get(`${host}`, function(err, res, body) {
          expect(res.statusCode).toEqual(200);
          request.post(`${host}`, function(err, res, body) {
            expect(res.statusCode).toEqual(200);
            request.put(`${host}`, function(err, res, body) {
              expect(res.statusCode).toEqual(200);
              request.del(`${host}`, function(err, res, body) {
                expect(res.statusCode).toEqual(200);
                request.head(`${host}`, function(err, res, body) {
                  expect(res.statusCode).toEqual(200);
                  closeServer(app, done);
                });
              });
            });
          });
        });
      });
    });

    it(`should start the routing engine on the main router if request path did not map
        to a public file, and run the matching registered route for the current request method,
        if all routes fails`, function(done) {
      const callback = (req, res) => {
        return res.end();
      };
      app.get('/get', callback);
      app.post('/post', callback);
      app.put('/put', callback);
      app.delete('/delete', callback);
      app.head('/head', callback);
      app.options('/options', callback);

      app.listen(null, function() {
        request.get(`${httpHost}get`, function(err, res, body) {
          expect(res.statusCode).toEqual(200);
          request.post(`${httpHost}post`, function(err, res, body) {
            expect(res.statusCode).toEqual(200);
            request.put(`${httpHost}put`, function(err, res, body) {
              expect(res.statusCode).toEqual(200);
              request.del(`${httpHost}delete`, function(err, res, body) {
                expect(res.statusCode).toEqual(200);
                request.head(`${httpHost}head`, function(err, res, body) {
                  expect(res.statusCode).toEqual(200);
                  request.options(`${httpHost}options`, function(err, res, body) {
                    expect(res.statusCode).toEqual(200);
                    closeServer(app, done);
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  describe(`mounted routings`, function() {
    it(`should start the routing engine on the mounted routers if request path did not map
        to a public file, and did not get resolved by the main router, and run the matching registered all method route if any`, function(done) {
      const router = new Router(false);

      router.all('/{id}', function(req, res) {
        return res.end();
      });

      app.mount('users', router);

      const host = `${httpHost}users/1`;
      app.listen(null, function() {
        request.get(`${host}`, function(err, res, body) {
          expect(res.statusCode).toEqual(200);
          request.post(`${host}`, function(err, res, body) {
            expect(res.statusCode).toEqual(200);
            request.put(`${host}`, function(err, res, body) {
              expect(res.statusCode).toEqual(200);
              request.del(`${host}`, function(err, res, body) {
                expect(res.statusCode).toEqual(200);
                request.head(`${host}`, function(err, res, body) {
                  expect(res.statusCode).toEqual(200);
                  closeServer(app, done);
                });
              });
            });
          });
        });
      });
    });

    it(`should start the routing engine on the mounted routers if request path did not map
        to a public file and was not resolved by the main router, and run the matching registered route for the current request method,
        if all routes fails`, function(done) {
      const callback = (req, res) => {
        return res.end();
      };
      const router = new Router(true);

      router.get('/get', callback);
      router.post('/post', callback);
      router.put('/put', callback);
      router.delete('/delete', callback);
      router.head('/head', callback);
      router.options('/options', callback);

      app.mount('users', router);

      app.listen(null, function() {
        request.get(`${httpHost}users/get`, function(err, res, body) {
          expect(res.statusCode).toEqual(200);
          request.post(`${httpHost}users/post`, function(err, res, body) {
            expect(res.statusCode).toEqual(200);
            request.put(`${httpHost}users/put`, function(err, res, body) {
              expect(res.statusCode).toEqual(200);
              request.del(`${httpHost}users/delete`, function(err, res, body) {
                expect(res.statusCode).toEqual(200);
                request.head(`${httpHost}users/head`, function(err, res, body) {
                  expect(res.statusCode).toEqual(200);
                  request.options(`${httpHost}users/options`, function(err, res, body) {
                    expect(res.statusCode).toEqual(200);
                    closeServer(app, done);
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
