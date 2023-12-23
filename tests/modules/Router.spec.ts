import { Router } from '../../src/modules/Router';
import { dummyCallback, dummyMiddleware } from '../helpers';
import { Method } from '../../src/@types';
import { Wrapper } from '../../src/modules/Wrapper';
import { ALL_METHODS } from '../../src/modules/Constants';
describe('Router', function () {
  let router: Router;

  beforeEach(function () {
    router = new Router({ inheritMiddlewares: true });
  });

  const getTemplate = (method: Method) => {
    return function () {
      const banner =
        'should store the given route rule for ' +
        (method === '*'
          ? 'all http method verbs'
          : 'http ' + method.toUpperCase() + ' method');

      const api = method === '*' ? 'any' : method;
      const methods = method === '*' ? ALL_METHODS : [method];

      it(banner, function () {
        router[api]('/', dummyCallback);

        for (const routeKey of methods) {
          expect(router.getRoutes()[routeKey].length).toEqual(1);
          expect(router.getRoutes()[routeKey][0][1]).toEqual('');
          expect(router.getRoutes()[routeKey][0][2]).toEqual(dummyCallback);
          expect(router.getRoutes()[routeKey][0][3]).toEqual([]);
        }
      });

      it(`can take a middleware callback or array of middleware callbacks as
                third argument`, function () {
        router[api]('/users/', dummyCallback, dummyMiddleware);
        for (const routeKey of methods) {
          expect(router.getRoutes()[routeKey].length).toEqual(1);
          expect(router.getRoutes()[routeKey][0][1]).toEqual('users');
          expect(router.getRoutes()[routeKey][0][2]).toEqual(dummyCallback);
          expect(router.getRoutes()[routeKey][0][3]).toEqual([dummyMiddleware]);
        }
      });

      it(`can take an array of middleware callbacks as third arguments`, function () {
        router[api]('/', dummyCallback, [dummyMiddleware]);

        for (const routeKey of methods) {
          expect(router.getRoutes()[routeKey].length).toEqual(1);
          expect(router.getRoutes()[routeKey][0][1]).toEqual('');
          expect(router.getRoutes()[routeKey][0][2]).toEqual(dummyCallback);
          expect(router.getRoutes()[routeKey][0][3]).toEqual([dummyMiddleware]);
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
    getTemplate('*')
  );

  describe('#route(url: string): Wrapper', function () {
    it(`should create and return a chainable route wrapper for the given url`, function () {
      expect(router.route('/users')).toBeInstanceOf(Wrapper);
    });
  });

  describe(`#use(url: Url, middleware: Middleware | Middleware[],
        operation?: Method | Method[])`, function () {
    it(`should register a middleware to be called whenever the given url is visited`, function () {
      expect(router.getMiddlewares().length).toEqual(0);

      router.use('/', dummyMiddleware);
      expect(router.getMiddlewares().length).toEqual(1);
      expect(router.getMiddlewares()[0][1]).toEqual('');
      expect(router.getMiddlewares()[0][2]).toEqual([dummyMiddleware]);
      expect(router.getMiddlewares()[0][3]).toEqual(new Set(ALL_METHODS));
    });

    it(`can accept a http method argument as last parameter, specifying which request method type
        the middleware will apply to`, function () {
      expect(router.getMiddlewares().length).toEqual(0);
      router.use('/users', dummyMiddleware, 'get');

      expect(router.getMiddlewares().length).toEqual(1);
      expect(router.getMiddlewares()[0][1]).toEqual('users');
      expect(router.getMiddlewares()[0][2]).toEqual([dummyMiddleware]);
      expect(router.getMiddlewares()[0][3]).toEqual(new Set(['get']));
    });

    it(`can accept an array of http method arguments as options too`, function () {
      expect(router.getMiddlewares().length).toEqual(0);
      router.use('/', dummyMiddleware, ['get', 'post']);

      expect(router.getMiddlewares().length).toEqual(1);
      expect(router.getMiddlewares()[0][1]).toEqual('');
      expect(router.getMiddlewares()[0][2]).toEqual([dummyMiddleware]);
      expect(router.getMiddlewares()[0][3]).toEqual(new Set(['get', 'post']));
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
