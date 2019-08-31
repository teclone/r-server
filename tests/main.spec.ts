import main from '../src/main';
import Router from '../src/modules/Router';
import Server from '../src/modules/Server';

describe(`Main`, function() {
  describe('.create(config: string | Config = ".server.js")', function() {
    it(`should create and return an R Server instance`, function() {
      expect(main.create()).toBeInstanceOf(Server);
    });

    it(`should accept an optional config object or string denoting config file location`, function() {
      expect(main.create({ env: 'prod' })).toBeInstanceOf(Server);
      expect(main.create('.server.json')).toBeInstanceOf(Server);
    });
  });

  describe('.Router(inheritMiddlewares: boolean = true)', function() {
    it(`should return a mountable router instance when called`, function() {
      expect(main.Router()).toBeInstanceOf(Router);
    });
    it(`should accept an optional boolean parameter that indicates if router
            should inherit parent middlewares`, function() {
      expect(main.Router(false)).toBeInstanceOf(Router);
    });
  });
});
