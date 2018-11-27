/**
 *@module Server
*/

/**
 *@typedef {Object} serverConfig
*/
import fs from 'fs';
import path from 'path';
import Util from './Util.js';
import http from 'http';
import https from 'https';
import FileServer from './FileServer.js';
import Engine from './Engine.js';
import Router from './Router.js';
import BodyParser from './BodyParser.js';
import _config from '../.rsvrc.json';
import Logger from './Logger.js';
import { ENV } from './Constants.js';

require('./Response');
require('./Request');

export default class {

    /**
     *@param {string|serverConfig} [config] - optional config file string path or config object
    */
    constructor(config) {

        this.router = new Router(false); // the main/root router
        this.mountedRouters = []; //mounted routers

        /* istanbul ignore else */
        if (require.main)
            this.entryPath = this.getEntryPath(require.main.filename);
        else
            this.entryPath = this.getEntryPath(__dirname);

        this.config = this.resolveConfig(this.entryPath, config || '.rsvrc.json');

        this.fileServer = new FileServer(this.entryPath, this.config);

        this.bodyParser = new BodyParser(
            path.resolve(this.entryPath, this.config.tempDir),
            this.config.encoding
        );

        this.logger = new Logger(
            path.resolve(this.entryPath, this.config.errorLog),
            path.resolve(this.entryPath, this.config.accessLog),
            this.config
        );

        this.httpServer = http.createServer();
        this.httpsServer = null;

        //setup https server if it is enabled
        const httpsConfig = this.config.https;
        if (httpsConfig.enabled) {
            //read credentials, skip passphrase if it exists
            const credentials = Object.entries(httpsConfig.credentials)
                .reduce((result, [key, value]) => {
                    /* istanbul ignore else */
                    if (key !== 'passphrase')
                        value = fs.readFileSync(path.resolve(this.entryPath, value));

                    result[key] = value;
                    return result;
                }, {});

            this.httpsServer = https.createServer(credentials);
        }

        //on listening and on closing counts
        this.listeningCount = 0;
        this.closingCount = 0;

        //on close callback method
        this.closeCallback = null;
    }

    /**
     * returns the server identity
     *@returns {string}
    */
    get [Symbol.toStringTag]() {
        return 'RServer';
    }

    /**
     * returns boolean indicating if the http server is listening
    */
    get listening() {
        return this.httpServer.listening;
    }

    /**
     * returns boolean indicating if the https server is listening
    */
    get httpsListening() {
        return this.httpsServer && this.httpsServer.listening;
    }

    /**
     * returns the project's entry path
     *@param {string} knownPath - the known path for the mean time
     *@return {string}
    */
    getEntryPath(knownPath) {

        if (knownPath.indexOf('node_modules') > 0)
            return knownPath.split('/node_modules/')[0];

        let entryPath = path.resolve(knownPath, '../');
        while (entryPath !== '/') {
            if (fs.existsSync(entryPath + '/package.json'))
                break;

            entryPath = path.resolve(entryPath, '../');
        }

        return entryPath;
    }

    /**
     * resolves the configuration object
     *@param {string} entryPath - the project root path
     *@param {string|Object} config - a config object or a string relative path to a
     * user defined config file defaults to ".rsvrc.json"
    */
    resolveConfig(entryPath, config) {

        if (typeof config === 'string') {
            const absPath = path.resolve(entryPath, config);
            if (fs.existsSync(absPath))
                config = require(absPath);
        }

        config = Util.assign(null, _config, config);

        //prioritize node_env setting to config file setting
        if (typeof process.env.NODE_ENV !== 'undefined')
            config.env = process.env.NODE_ENV;

        if (config.https.enabled) {
            //overide https port with env settings if it exists
            if (process.env.HTTPS_PORT)
                config.https.port = process.env.HTTPS_PORT;

            //override https public port with env setting if it exists
            if (process.env.HTTPS_REDIRECT_PORT)
                config.https.redirectPort = process.env.HTTPS_REDIRECT_PORT;
        }

        return config;
    }

    /**
     * mounts a router to the main app
     *@param {string} baseUrl - the router baseUrl
     *@param {Router} router - the router instance
    */
    mount(baseUrl, router) {
        //baseUrl = baseUrl.replace(/\/+$/, '');
        const resolve = ([url, callback, options]) => {
            return [
                path.join(baseUrl, url),
                callback,
                options
            ];
        };

        if (!(router instanceof Router))
            return;

        //resolve all routes, each apiRoutes is of the form [url, callback, options]
        for (const [api, apiRoutes] of Object.entries(router.routes))
            router.routes[api] = apiRoutes.map(resolve);

        //resolve all middlewares. each middleware is of the format [url, callback, options]
        router.middlewares = router.middlewares.map(resolve);

        this.mountedRouters.push(router);
    }

