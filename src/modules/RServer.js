import fs from 'fs';
import path from 'path';

import Util from './Util.js';
import http from 'http';
import StaticFileServer from './StaticFileServer.js';
import Router from './Router.js';
import BodyParser from './BodyParser.js';
import _config from '../.rsvrc.json';
import RServerResponse from './RServerResponse.js';

export default class {

    /**
     *@param {string} configPath - user specified configuration path
    */
    constructor(configPath) {
        this.routes = [];
        this.middlewares = [];

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

        this.server = http.createServer({
            ServerResponse: RServerResponse.getClass(this.staticfileServer)
        });

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
     * starts the serve to listen on a given port
     *@param {number} port - the port to listen on.
    */
    listen(port) {
        port = port || 8131;
        this.server.listen(port);
        console.info('\x1b[32m%s\x1b[0m', 'Server started on port: ' + port);
    }

    /**
     * closes the connection
    */
    close() {
        this.server.close();
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
     * adds the given route to the routes array
     *@param {string} api - the route api
     *@param {string} baseUrl - the base url
     *@param {Function} callback - callback function
     *@param {Object} [options] - optional configuration options
    */
    addRoute(api, ...parameters) {
        this.routes.push({api, parameters});
    }

    /**
     * use a middleware
     *@param {Function} middleware - the middleware function
    */
    use(middleware) {
        if (Util.isCallable(middleware))
            this.middlewares.push(middleware);
    }

    /**
     * runs all request routes
     *@param {string} url - request url
     *@param {string} method - request method
     *@param {http.IncomingMessage} request - the request object
     *@param {RServerResponse} response - the response object
     *@returns {boolean}
    */
    runRoutes(url, method, request, response) {
        //create router and run routes
        let router = new Router(url, method, request, response, this.middlewares);
        //run routes
        for (const route of this.routes) {
            switch(route.api.toLowerCase()) {
                case 'get':
                    router.get(...route.parameters);
                    break;
                case 'post':
                    router.post(...route.parameters);
                    break;
                case 'delete':
                    router.delete(...route.parameters);
                    break;
                case 'put':
                    router.put(...route.parameters);
                    break;
                case 'route':
                    router.route(...route.parameters);
                    break;
                case 'head':
                    router.head(...route.parameters);
                    break;
                case 'options':
                    router.options(...route.parameters);
                    break;
            }

            if(router.resolved)
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
    onResponseFinish(request) {
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
        let {url, method, headers} = request;

        request.files = {};
        request.query = {};
        request.body = {};

        //clean up resources once the response has been sent out
        response.on('finish', Util.generateCallback(this.onResponseFinish, this,
            [request]
        ));

        if (this.staticfileServer.serve(url, method, headers, response))
            return;

        this.parseRequestData(request, url, bufferDetails.buffers);

        if (this.runRoutes(url, method, request, response))
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
        console.log('connection closed successfully');
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
     * binds all event handlers on the server.
    */
    initServer() {
        //handle server close event
        this.server.on('close', this.onClose)

        //handle server client error
            .on('clientError', this.onClientError)

        //handle server request
            .on('request', Util.generateCallback(this.onRequest, this));
    }
}