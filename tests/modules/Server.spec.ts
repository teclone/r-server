import {
  httpHost,
  dummyCallback,
  dummyMiddleware,
  closeServer,
  httpsEnabledConfig
} from '../helpers';
import request from 'request';
import * as path from 'path';
import * as fs from 'fs';
import Server from '../../src/modules/Server';
import Router from '../../src/modules/Router';
import { Method } from '../../src/@types';
import Wrapper from '../../src/modules/Wrapper';

describe(`Server`, function() {
  const getTemplate = (method: Method) => {
    return function() {
      const banner =
        'should call main router to store the given route rule for ' +
        (method === 'all'
          ? 'all http method verbs'
          : 'http ' + method.toUpperCase() + ' method');

      it(banner, function() {
        const spy = jest.spyOn(server.getRouter(), method);
        server[method]('/', dummyCallback);

        expect(spy.mock.calls[0][0]).toEqual('/');
        expect(spy.mock.calls[0][1]).toEqual(dummyCallback);

        spy.mockRestore();
      });
    };
  };

  let server: Server = null;

  beforeEach(function() {
    server = new Server({});
  });

  describe('#constructor(config: string | Config)', function() {
    it(`should create an Rserver instance`, function() {
      expect(server).toBeInstanceOf(Server);
    });

    it(`should setup https server if https is enabled`, function() {
      const server = new Server(httpsEnabledConfig);
      expect(server).toBeInstanceOf(Server);
    });

    it(`should resolve the env settings and prioritize the value of process.env.NODE_ENV
        if set ahead of config's env value`, function() {
      process.env.NODE_ENV = 'production';
      let server = new Server(httpsEnabledConfig);
      expect(server.getConfig().env).toEqual('prod');

      process.env.NODE_ENV = 'development';
      server = new Server(httpsEnabledConfig);
      expect(server.getConfig().env).toEqual('dev');

      process.env.NODE_ENV = '';
    });

    it(`should resolve the env settings and prioritize the value of process.env.HTTPS_PORT
        if set ahead of config's https.port value`, function() {
      process.env.HTTPS_PORT = '6000';
      let server = new Server({ https: { port: 5000, enabled: true } });
      expect(server.getConfig().https.port).toEqual(6000);

      process.env.HTTPS_PORT = '';
    });
  });

  describe('#listening', function() {
    it(`should return true if https or http server is listening for connection`, function() {
      expect(server.listening).toBeFalsy();
    });
  });

  describe('#getRouter(): Router', function() {
    it(`should return the server instance main router`, function() {
      expect(server.getRouter()).toBeInstanceOf(Router);
    });
  });

  describe('#getMountedRouters(): Router[]', function() {
    it(`should return an array of the server instance mounted routers`, function() {
      expect(server.getMountedRouters()).toEqual([]);
    });
  });

  describe('#getConfig()', function() {
    it(`should return the resolved server config object`, function() {
      expect(server.getConfig()).toHaveProperty('env');
    });
  });

  describe('#setBasePath(path: string)', function() {
    it(`should call the main router to set the global base path for all registered routes`, function() {
      const spy = jest.spyOn(server.getRouter(), 'setBasePath');
      server.setBasePath('api/v1');

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
      expect(server.route('user')).toBeInstanceOf(Wrapper);
    });
  });

  describe(`use(url: Url, middleware: Middleware | Middleware[],
        options: Method | Method[] | MiddlewareOptions | null = null)`, function() {
    it(`should call main router to register a middleware to be called whenever the
            given route url is visited`, function() {
      const spy = jest.spyOn(server.getRouter(), 'use');

      server.use('/', dummyMiddleware);
      expect(spy.mock.calls[0][0]).toEqual('/');
      spy.mockRestore();
    });
  });

  describe('#mount(baseUrl: Url, router: Router)', function() {
    it(`should resolve all routes registered in the mountable router and store the router
        inside the mountedRouters array`, function() {
      server.setBasePath('api/v1');
      server.get('login', dummyCallback);

      const router = new Router(true);
      router.get('/', dummyCallback);
      router.get('{id}', dummyCallback);
      router.get('{id}/posts', dummyCallback);

      server.mount('users', router);

      expect(server.getMountedRouters()).toHaveLength(1);
      expect(server.getRouter().getRoutes().get[0][0]).toEqual('api/v1/login');
      expect(server.getMountedRouters()[0].getRoutes().get[0][0]).toEqual(
        'api/v1/users'
      );
      expect(server.getMountedRouters()[0].getRoutes().get[1][0]).toEqual(
        'api/v1/users/{id}'
      );
      expect(server.getMountedRouters()[0].getRoutes().get[2][0]).toEqual(
        'api/v1/users/{id}/posts'
      );
    });
  });

  describe('#listen(port?: number | null, callback: ListenerCallback = () => {})', function() {
    it(`should start the application at the given port, calling the callback method once the
            server gets started`, function(done) {
      server.listen(3000, () => {
        expect(server.address().http.port).toEqual(3000);
        closeServer(server, done);
      });
    });

    it(`should use the value of process.env.PORT if set over any given port parameter`, function(done) {
      process.env.PORT = '5000';
      server.listen(3000, () => {
        expect(server.address().http.port).toEqual(5000);
        process.env.PORT = '';
        closeServer(server, done);
      });
    });

    it(`should start up the https server if enabled at a default of 9000`, function(done) {
      const server = new Server(httpsEnabledConfig);
      server.listen(3000, () => {
        expect(server.address().http.port).toEqual(3000);
        expect(server.address().https.port).toEqual(9000);
        closeServer(server, done);
      });
    });

    it(`should default http port parameter to 8000 if no port is given and process.env.PORT is not
        set`, function(done) {
      server.listen(null, () => {
        expect(server.address().http.port).toEqual(8000);
        closeServer(server, done);
      });
    });

    it(`should default callback argument to a dummy callback if not provided`, function(done) {
      const close = () => {
        if (server.listening) {
          closeServer(server, done);
        } else {
          schedule();
        }
      };
      const schedule = () => {
        setTimeout(close, 20);
      };

      server.listen();
      schedule();
    });

    it(`should do nothing if server is already listening`, function(done) {
      server.listen(null, () => {
        expect(function() {
          server.listen();
        }).not.toThrow();
        closeServer(server, done);
      });
    });
  });

  describe('#close(callback: ListenerCallback = () => {})', function() {
    it(`should close and stop servers from listening for further connections`, function(done) {
      const server = new Server(httpsEnabledConfig);
      server.listen(null, () => {
        expect(server.listening).toBeTruthy();
        server.close(() => {
          expect(server.listening).toBeFalsy();
          done();
        });
      });
    });

    it(`should skip closing https server if it is not enabled`, function(done) {
      server.listen(null, () => {
        expect(server.listening).toBeTruthy();
        server.close(() => {
          expect(server.listening).toBeFalsy();
          done();
        });
      });
    });

    it(`should default callback to a dummy callback if not provided`, function(done) {
      const close = () => {
        if (!server.listening) {
          done();
        } else {
          schedule();
        }
      };

      const schedule = () => {
        setTimeout(close, 20);
      };

      server.listen(null, () => {
        server.close();
        schedule();
      });
    });

    it(`should do nothing if server is not listening`, function() {
      expect(function() {
        server.close();
      }).not.toThrow();
    });
  });

  describe('#address(): {http: AddressInfo | null, https: AddressInfo | null}', function() {
    it(`should return server address info that contains info for both http and https
            server`, function() {
      const address = server.address();
      expect(address).toHaveProperty('http');
      expect(address).toHaveProperty('https');
    });

    it(`each server address should be null when it is not listening for connections`, function() {
      const address = server.address();
      expect(address.http).toBeNull();
      expect(address.https).toBeNull();
    });

    it(`each server address should be an AddressInfo when it is listening for connections`, function(done) {
      const server = new Server(httpsEnabledConfig);
      server.listen(null, () => {
        expect(server.address().http).not.toBeNull();
        expect(server.address().https).not.toBeNull();

        closeServer(server, done);
      });
    });
  });

  describe('Server Error', function() {
    it(`should handle server error such as trying to listen on an already taken port and
        log warning message to the console`, function(done) {
      const server2 = new Server({});
      server.listen(null, function() {
        expect(function() {
          server2.listen(null);
        }).not.toThrow();
        closeServer(server, done);
      });
    });
  });

  // describe('Client Error', function() {
  //     it (`should handle every client error on the server by simply ending the socket`, function(done) {
  //         server.listen(null, function() {
  //             expect(function() {
  //                 server.httpServer.emit('clientError');
  //                 closeServer(server, done);
  //             }).not.toThrow();
  //         });
  //     });
  // });

  describe('Request Error', function() {
    it(`should handle every request error on the server by simply ending the response`, function(done) {
      const server = new Server({
        env: 'prod'
      });

      server.get('say-hi', (req, res) => {
        expect(function() {
          req.emit('error', 'something went bad');
        }).not.toThrow();
        return res.end();
      });

      server.listen(null, function() {
        request.get(`${httpHost}say-hi`, (err, res) => {
          expect(res.statusCode).toEqual(500);
          closeServer(server, done);
        });
      });
    });
  });

  describe('Response Error', function() {
    it(`should handle every response error on the server by simply ending the response`, function(done) {
      const server = new Server({
        env: 'prod'
      });

      server.get('say-hi', (req, res) => {
        expect(function() {
          res.emit('error', 'something went bad');
        }).not.toThrow();
        return res.end();
      });

      server.listen(null, function() {
        request.get(`${httpHost}say-hi`, (err, res) => {
          expect(res.statusCode).toEqual(500);
          closeServer(server, done);
        });
      });
    });
  });

  describe('413 Response code', function() {
    it(`should send 413 error code if request data exceeds server maxMemory value`, function(done) {
      const server = new Server({
        maxMemory: 10
      });
      const form = {
        name: 'Harrison',
        password: 'passwd_243'
      };
      server.post('/process-data', (req, res) => {
        return res.json(req.body);
      });
      server.listen(null, function() {
        request.post(`${httpHost}process-data`, { form }, (err, res) => {
          expect(res.statusCode).toEqual(413);
          closeServer(server, done);
        });
      });
    });
  });

  describe(`enforce https`, function() {
    it(`should enforce https by redirecting all http requests to the https address`, function(done) {
      const server = new Server({
        https: {
          enabled: true,
          enforce: true
        }
      });

      server.get('/say-protocol', (req, res) => {
        return res.end(req.encrypted ? 'https' : 'http');
      });

      server.listen(null, function() {
        request(
          `${httpHost}say-protocol`,
          { rejectUnauthorized: false },
          (err, res, body) => {
            expect(body).toEqual('https');
            closeServer(server, done);
          }
        );
      });
    });
  });

  describe(`serve static file`, function() {
    it(`should serve static public file if file exists`, function(done) {
      const filePath = path.resolve(__dirname, '../../public/index.html');
      server.listen(null, function() {
        request.get(`${httpHost}index.html`, null, (err, res, body) => {
          expect(body).toEqual(fs.readFileSync(filePath, 'utf8'));
          closeServer(server, done);
        });
      });
    });
  });

  describe(`serve 404 http error file`, function() {
    it(`should serve 404 http error file if request path does not exist`, function(done) {
      const filePath = path.resolve(__dirname, '../../src/httpErrors/404.html');
      server.listen(null, function() {
        request.get(`${httpHost}index1.html`, null, (err, res, body) => {
          expect(body).toEqual(fs.readFileSync(filePath, 'utf8'));
          closeServer(server, done);
        });
      });
    });
  });

  describe(`parse request body`, function() {
    it(`should parse request body, and make them available as body, data and files property
        on the request object`, function(done) {
      const form = {
        name: 'Harrison',
        password: 'passwd_243'
      };
      server.post('/check-data', (req, res) => {
        return res.json(req.body);
      });
      server.listen(null, function() {
        request.post(`${httpHost}check-data`, { form }, (err, res, body) => {
          expect(JSON.parse(body)).toEqual(form);
          closeServer(server, done);
        });
      });
    });
  });

  describe(`main routing`, function() {
    it(`should start the routing engine on the main router if request path did not map
        to a public file, and run the matching registered all method route if any`, function(done) {
      server.all('/hi', function(req, res) {
        return res.end();
      });
      const host = `${httpHost}hi`;
      server.listen(null, function() {
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
                  closeServer(server, done);
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
      server.get('/get', callback);
      server.post('/post', callback);
      server.put('/put', callback);
      server.delete('/delete', callback);
      server.head('/head', callback);
      server.options('/options', callback);

      server.listen(null, function() {
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
                  request.options(`${httpHost}options`, function(
                    err,
                    res,
                    body
                  ) {
                    expect(res.statusCode).toEqual(200);
                    closeServer(server, done);
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

      server.mount('users', router);

      const host = `${httpHost}users/1`;
      server.listen(null, function() {
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
                  closeServer(server, done);
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

      server.mount('users', router);

      server.listen(null, function() {
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
                  request.options(`${httpHost}users/options`, function(
                    err,
                    res,
                    body
                  ) {
                    expect(res.statusCode).toEqual(200);
                    closeServer(server, done);
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
