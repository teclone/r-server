import RServerApp from './modules/RServerApp.js';
export default {

    /**
     * returns an app instance
    */
    instance(configPath) {
        return new RServerApp(configPath);
    }
};