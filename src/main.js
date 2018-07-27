import RServerApp from './modules/RServerApp.js';
import Router from './modules/Router.js';

export default {

    /**
     * returns an app instance
     *@param {string} [configPath] - an optional relative path to a user defined config file
     * defaults to .rsvrc.json
     *@returns {RServerApp}
    */
    instance(configPath) {
        return new RServerApp(configPath);
    },

    /**
     * creates mountable router
     *@param {boolean} [inheritMiddlewares=true] - boolean value indicating if parent middlewares should
     * be inherited. defaults to true
     *@returns {Router}
    */
    Router(inheritMiddlewares) {
        return new Router(inheritMiddlewares);
    }
};