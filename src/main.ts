import App from './modules/App';
import Router from './modules/Router';
import { Config } from './typings';

export default {
  /**
   * creates an r server app instance
   * @param config - config file location or configuration object, defaults to .server.js
   */
  create(config: string | Config = '.server.js'): App {
    return new App(config);
  },

  /**
   * creates a mountable router
   * @param inheritMiddlewares - indicates if parent middlewares should be inherited
   */
  Router(inheritMiddlewares: boolean = true): Router {
    return new Router(inheritMiddlewares);
  },
};
