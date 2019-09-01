import main from '../src/main';
import Router from '../src/modules/Router';
import App from '../src/modules/App';

describe(`Main`, function() {
  describe('.create(config: string | Config = ".server.js")', function() {
    it(`should create and return an R App instance`, function() {
      expect(main.create()).toBeInstanceOf(App);
    });

    it(`should accept an optional config object or string denoting config file location`, function() {
      expect(main.create({ env: 'prod' })).toBeInstanceOf(App);
      expect(main.create('.server.json')).toBeInstanceOf(App);
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
