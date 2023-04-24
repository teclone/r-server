import { Router } from '../../src/modules/Router';
import { dummyCallback, dummyMiddleware } from '../helpers';
import { Method } from '../../src/@types';
import { Wrapper } from '../../src/modules/Wrapper';
import { getRouteKeys } from '../../src/modules/Utils';
import { ROUTE_KEYS } from '../../src/modules/Constants';

describe('Router', function () {
  let router: Router;

  beforeEach(function () {
    router = new Router(true);
  });

  const getTemplate = (method: Method) => {
    return function () {
      const banner =
        'should store the given route rule for ' +
        (method === '*'
          ? 'all http method verbs'
          : 'http ' + method.toUpperCase() + ' method');

      const routeKeys = getRouteKeys(method);

      const api = method === '*' ? 'any' : method;
      it(banner, function () {
        router[api]('/', dummyCallback);

        for (const routeKey of routeKeys) {
          expect(router.getRoutes()[routeKey].length).toEqual(1);
          expect(router.getRoutes()[routeKey][0][1]).toEqual('');
          expect(router.getRoutes()[routeKey][0][2]).toEqual(dummyCallback);
          expect(router.getRoutes()[routeKey][0][3]).toBeNull();
        }
      });

      it(`can take a middleware callback or array of middleware callbacks as
                options argument which is then resolved in a ResolvedCallbackOptions object`, function () {
        router[api]('/users/', dummyCallback, dummyMiddleware);
        for (const routeKey of routeKeys) {
          expect(router.getRoutes()[routeKey].length).toEqual(1);
          expect(router.getRoutes()[routeKey][0][1]).toEqual('users');
          expect(router.getRoutes()[routeKey][0][2]).toEqual(dummyCallback);
          expect(router.getRoutes()[routeKey][0][3]).toHaveProperty('use', [
            dummyMiddleware,
          ]);
        }
      });

      it(`can take an array of middleware callbacks as
                options argument which is then resolved in a ResolvedCallbackOptions object`, function () {
        router[api]('/', dummyCallback, [dummyMiddleware]);

        for (const routeKey of routeKeys) {
          expect(router.getRoutes()[routeKey].length).toEqual(1);
          expect(router.getRoutes()[routeKey][0][1]).toEqual('');
          expect(router.getRoutes()[routeKey][0][2]).toEqual(dummyCallback);
          expect(router.getRoutes()[routeKey][0][3]).toHaveProperty('use', [
            dummyMiddleware,
          ]);
        }
      });

      it(`can take a CallbackOptions object as options argument containing a single middleware
            or aray of middlewares which in turn is resolved to a ResolvedCallbackOptions object`, function () {
        router[api]('/users', dummyCallback, {
          use: dummyMiddleware,
        });
        for (const routeKey of routeKeys) {
          expect(router.getRoutes()[routeKey].length).toEqual(1);
          expect(router.getRoutes()[routeKey][0][1]).toEqual('users');
          expect(router.getRoutes()[routeKey][0][2]).toEqual(dummyCallback);
          expect(router.getRoutes()[routeKey][0][3]).toHaveProperty('use', [
            dummyMiddleware,
          ]);
        }
      });
    };
  };

  describe('#constructor(inheritMiddlewares: boolean)', function () {
    it(`should create a Router instance`, function () {
      expect(router).toBeInstanceOf(Router);
    });
  });

  describe('#getRoutes(): Routes', function () {
    it(`should return all stored routes`, function () {
      const routes = router.getRoutes();

      expect(routes).toHaveProperty('options', []);
      expect(routes).toHaveProperty('head', []);
      expect(routes).toHaveProperty('get', []);
      expect(routes).toHaveProperty('post', []);
      expect(routes).toHaveProperty('put', []);
      expect(routes).toHaveProperty('delete', []);
    });
  });

  describe('#getMiddleware(): MiddlewareInstance[]', function () {
    it(`should return all stored middleware instances`, function () {
      const middlewares = router.getMiddlewares();
      expect(middlewares).toEqual([]);
    });
  });

  describe('#getBasePath(): string', function () {
    it(`should return the routing basePath`, function () {
      expect(router.getBasePath()).toEqual('');
    });
  });

  describe('#setBasePath(basePath: string)', function () {
    it(`should set the routing basePath`, function () {
      router.setBasePath('/api/v1');
      expect(router.getBasePath()).toEqual('api/v1');
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
    getTemplate('*')
  );

  describe('#route(url: string): Wrapper', function () {
    it(`should create and return a chainable route wrapper for the given url`, function () {
      expect(router.route('/users')).toBeInstanceOf(Wrapper);
    });
  });

  describe(`#use(url: Url, middleware: Middleware | Middleware[],
        options: Method | Method[] | MiddlewareOptions | null = null)`, function () {
    it(`should register a middleware to be called whenever the given url is visited`, function () {
      expect(router.getMiddlewares().length).toEqual(0);

      router.use('/', dummyMiddleware);
      expect(router.getMiddlewares().length).toEqual(1);
      expect(router.getMiddlewares()[0][1]).toEqual('');
      expect(router.getMiddlewares()[0][2]).toEqual([dummyMiddleware]);
      expect(router.getMiddlewares()[0][3]).toHaveProperty(
        'method',
        ROUTE_KEYS
      );
    });

    it(`can accept a http method argument as options, specifying the which request method type
        that middleware will apply to`, function () {
      expect(router.getMiddlewares().length).toEqual(0);
      router.use('/users', dummyMiddleware, 'get');

      expect(router.getMiddlewares().length).toEqual(1);
      expect(router.getMiddlewares()[0][1]).toEqual('users');
      expect(router.getMiddlewares()[0][2]).toEqual([dummyMiddleware]);
      expect(router.getMiddlewares()[0][3]).toHaveProperty('method', ['get']);
    });

    it(`can accept an array of http method arguments as options too`, function () {
      expect(router.getMiddlewares().length).toEqual(0);
      router.use('/', dummyMiddleware, ['get', 'post']);

      expect(router.getMiddlewares().length).toEqual(1);
      expect(router.getMiddlewares()[0][1]).toEqual('');
      expect(router.getMiddlewares()[0][2]).toEqual([dummyMiddleware]);
      expect(router.getMiddlewares()[0][3]).toHaveProperty('method', [
        'get',
        'post',
      ]);
    });

    it(`can also accept a MiddlewareOptions object, that defines the http methods`, function () {
      expect(router.getMiddlewares().length).toEqual(0);
      router.use('/', dummyMiddleware, { method: ['get', 'post'] });

      expect(router.getMiddlewares().length).toEqual(1);
      expect(router.getMiddlewares()[0][1]).toEqual('');
      expect(router.getMiddlewares()[0][2]).toEqual([dummyMiddleware]);
      expect(router.getMiddlewares()[0][3]).toHaveProperty('method', [
        'get',
        'post',
      ]);
    });
  });

  describe('#shouldInheritMiddlewares(status?: boolean): boolean', function () {
    it(`should return a boolean value indicating if the router will inherit parent app
            registered middlewares when mounted`, function () {
      expect(router.shouldInheritMiddlewares()).toBeTruthy();
    });

    it(`can accept an optional boolean status value, which it uses to update the
            inheritMiddlewares property and returns the updated value`, function () {
      expect(router.shouldInheritMiddlewares(false)).toBeFalsy();
    });
  });
});
