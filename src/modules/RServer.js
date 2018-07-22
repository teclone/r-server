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
}