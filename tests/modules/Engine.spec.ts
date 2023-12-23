import { dummyCallback, dummyMiddleware } from '../helpers';
import { Engine } from '../../src/modules/Engine';
import { Method, MiddlewareInstance } from '../../src/@types';
import { Logger } from '../../src/modules/Logger';
import { Server } from '../../src/modules/Server';
import { ServerResponse } from '../../src/modules/Response';
import { ServerRequest } from '../../src/modules/Request';

describe('Engine', function () {
  let engine: Engine;

  const createEngine = (path: string, method: Method) => {
    const server = new Server();
    const configs = server.getConfig();

    // const request = new Request(new Socket());
    // const response = new Response(request);
    const logger = new Logger({
      accessLogFile: configs.accessLog,
      errorLogFile: configs.errorLog,
    });

    // response.request = request;
    // response.logger = logger;

    const response = {
      end: () => {
        // do nothing
      },
      jsonError: () => {
        return Promise.resolve(true);
      },
    } as ServerResponse;
    response.logger = logger;

    return new Engine(path, method, {} as ServerRequest, response);
  };

  beforeEach(function () {
    engine = createEngine('/', 'get');
  });

  describe(`#constructor(url: Url, method: string, request: Request,
        response: Response, logger: Logger)`, function () {
    it(`should create an engine instance when called`, function () {
      expect(engine).toBeInstanceOf(Engine);
    });
  });

  describe(`parameter capturing`, function () {
    it(`should capture route parameters and pass along to route callback
            during execution`, function () {
      const engine = createEngine('/users/1', 'get');
      const routeCallback = jest.fn(dummyCallback);

      return engine
        .process([[1, 'users/{id}', routeCallback, []]], [])
        .then((status) => {
          expect(status).toBeTruthy();
          expect(routeCallback).toHaveBeenCalledTimes(1);
          expect(routeCallback.mock.calls[0][2].pathParams).toHaveProperty(
            'id',
            '1'
          );
        });
    });

    it(`should capture double route parameters separated by hyphen and pass along to route
            callback during execution`, function () {
      const engine = createEngine('/flights/ng-us', 'get');
      const routeCallback = jest.fn(dummyCallback);

      return engine
        .process([[1, 'flights/{from}-{to}', routeCallback, []]])
        .then((status) => {
          const params = routeCallback.mock.calls[0][2].pathParams;
          expect(status).toBeTruthy();

          expect(routeCallback).toHaveBeenCalledTimes(1);

          expect(params).toHaveProperty('from', 'ng');
          expect(params).toHaveProperty('to', 'us');
        });
    });

    it(`should capture double route parameters separated by dot symbol and pass along to
            route callback during execution`, function () {
      const engine = createEngine('/flights/ng.us', 'get');
      const routeCallback = jest.fn(dummyCallback);

      return engine
        .process([[1, 'flights/{from}.{to}', routeCallback, []]])
        .then((status) => {
          const params = routeCallback.mock.calls[0][2].pathParams;
          expect(status).toBeTruthy();

          expect(routeCallback).toHaveBeenCalledTimes(1);

          expect(params).toHaveProperty('from', 'ng');
          expect(params).toHaveProperty('to', 'us');
        });
    });

    it(`should convert captured parameter to integer if int data type is specified`, function () {
      const engine = createEngine('/users/1', 'get');
      const routeCallback = jest.fn(dummyCallback);

      return engine
        .process([[1, 'users/{int:userId}', routeCallback, []]])
        .then((status) => {
          const params = routeCallback.mock.calls[0][2].pathParams;
          expect(status).toBeTruthy();

          expect(routeCallback).toHaveBeenCalledTimes(1);

          expect(params).toHaveProperty('userId', 1);
        });
    });

    it(`should default the converted captured parameter to 0 if it is not a number`, function () {
      const engine = createEngine('/users/harrison', 'get');
      const routeCallback = jest.fn(dummyCallback);

      return engine
        .process([[1, 'users/{int:userId}', routeCallback, []]])
        .then((status) => {
          const params = routeCallback.mock.calls[0][2].pathParams;
          expect(status).toBeTruthy();

          expect(routeCallback).toHaveBeenCalledTimes(1);

          expect(params).toHaveProperty('userId', 0);
        });
    });

    it(`should convert captured parameter to floating value if float data type is specified`, function () {
      const engine = createEngine('/amount/50.25', 'get');
      const routeCallback = jest.fn(dummyCallback);

      return engine
        .process([[1, 'amount/{float:value}', routeCallback, []]])
        .then((status) => {
          const params = routeCallback.mock.calls[0][2].pathParams;
          expect(status).toBeTruthy();

          expect(routeCallback).toHaveBeenCalledTimes(1);

          expect(params).toHaveProperty('value', 50.25);
        });
    });

    it(`should convert captured parameter to floating value if numeric data type is specified`, function () {
      const engine = createEngine('/amount/50.25', 'get');
      const routeCallback = jest.fn(dummyCallback);

      return engine
        .process([[1, 'amount/{numeric:value}', routeCallback, []]])
        .then((status) => {
          const params = routeCallback.mock.calls[0][2].pathParams;
          expect(status).toBeTruthy();

          expect(routeCallback).toHaveBeenCalledTimes(1);

          expect(params).toHaveProperty('value', 50.25);
        });
    });

    it(`should convert captured parameter to floating value if number data type is specified`, function () {
      const engine = createEngine('/amount/50.25', 'get');
      const routeCallback = jest.fn(dummyCallback);

      return engine
        .process([[1, 'amount/{number:value}', routeCallback, []]])
        .then((status) => {
          const params = routeCallback.mock.calls[0][2].pathParams;
          expect(status).toBeTruthy();

          expect(routeCallback).toHaveBeenCalledTimes(1);

          expect(params).toHaveProperty('value', 50.25);
        });
    });

    it(`should convert captured parameter to boolean if boolean data type is specified`, function () {
      const engine = createEngine('/agreement/false', 'get');
      const routeCallback = jest.fn(dummyCallback);

      return engine
        .process([[1, 'agreement/{boolean:value}', routeCallback, []]])
        .then((status) => {
          const params = routeCallback.mock.calls[0][2].pathParams;
          expect(status).toBeTruthy();

          expect(routeCallback).toHaveBeenCalledTimes(1);

          expect(params).toHaveProperty('value', false);
        });
    });

    it(`should convert captured parameter to boolean if bool data type is specified`, function () {
      const engine = createEngine('/agreement/true', 'get');
      const routeCallback = jest.fn(dummyCallback);

      return engine
        .process([[1, 'agreement/{bool:value}', routeCallback, []]])
        .then((status) => {
          const params = routeCallback.mock.calls[0][2].pathParams;
          expect(status).toBeTruthy();

          expect(routeCallback).toHaveBeenCalledTimes(1);

          expect(params).toHaveProperty('value', true);
        });
    });
  });

  describe(`pattern matching`, function () {
    it(`should match optional ending routes which are identified by the presence of
        the question mark character at the end of the route path`, function () {
      const engine = createEngine('/flights', 'get');
      return engine
        .process([[1, '/flights/{from}-{to}?', dummyCallback, []]])
        .then((status) => {
          expect(status).toBeTruthy();
        });
    });

    it(`should treat home route as empty string while matching`, function () {
      const engine = createEngine('/', 'get');
      return engine.process([[1, '/', dummyCallback, []]]).then((status) => {
        expect(status).toBeTruthy();
      });
    });
  });

  describe(`routing`, function () {
    it(`should process the given route and run the route callback if any of the routes path match request path`, function () {
      const engine = createEngine('/users', 'options');
      const callback = jest.fn(dummyCallback);
      return engine.process([[1, 'users', callback, []]]).then((status) => {
        expect(status).toBeTruthy();
        expect(callback.mock.calls).toHaveLength(1);
      });
    });

    it(`should run localized route middlewares, stopping immediately without executing
        the route callback if any of the middlewares fails to call the next callback`, function () {
      const engine = createEngine('/users', 'options');

      const middleware1 = jest.fn(dummyMiddleware);
      const middleware2 = jest.fn();
      const middleware3 = jest.fn();

      const callback = jest.fn(dummyCallback);

      return engine
        .process([
          [1, 'users', callback, [middleware1, middleware2, middleware3]],
        ])
        .then((status) => {
          expect(status).toBeTruthy();
          expect(middleware1).toHaveBeenCalledTimes(1);
          expect(middleware2).toHaveBeenCalledTimes(1);
          expect(middleware3).not.toHaveBeenCalled();

          expect(callback).not.toHaveBeenCalled();
        });
    });

    it(`should run localized route middlewares, continuing and executing
        the route callback if all of the middlewares called the next callback`, function () {
      const engine = createEngine('/users', 'options');

      const middleware1 = jest.fn(dummyMiddleware);
      const middleware2 = jest.fn(dummyMiddleware);
      const middleware3 = jest.fn(dummyMiddleware);

      const callback = jest.fn(dummyCallback);

      return engine
        .process([
          [1, 'users', callback, [middleware1, middleware2, middleware3]],
        ])
        .then((status) => {
          expect(status).toBeTruthy();
          expect(middleware1).toHaveBeenCalledTimes(1);
          expect(middleware2).toHaveBeenCalledTimes(1);
          expect(middleware3).toHaveBeenCalledTimes(1);

          expect(callback).toHaveBeenCalledTimes(1);
        });
    });

    it(`should execute matching
        middlewares whose route path and method matches that of the request`, function () {
      const engine = createEngine('/users', 'get');

      const middleware1 = jest.fn(dummyMiddleware);
      const middleware2 = jest.fn();
      const middleware3 = jest.fn();
      const middleware4 = jest.fn();

      const middlewares: MiddlewareInstance[] = [
        [1, '*', [middleware1], new Set(['get'])],
        [2, '/users', [middleware2], new Set(['options'])],
        [3, '/users', [middleware3], new Set(['get'])],
        [3, '/users', [middleware4], new Set(['get'])],
      ];

      return engine
        .process([[1, 'users', dummyCallback, []]], middlewares)
        .then((status) => {
          expect(status).toBeTruthy();
          expect(middleware1.mock.calls).toHaveLength(1);
          expect(middleware2.mock.calls).toHaveLength(0);
          expect(middleware3.mock.calls).toHaveLength(1);

          // middleware 4 is not called because middleware 2, despite being executed,
          // did not call the next callback
          expect(middleware4.mock.calls).toHaveLength(0);
        });
    });
  });
});
