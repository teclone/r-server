import Server from '../../src/modules/Server.js';
import path from 'path';
import fs from 'fs';
import Router from '../../src/modules/Router.js';
import Engine from '../../src/modules/Engine.js';
import request from 'request';
import sinon from 'sinon';

describe('Server', function() {

    let server = null;
    beforeEach(function() {
        server = new Server('.rsvrc.json');
    });

    describe('#constructor(configPath?)', function() {

        it(`should create an RServer instance given the user defined config path that is
            relative to the root directory`, function() {
            expect(server).to.be.an('RServer');
        });

        it(`should set the router property to a new Router instance that does not
        inherit middlewares`, function() {
            expect(server.router).to.be.a('Router');
            expect(server.router.inheritMiddlewares).to.be.false;
        });

        it(`should create an RServer instance even without the user defined config path`, function() {
            expect(new Server()).to.be.an('RServer');
        });
    });

    describe('#getEntryPath(knownPath)', function() {
        it(`should inspect the given known path and return the projects roots
            directory`, function() {
            let root = path.join(__dirname, '../../', '/');
            expect(server.getEntryPath(__dirname)).to.equals(root);
        });

        it(`should run the process by spliting the path at the first occurrence of
            node_modules`, function() {
            let root = path.join(__dirname, '../../', '/');

            expect(server.getEntryPath(path.join(root, 'node_modules/mocha/bin/main.js')))
                .to.equals(root);
        });
    });

    describe('resolveConfg(entryPath, config)', function() {
        it(`should merge the user defined config object that is located at the given
            config string argument with the internally defined config object`, function() {
            let config = '.rsvrc.json',
                entryPath = path.join(__dirname, '../../');

            config = server.resolveConfig(entryPath, config);
            expect(config).to.be.an('Object');
        });

        it(`should merge the user defined config object with the internally defined config
        object if the config argument is an object`, function() {
            let entryPath = path.join(__dirname, '../../'),
                config = server.resolveConfig(entryPath, {maxBufferSize: 10});

            expect(config.maxBufferSize).to.equal(10);
        });

        it(`should do nothing if config is a path string which does not exist and return only a
            clone of the internally defined config object`, function() {
            let config = '.rsvc.json',
                entryPath = path.join(__dirname, '../../');

            config = server.resolveConfig(entryPath, config);
            expect(config).to.be.an('Object');
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
        it(`should start the server at the given port`, function(done) {
            expect(server.listening).to.be.false;

            server.listen(null, () => {
                expect(server.listening).to.be.true;
                server.close(() => {
                    done();
                });
            });
        });

        it(`should ignore subsequent calls if the server is already listening and simply log
            a warning error message`, function(done) {
            server.listen(null, () => {
                expect(server.listening).to.be.true;

                sinon.spy(server.logger, 'error');
                server.listen();

                expect(server.logger.error.calledOnce).to.to.true;
                server.logger.error.restore();
                server.close(() => {
                    done();
                });
            });
        });
    });

    describe('#close(callback?)', function() {
        it(`should close the server when called`, function(done) {
            server.listen(4000, function() {
                expect(server.listening).to.be.true;
                server.close(function() {
                    expect(server.listening).to.be.false;
                    done();
                });
            });
        });
    });

    describe('#address()', function() {
        it(`should return the server bound address if the server is listening else,
            return null`, function(done) {
            expect(server.address()).to.be.null;

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

    describe('#onError()', function() {
        it(`should handle server error such as trying to listen on an already taken port`, function(done) {
            let testServer = new Server();
            sinon.spy(testServer, 'onServerError');

            server.listen(null, function() {
                testServer.listen(null);
                server.close(function() {
                    expect(testServer.onServerError.calledOnce).to.be.true;
                    done();
                });
            });
        });
    });

    describe('#mount(baseUrl, router)', function() {
        it(`should mount the given router to the main app`, function() {
            let router = new Router(true);
            let callback = () => {};

            router.get('/login', callback);
            router.get('/signup', callback);
            router.post('/login', callback);
            router.post('/signup', callback);

            server.mount('auth', router);

            expect(server.mountedRouters).to.be.lengthOf(1).and.to.satisfy(function(mountedRouters) {
                return mountedRouters[0] === router;
            });
        });

        it(`should resolve the routers route urls with the given base url before mounting`, function() {
            let router = new Router(true);
            let callback = () => {};

            router.get('/login', callback);
            router.get('/signup', callback);
            router.post('/login', callback);
            router.post('/signup', callback);

            server.mount('auth', router);

            expect(router.routes.get[0][0]).to.equals('auth/login');
        });
    });

    describe('#runRoutes(engine, api, routes)', function() {
        it(`should synchronously run the given routes by calling the api method on the engine, and return
        a promise that resolves to a boolean value`, function() {
            const callback = sinon.spy();

            let engine = new Engine('user/1/profile', 'GET', {}, {}, []);

            server.router.get('auth/login', callback);
            server.router.get('user/{id}/profile', callback);

            return server.runRoutes(engine, 'GET', server.router.routes['get'])
                .then(status => {
                    expect(status).to.be.true;
                    expect(callback.calledOnce).to.be.true;
                });
        });

        it(`the promise should resolve to false if there is no matching route found`, function() {
            let callback = sinon.spy();

            let engine = new Engine('user/1/profile', 'GET', {}, {}, []);

            server.router.get('auth/login', callback);
            server.router.get('user/{id}/profil', callback);

            return server.runRoutes(engine, 'GET', server.router.routes['get'])
                .then(status => {
                    expect(status).to.be.false;
                    expect(callback.callCount).to.equals(0);
                });
        });
    });

    describe('functional testing', function() {

        it (`should listen for requests, run the process, and call the appropriate
        route`, function(done) {
            server.router.get('say-name', (req, res) => {
                res.status(200).end('R-Server');
            });
            server.listen(null, () => {
                request.get('http://localhost:4000/say-name', (err, res, body) => {
                    expect(res.statusCode).to.equal(200);
                    expect(body).to.equal('R-Server');

                    server.close(() => {
                        done();
                    });
                });
            });
        });

        it (`should listen for requests, run the process, and call the appropriate route,
            running the all routes first`, function(done) {

            server.router.all('/say-name', (req, res) => {
                res.status(200).setHeaders().end('R-Server-All');
            });
            server.router.get('/say-name', (req, res) => {
                res.status(200).end('R-Server-Get');
            });

            server.listen(null, function() {
                request.get('http://localhost:4000/say-name', (err, res, body) => {
                    expect(res.statusCode).to.equal(200);
                    expect(body).to.equal('R-Server-All');

                    server.close(() => {
                        done();
                    });
                });
            });
        });

        it (`should listen for requests, run the process, and call the appropriate route,
            checking mounted routes if no main app routes matches the request`, function(done) {
            const router = new Router(false);

            router.get('/say-name', (req, res) => {
                res.setHeader('Content-Type', 'text/plain').end('R-Server-Get');
            });

            server.listen(null, function() {
                server.mount('/', router); // we can mount even after the server is started
                request.get('http://localhost:4000/say-name', (err, res, body) => {
                    expect(res.statusCode).to.equal(200);
                    expect(body).to.equal('R-Server-Get');

                    server.close(() => {
                        done();
                    });
                });
            });
        });

        it(`should listen for requests, run the process, and call the appropriate route,
        checking mounted routes if no main app routes matches the request, it should
        run all routes first`, function(done) {
            const router = new Router(true);

            router.all('/say-name', (req, res) => {
                res.status(200).setHeaders({'Content-Type': 'text/plain'}).json({name: 'R-Server-All'});
            });
            router.get('/say-name', (req, res) => {
                res.status(200).end('R-Server-Get');
            });

            server.listen(null, () => {
                server.mount('/', router);

                request.get('http://localhost:4000/say-name', (err, res, body) => {
                    expect(res.statusCode).to.equal(200);
                    expect(JSON.parse(body).name).to.equal('R-Server-All');

                    server.close(() => {
                        done();
                    });
                });
            });
        });

        it (`should send 404 response if no route matches request`, function(done) {

            server.listen(null, () => {
                request.get('http://localhost:4000/say-name', (err, res) => {
                    expect(res.statusCode).to.equal(404);
                    server.close(() => {
                        done();
                    });
                });
            });
        });

        it (`should parse request body if there is any`, function(done) {
            server.router.post('report-json', (req, res) => {
                res.json(JSON.stringify(req.body));
            });

            server.listen(null, function() {
                const data = {
                    name: 'Harrison',
                    password1: 'random_243',
                    password2: 'random_243'
                };

                request.post({url:'http://localhost:4000/report-json', form: data}, (err, res, body) => {
                    let json = JSON.parse(body);
                    expect(json.name).to.equal('Harrison');

                    server.close(() => {
                        done();
                    });
                });
            });
        });

        it (`should serve static file if it exists and return`, function(done) {
            server.listen(null, function() {
                request.get('http://localhost:4000/package.json', (err, res, body) => {
                    let fileContent = fs.readFileSync(
                        path.resolve(__dirname, '../../package.json')
                    );
                    expect(fileContent.toString()).to.equal(body);
                    server.close(() => {
                        done();
                    });
                });
            });
        });

        it (`should return a 413 entity too large status code if the buffer sent exceeds the maxBufferSize
            config option`, function(done) {
            let server = new Server({maxBufferSize: 10});
            server.listen(null, function() {
                const data = {
                    name: 'Harrison',
                    password1: 'random_243',
                    password2: 'random_243'
                };

                request.post('http://localhost:4000', {form: data}, (err, res) => {
                    expect(res.statusCode).to.equal(413);

                    server.close(() => {
                        done();
                    });
                });
            });
        });
    });
});