    /**
     * runs all request routes
     *@param {Engine} engine - the router engine instance
     *@param {string} api - the route api to call
     *@param {Array} routes - routes array
     *@returns {boolean}
    */
    async runRoutes(engine, api, routes) {
        api = api.toLowerCase();
        for (let route of routes) {
            if (await engine[api](...route))
                return true;
        }
        return false;
    }

    /**
     * cordinates how routes are executed, including mounted routes
     *@param {string} url - request url
     *@param {string} method - request method
     *@param {http.IncomingMessage} request - the request object
     *@param {Response} response - the response object
     *@returns {boolean}
    */
    async cordinateRoutes(url, method, request, response) {
        method = method.toLowerCase();

        //create the engine, with zero middlewares yet
        let engine = new Engine(url, method, request, response, this.logger),
            router = this.router;

        //run on the main router thread
        engine.use(router.middlewares);

        if (await this.runRoutes(engine, 'all', router.routes['all']))
            return true;

        if (await this.runRoutes(engine, method, router.routes[method]))
            return true;

        //run on the mounted routers' thread
        for (let mountedRouter of this.mountedRouters) {
            let middlewares = mountedRouter.inheritMiddlewares?
                [...router.middlewares, ...mountedRouter.middlewares] : mountedRouter.middlewares;

            engine.use(middlewares);

            if (await this.runRoutes(engine, 'all', mountedRouter.routes['all']))
                return true;

            /* istanbul ignore else */
            if (await this.runRoutes(engine, method, mountedRouter.routes[method]))
                return true;
        }

        return false;
    }

    /**
     * perform house keeping
     *@param {http.IncomingMessage} request - the request object
    */
    onResponseFinish(request, response) {

        this.logger.profile(request, response);
        this.bodyParser.cleanUpTempFiles(request.files);
    }

    /**
     * handle on response error event
    */
    onResponseError(err, response) {
        this.logger.fatal(err, response);
    }

    /**
     * parse all request data
    */
    parseRequestData(request, url, buffers) {
        //parse query
        request.query = this.bodyParser.parseQueryString(url);

        //parse the request body
        if (buffers.length > 0) {
            let result = this.bodyParser.parse(
                Buffer.concat(buffers),
                request.headers['content-type']
            );

            request.body = result.body;
            request.files = result.files;
        }

        //combine the body and query into a data property
        request.data = Object.assign({}, request.query, request.body);
    }

    /**
     * handle request data event
     *@param {http.IncomingMessage} request - the request object
     *@param {Response} response - the response object
     *@param {Object} bufferDetails - the buffer details
     *@param {number} bufferDetails.size - the buffer size
     *@param {Array} bufferDetails.buffers - array containing chunks of buffer data
    */
    onRequestEnd(request, response, bufferDetails) {

        //if the response is already sent, such as redirects, just return.
        if (response.finished)
            return;

        //profile the response time
        response.startTime = new Date();

        const bufferSize = bufferDetails.size;

        //if request data size exceeds max buffer, bounce with 413 status code
        if (bufferSize > this.config.maxBufferSize)
            return response.status(413).end('Entity too large');

        const {url, method, headers} = request;

        request.files = {};
        request.query = {};
        request.body = {};
        request.buffer = bufferDetails.buffer;

        response.fileServer = this.fileServer;

        return this.fileServer.serve(url, method, headers, response).then(status => {
            if (status)
                return;

            this.parseRequestData(request, url, bufferDetails.buffer);
            return this.cordinateRoutes(url, method, request, response).then(status => {
                if (status)
                    return;

                //send 404 response if router did not resolved
                let httpErrors = this.config.httpErrors;
                return this.fileServer.serveHttpErrorFile(
                    response, 404, httpErrors.baseDir, httpErrors['404']
                );
            });
        });
    }

    /**
     * handle on request error event
    */
    onRequestError(err, response) {
        this.logger.fatal(err, response);
    }

    /**
     * handle request data event
    */
    onRequestData(chunk, request, response, bufferDetails) {
        bufferDetails.size += chunk.length;

        if (bufferDetails.size <= this.config.maxBufferSize)
            bufferDetails.buffer.push(chunk);
    }

