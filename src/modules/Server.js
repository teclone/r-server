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
import FileServer from './FileServer.js';
import Engine from './Engine.js';
import Router from './Router.js';
import BodyParser from './BodyParser.js';
import _config from '../.rsvrc.json';
import Logger from './Logger.js';

require('./Response');

export default class {

    /**
     *@param {string|serverConfig} [config] - optional config file string path or config object
    */
    constructor(config) {

        this.router = new Router(false); // the main router. the root router
        this.mountedRouters = []; //mounted routers

        /* istanbul ignore else */
        if (require.main)
            this.entryPath = this.getEntryPath(require.main.filename);
        else
            this.entryPath = this.getEntryPath(__dirname);

        this.config = this.resolveConfig(this.entryPath, config || '.rsvrc.json');

        this.fileServer = new FileServer(this.entryPath, this.config);

        this.bodyParser = new BodyParser(
            path.join(this.entryPath, this.config.tempDir, '/'),
            this.config.encoding
        );

        this.server = http.createServer();

        this.logger = new Logger(
            path.join(this.entryPath, this.config.errorLog),
            path.join(this.entryPath, this.config.accessLog),
            this.config
        );
    }

    /**
     * returns the server identity
     *@returns {string}
    */
    get [Symbol.toStringTag]() {
        return 'RServer';
    }

    /**
     * returns boolean indicating if the server is listening
    */
    get listening() {
        return this.server.listening;
    }

    /**
     * returns the project's entry path
     *@param {string} knownPath - the known path for the mean time
     *@return {string}
    */
    getEntryPath(knownPath) {

        if (knownPath.indexOf('node_modules') > 0)
            return knownPath.split('node_modules/')[0];

        let entryPath = path.join(knownPath, '../');
        while (entryPath !== '/') {
            if (fs.existsSync(entryPath + '/package.json'))
                break;

            entryPath = path.join(entryPath, '../');
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
            const absPath = path.join(entryPath, config);
            if (fs.existsSync(absPath))
                config = require(absPath);
        }

        config = Util.assign(null, _config, config);

        //prioritize node_env setting to config file setting
        if (typeof process.env.NODE_ENV !== 'undefined')
            config.env = process.env.NODE_ENV;

        return config;
    }

    /**
     * mounts a router to the main app
     *@param {string} baseUrl - the router baseUrl
     *@param {Router} router - the router instance
    */
    mount(baseUrl, router) {
        baseUrl = baseUrl.replace(/\/+$/, '');
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
        let engine = new Engine(url, method, request, response, [], this.logger),
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
            let result = this.bodyParser.parse(Buffer.concat(buffers),
                request.headers['content-type']);

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

        //profile the response time
        response.startTime = new Date();

        if (bufferDetails.size > this.config.maxBufferSize)
            return response.status(413).end('Entity too large');

        let {url, method, headers} = request;

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
    }

    /**
     * handle server close event
    */
    onClose() {
        this.logger.info('connection closed successfully').close();
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
    */
    onListening() {
        let address = this.server.address();
        this.logger.info('Server started on port ' + address.port); //info to the console
    }

    /**
     * binds all event handlers on the server.
    */
    initServer() {
        //handle server listening event
        this.server.on('listening', Util.generateCallback(this.onListening, this))

            //handle on error event
            .on('error', Util.generateCallback(this.onServerError, this))

            //handle server close event
            .on('close', Util.generateCallback(this.onClose, this))

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
        callback = Util.isCallable(callback)? callback : () => {};
        this.server.close(callback);
    }

    /**
     * returns the bound address that the server is listening on
     *@returns {Object}
    */
    address() {
        if (this.listening)
            return this.server.address();
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
        this.initServer();
        callback = Util.isCallable(callback)? callback : () => {};
        this.server.listen( port || process.env.PORT || 4000, callback);
    }
}