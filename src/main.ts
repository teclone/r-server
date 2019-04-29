import Server from './modules/Server';
import Router from './modules/Router';
import { Config } from './@types';

export default {
    /**
     * creates an r server instance
     * @param config - config file location or configuration object, defaults to .server.js
     */
    create(config: string | Config = '.server.js'): Server {
        return new Server(config);
    },

    /**
     * creates a mountable router
     * @param inheritMiddlewares - indicates if parent middlewares should be inherited
     */
    Router(inheritMiddlewares: boolean = true): Router {
        return new Router(inheritMiddlewares);
    }
};