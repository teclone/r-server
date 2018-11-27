/**
 *@module RServer
*/
import App from './modules/App.js';
import Router from './modules/Router.js';

export default {

    /**
     * returns an app instance
     *@param {string|Object} [config] - an optional config object or a string relative path to a
     * user defined config file defaults to ".server.config.json"
     *@returns {App}
    */
    instance(config) {
        return new App(config);
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