    /**
     * handles request events
    */
    onRequest(request, response) {
        //profile the request time
        request.startTime = new Date();

        let bufferDetails = {buffer: [], size: 0};

        //handle on request error
        request.on('error', Util.generateCallback(this.onRequestError, this, response));

        //handle on data event
        request.on('data', Util.generateCallback(this.onRequestData, this,
            [request, response, bufferDetails]
        ));

        //handle on data event
        request.on('end', Util.generateCallback(this.onRequestEnd, this,
            [request, response, bufferDetails]
        ));

        //handle on response error
        response.on('error', Util.generateCallback(this.onResponseError, this, response));

        //clean up resources once the response has been sent out
        response.on('finish', Util.generateCallback(this.onResponseFinish, this,
            [request, response]
        ));

        //enforce https if set
        const httpsConfig = this.config.https;
        if (httpsConfig.enabled && !request.isHttps && httpsConfig.enforce) {
            /*
             * if in production, use redirectPort while redirecting, which would always be 443,
             * as likely, application will be running using a reverse proxy server.
            */
            const port = this.config.env === ENV.PRODUCTION? httpsConfig.redirectPort : httpsConfig.port;
            response.redirect(
                'https://' + path.join(request.hostname +  ':' + port, request.url)
            );
        }
    }

    /**
     * handle server close event
     *@param {http.Server|https.Server} server - http or https server
    */
    onClose(server) {
        this.closingCount += 1;
        const intro = server instanceof https.Server? 'https' : 'http';

        this.logger.info( intro + ' connection closed successfully');

        if (this.closingCount === 2 || this.httpsServer === null) {
            this.logger.close();
            const callback = this.closeCallback;
            this.closeCallback = null;
            callback();
        }
    }

    /**
     * handles client error events
     *@param {Error} err - client error
     *@param {net.Socket} socket - the socket object
    */
    onClientError(err, socket) {
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    }

    /**
     * handle server error events
     *@param {Error} err - the error event
    */
    onServerError(err) {
        //log to the console
        this.logger.warn('Error: ' + err.code + ' ' + err.message);
    }

    /**
     * handles server listening event
     *@param {http.Server|https.Server} server - http or https server
     *@param {Callable} callback - listening callback method
    */
    onListening(server, callback) {
        this.listeningCount += 1;

        const address = server.address();
        const intro = server instanceof https.Server? 'https' : 'http';

        this.logger.info(intro + ' server started on port ' + address.port);

        if (this.listeningCount === 2 || this.httpsServer === null)
            callback();
    }

    /**
     * binds all event handlers on the server.
     *@param {http.Server|https.Server} server - http or https server
     *@param {Callable} callback - listening callback method
    */
    initServer(server, callback) {
        //handle server listening event
        server.on('listening', Util.generateCallback(this.onListening, this, [server, callback]))

            //handle on error event
            .on('error', Util.generateCallback(this.onServerError, this))

            //handle server close event
            .on('close', Util.generateCallback(this.onClose, this, server))

            //handle server client error
            .on('clientError', Util.generateCallback(this.onClientError, this))

            //handle server request
            .on('request', Util.generateCallback(this.onRequest, this));
    }

    /**
     * closes the connection
     *@param {Function} [callback] - a callback function to execute once the server closes
    */
    close(callback) {
        this.closeCallback = Util.isCallable(callback)? callback : () => {};
        this.httpServer.close();

        if (this.httpsServer !== null)
            this.httpsServer.close();
    }

    /**
     * returns the bound address that the server is listening on
     *@returns {Object}
    */
    address() {
        if (this.listening)
            return this.httpServer.address();
        else
            return null;
    }

    /**
     * returns the bound address that the https server is listening on
     *@returns {Object}
    */
    httpsAddress() {
        if (this.httpsListening)
            return this.httpsServer.address();
        else
            return null;
    }

    /**
     * starts the server at a given port
     *@param {number} [port=4000] - the port to listen on.
     *@param {Function} [callback] - a callback function to execute once the server starts
     * listening on the given port
    */
    listen(port, callback) {
        if (this.listening) {
            //log error to the console
            this.logger.warn('Server already started. You must close the server first');
            return;
        }

        callback = Util.isCallable(callback)? callback : () => {};

        this.initServer(this.httpServer, callback);
        this.httpServer.listen( port || process.env.PORT || 4000);

        if (this.httpsServer !== null) {
            this.initServer(this.httpsServer, callback);
            this.httpsServer.listen(this.config.https.port);
        }
    }
}