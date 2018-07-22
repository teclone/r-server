import fs from 'fs';
import path from 'path';

import Util from './Util.js';
import http from 'http';
import StaticFileServer from './StaticFileServer.js';
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