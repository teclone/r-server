import Server from '../../src/modules/Server.js';
import path from 'path';
import fs from 'fs';
import Router from '../../src/modules/Router.js';
import Engine from '../../src/modules/Engine.js';
import request from 'request';
import sinon from 'sinon';
import inbuiltConfig from '../../src/.rsvrc.json';

describe('Server', function() {

    let server = null;
    beforeEach(function() {
        server = new Server('.rsvrc.json');
    });

    describe('#constructor(config?)', function() {

        it(`should an accept an optional string pointing to a user defined config path relative
        to the project root directory`, function() {
            expect(server).to.be.an('RServer');
        });

        it(`the config parameter can also be an object defining server configurations`, function() {
            expect(new Server({env: 'production'})).to.be.an('RServer');
        });

        it(`should create an RServer instance even without the optional config parameter`, function() {
            expect(new Server()).to.be.an('RServer');
        });
    });

    describe('#getEntryPath(knownPath)', function() {
        it(`should inspect the given known path and return the project's roots
            directory`, function() {
            const root = path.join(__dirname, '../../', '/');
            expect(server.getEntryPath(__dirname)).to.equals(root);
        });

        it(`should run the process by spliting the path at the first occurrence of
            node_modules`, function() {
            const root = path.join(__dirname, '../../', '/');

            expect(server.getEntryPath(path.join(root, 'node_modules/mocha/bin/main.js')))
                .to.equals(root);
        });
    });

    describe('resolveConfg(entryPath, config)', function() {
        it(`if given a string as second parameter, it should load the config from the given path
            and merge it with the inbuilt default config parameters`, function() {
            const entryPath = path.join(__dirname, '../../');

            const config = server.resolveConfig(entryPath, 'test/helpers/.rsvrc.json');
            expect(config.maxBufferSize).to.equals(10);
        });

        it(`if given an object as second parameter, it should merge it with the inbuilt default
            config parameters`, function() {
            const entryPath = path.join(__dirname, '../../'),
                config = server.resolveConfig(entryPath, {maxBufferSize: 20});

            expect(config.maxBufferSize).to.equal(20);
        });

        it(`should do nothing if config is a path string which does not exist and return only a
            clone of the internally defined config object`, function() {
            const entryPath = path.join(__dirname, '../../');

            const config = server.resolveConfig(entryPath, 'test/helpers/.rsvr.json');
            expect(config.maxBufferSize).to.equals(inbuiltConfig.maxBufferSize);
        });

        it(`should prioritize the NODE_ENV property if it is set`, function() {
            process.env.NODE_ENV = 'production';

            const config = server.resolveConfig(
                path.join(__dirname, '../../'),
                {env: 'development'}
            );
            expect(config.env).to.equals('production');
            delete process.env.NODE_ENV;
        });
    });

    describe('#mount(baseUrl, router)', function() {
        it(`should mount the given router to the main app, resolving the router routes and
        and middleware urls`, function() {
            const router = new Router(true),
                callback = () => {};

            router.route('/login').get(callback).post(callback);
            router.route('/signup').get(callback).post(callback);

            router.use('*', callback);
            server.mount('auth', router);

            expect(server.mountedRouters).to.be.lengthOf(1);
            const mountedRouter = server.mountedRouters[0];

            expect(mountedRouter.routes.get).deep.equals([
                ['auth/login', callback, null],
                ['auth/signup', callback, null],
            ]);

            expect(mountedRouter.routes.post).deep.equals([
                ['auth/login', callback, null],
                ['auth/signup', callback, null],
            ]);

            expect(mountedRouter.middlewares).deep.equals([
                ['auth/*', callback, null],
            ]);
        });

        it(`should do nothing if argument is not an instance of the Router module`, function() {

            server.mount('auth', {});
            expect(server.mountedRouters).to.be.lengthOf(0);
        });
    });

    describe('getter #listening', function() {
        it(`should return a boolean value indicating if the server is currently listening for
        requests`, function(done) {
            expect(server.listening).to.be.false;

            server.listen(4000, () => {
                expect(server.listening).to.be.true;
                server.close(() => {
                    done();
                });
            });
        });
    });

    describe('#listen(port?, callback?)', function() {
        it(`should start the server at the given port and info a message to the console`, function(done) {
            sinon.spy(server.logger, 'info');

            expect(server.listening).to.be.false;
            server.listen(9000, () => {
                expect(server.listening).to.be.true;
                expect(server.logger.info.called).to.be.true;
                expect(server.address().port).to.equals(9000);

                server.close(() => {
                    done();
                });
            });
        });

        it(`should start the server at port process.env.PORT if not given`, function(done) {
            process.env.PORT = 8000;
            expect(server.listening).to.be.false;

            server.listen(null, () => {
                expect(server.listening).to.be.true;
                expect(server.address().port).to.equals(8000);
                delete process.env.PORT;
                server.close(() => {
                    done();
                });
            });
        });

        it(`should start the server at port 4000 if port is not given and process.env.PORT
            is not defined`, function(done) {
            expect(server.listening).to.be.false;

            server.listen(null, () => {
                expect(server.listening).to.be.true;
                expect(server.address().port).to.equals(4000);
                server.close(() => {
                    done();
                });
            });
        });

        it(`should ignore subsequent calls if the server is already listening and simply log
            a warning error message`, function(done) {
            server.listen(null, () => {
                expect(server.listening).to.be.true;

                sinon.spy(server.logger, 'warn');
                server.listen();

                expect(server.logger.warn.calledOnce).to.be.true;
                server.logger.warn.restore();
                server.close(() => {
                    done();
                });
            });
        });
    });

    describe('#close(callback?)', function() {
        it(`should close the connection when called and info message to the console`, function(done) {
            sinon.spy(server.logger, 'info');
            server.listen(4000, function() {
                expect(server.listening).to.be.true;
                server.close(function() {
                    expect(server.listening).to.be.false;
                    expect(server.logger.info.called).to.be.true;
                    done();
                });
            });
        });
    });

    describe('#address()', function() {
        it(`should return the server address if the server is listening`, function(done) {
            server.listen(null, function() {
                expect(server.address().port).to.equals(4000);
                server.close(function() {
                    expect(server.listening).to.be.false;
                    done();
                });
            });
        });

        it(`should return null if server is not running`, function() {
            expect(server.address()).to.be.null;
        });
    });

    describe('#onServerError()', function() {
        it(`should handle server error such as trying to listen on an already taken port and
        log warning message to the console`, function(done) {
            const testServer = new Server();
            sinon.spy(testServer, 'onServerError');
            sinon.spy(testServer.logger, 'warn');

            server.listen(null, function() {
                testServer.listen(null);
                server.close(function() {
                    expect(testServer.onServerError.calledOnce).to.be.true;
                    expect(testServer.logger.warn.called).to.be.true;
                    done();
                });
            });
        });
    });

    describe('#onClientError(err, socket)', function() {
        it (`should handle every client error on the server by simply ending the socket`, function(done) {
            sinon.spy(server, 'onClientError');
            server.listen(null, () => {
                server.server.emit('clientError');
                expect(server.onClientError.called).to.be.true;
                server.onClientError.restore();

                server.close(() => {
                    done();
                });
            });
        });
    });

    describe('#onRequestError()', function() {
        it(`should handle errors that occurs on the request, calling logger.fatal method to
        log the error and end the response`, function(done) {

            sinon.spy(server, 'onRequestError');
            sinon.spy(server.logger, 'fatal');

            server.router.get('say-hi', (req) => {
                req.emit('error', 'something went bad');
            });

            server.listen(null, function() {
                request.get('http://localhost:4000/say-hi', () => {
                    expect(server.onRequestError.calledOnce).to.be.true;
                    expect(server.logger.fatal.called).to.be.true;

                    server.onRequestError.restore();
                    server.close(function() {
                        done();
                    });
                });
            });
        });
    });

    describe('#onResponseError()', function() {
        it(`should handle errors that occurs on the response, calling logger.fatal method to
        log error and end the response`, function(done) {

            sinon.spy(server, 'onResponseError');
            sinon.spy(server.logger, 'fatal');

            server.router.get('say-hi', (req, res) => {
                res.emit('error', 'something went bad');
            });

            server.listen(null, function() {
                request.get('http://localhost:4000/say-hi', () => {
                    expect(server.onResponseError.calledOnce).to.be.true;
                    expect(server.logger.fatal.called).to.be.true;

                    server.close(function() {
                        done();
                    });
                });
            });
        });
    });
});