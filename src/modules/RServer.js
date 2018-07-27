import fs from 'fs';
import path from 'path';

import Util from './Util.js';
import http from 'http';
import StaticFileServer from './StaticFileServer.js';
import RoutingEngine from './RoutingEngine.js';
import Router from './Router.js';
import BodyParser from './BodyParser.js';
import _config from '../.rsvrc.json';
import './RServerResponse.js';
import Logger from './Logger.js';

export default class {

    /**
     *@param {string} configPath - user specified configuration path
    */
    constructor(configPath) {

        this.router = new Router(false);
        this.mountedRouters = [];

        /* istanbul ignore else */
        if (require.main)
            this.entryPath = this.getEntryPath(require.main.filename);
        else
            this.entryPath = this.getEntryPath(__dirname);

        this.config = this.resolveConfig(this.entryPath, configPath || '.rsvrc.json');

        this.staticfileServer = new StaticFileServer(
            this.entryPath,
            this.config.staticFileDir,
            this.config.mimeTypes,
            this.config.defaultDocuments,
            this.config.cacheControl
        );

        this.bodyParser = new BodyParser(
            path.join(this.entryPath, this.config.tempDir, '/'),
            this.config.encoding
        );

        this.server = http.createServer();

        this.initServer();
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
    */
    getEntryPath(knownPath) {

        if (knownPath.indexOf('node_modules') > 0)
            return knownPath.split('node_modules/')[0];

        let currentPath = path.join(knownPath, '../');
        while (currentPath !== '/') {
            if (fs.existsSync(currentPath + '/package.json'))
                return currentPath;

            currentPath = path.join(currentPath, '../');
        }

        /* istanbul ignore next */
        return '';
    }

    /**
     * resolves the configuration object
     *@param {string} entryPath - the project root path
     *@param {string} configPath - the project config file relative path
    */
    resolveConfig(entryPath, configPath) {
        let config = null,
            absConfigPath = path.join(entryPath, configPath);

        if (fs.existsSync(absConfigPath))
            config = Util.mergeObjects(_config, require(absConfigPath));
        else
            config = _config;

        return config;
    }

    /**
     * mounts a router to the main app
     *@param {string} baseUrl - the router baseUrl
     *@param {Router} router - the router instance
    */
    mount(baseUrl, router) {
        //join all routers url
        let routes = router.routes;
        for (let api of Object.keys(routes)) {
            let apiRoutes = routes[api];
            for (let apiRoute of apiRoutes)
                apiRoute[0] = path.join(baseUrl, apiRoute[0]);
        }

        this.mountedRouters.push(router);
    }

    /**
     * runs all request routes
     *@param {RouterEngine} router - the router engine instance
     *@param {string} api - the route api to call
     *@param {Array} routes - routes array
     *@returns {boolean}
    */
    runRoutes(engine, api, routes) {
        api = api.toLowerCase();
        for (let route of routes) {
            engine[api](...route);
            if (engine.resolved)
                return true;
        }
        return false;
    }

    /**
     * cordinates how routes are executed, including mounted routes
     *@param {string} url - request url
     *@param {string} method - request method
     *@param {http.IncomingMessage} request - the request object
     *@param {RServerResponse} response - the response object
     *@returns {boolean}
    */
    cordinateRoutes(url, method, request, response) {
        method = method.toLowerCase();

        let engine = new RoutingEngine(url, method, request, response),
            router = this.router;

        //run on the main router thread
        engine.use(router.middlewares);

        if (this.runRoutes(engine, 'all', router.routes['all']))
            return true;
        if (this.runRoutes(engine, method, router.routes[method]))
            return true;

        //run on the mounted routers' thread
        for (let mountedRouter of this.mountedRouters) {
            let middlewares = mountedRouter.inheritMiddlewares?
                [...router.middlewares, ...mountedRouter.middlewares] : mountedRouter.middlewares;

            engine.use(middlewares);

            if (this.runRoutes(engine, 'all', mountedRouter.routes['all']))
                return true;
            /* istanbul ignore else */
            if (this.runRoutes(engine, method, mountedRouter.routes[method]))
                return true;
        }

        return false;
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
     * perform house keeping
     *@param {http.IncomingMessage} request - the request object
    */
    onResponseFinish(request, response) {
        response.staticfileServer = null;

        Logger.logProfile(request, response);
        this.bodyParser.cleanUpTempFiles(request.files);
    }

    /**
     * handle request data event
     *@param {http.IncomingMessage} request - the request object
     *@param {RServerResponse} response - the response object
     *@param {Object} bufferDetails - the buffer details
     *@param {number} bufferDetails.size - the buffer size
     *@param {Array} bufferDetails.buffers - array containing chunks of buffer data
    */
    onRequestEnd(request, response, bufferDetails) {

        //profile the response time
        response.startTime = Date.now();

        let {url, method, headers} = request;

        request.files = {};
        request.query = {};
        request.body = {};

        response.staticfileServer = this.staticfileServer;

        //clean up resources once the response has been sent out
        response.on('finish', Util.generateCallback(this.onResponseFinish, this,
            [request, response]
        ));

        if (this.staticfileServer.serve(url, method, headers, response))
            return;

        this.parseRequestData(request, url, bufferDetails.buffers);

        if (this.cordinateRoutes(url, method, request, response))
            return;

        //send 404 response if router did not resolved
        let httpErrors = this.config.httpErrors;
        this.staticfileServer.serveHttpErrorFile(
            response, 404, httpErrors.baseDir, httpErrors['404']
        );
    }

    /**
     * handle request data event
    */
    onRequestData(chunk, request, response, bufferDetails) {
        bufferDetails.size += chunk.length;

        if (bufferDetails.size <= this.config.maxBufferSize)
            bufferDetails.buffers.push(chunk);
        else
            request.destroy(new Error('Payload too large'));
    }

    /**
     * handles request events
    */
    onRequest(request, response) {
        //profile the request time
        request.startTime = Date.now();

        let bufferDetails = {buffers: [], size: 0};

        //handle on data event
        request.on('data', Util.generateCallback(this.onRequestData, this,
            [request, response, bufferDetails]
        ));

        //handle on data event
        request.on('end', Util.generateCallback(this.onRequestEnd, this,
            [request, response, bufferDetails]
        ));
    }

    /**
     * handle server close event
    */
    onClose() {
        Logger.info('connection closed successfully');
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
    onError(err) {
        console.log(err);
        if (err.code === 'EADDRINUSE')
            Logger.error('Server can\'t be started, address already in use');

        else
            Logger.error('Error :- ' + err.code + ' ' + err.message);
    }

    /**
     * handles server listening event
    */
    onListening() {
        let address = this.server.address();
        Logger.info('Server started on port ' + address.port);
    }

    /**
     * binds all event handlers on the server.
    */
    initServer() {
        //handle server listening event
        this.server.on('listening', Util.generateCallback(this.onListening, this))

            //handle on error event
            .on('error', this.onError)

            //handle server close event
            .on('close', this.onClose)

            //handle server client error
            .on('clientError', this.onClientError)

            //handle server request
            .on('request', Util.generateCallback(this.onRequest, this));
    }

    /**
     * starts the server at a given port
     *@param {number} [port=4000] - the port to listen on.
     *@param {Function} [callback] - a callback function to execute once the server starts
     * listening on the given port
    */
    listen(port, callback) {
        if (this.listening) {
            Logger.error('Server already started. You must close the server first.');
            return;
        }
        callback = Util.isCallable(callback)? callback : () => {};
        this.server.listen( port || 4000, callback);
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
}