import RServer from '../../src/modules/RServer.js';
import path from 'path';
import http from 'http';
import fs from 'fs';
import Router from '../../src/modules/Router.js';
import RoutingEngine from '../../src/modules/RoutingEngine.js';

describe('RServer', function() {
    let rServer = null;
    beforeEach(function() {
        rServer = new RServer('.rsvrc.json');
    });

    describe('#constructor(configPath?)', function() {

        it(`should create an RServer instance given the user defined config path that is
            relative to the root directory`, function() {
            expect(rServer).to.be.an('RServer');
        });

        it(`should set the router property to a new Router instance that does not
        inherit middlewares`, function() {
            expect(rServer.router).to.be.a('Router');
            expect(rServer.router.inheritMiddlewares).to.be.false;
        });

        it(`should create an RServer instance even without the user defined config path`, function() {
            expect(new RServer()).to.be.an('RServer');
        });
    });

    describe('#getEntryPath(knownPath)', function() {
        it(`should inspect the given known path and return the projects roots
            directory`, function() {
            let root = path.join(__dirname, '../../', '/');
            expect(rServer.getEntryPath(__dirname)).to.equals(root);
        });

        it(`should run the process by spliting the path at the first occurrence of
            node_modules`, function() {
            let root = path.join(__dirname, '../../', '/');

            expect(rServer.getEntryPath(path.join(root, 'node_modules/mocha/bin/main.js')))
                .to.equals(root);
        });
    });

    describe('resolveConfg(entryPath, configPath)', function() {
        it(`should merge the user defined config object that is located at the given
            configPath with the internally defined config object`, function() {
            let config = '.rsvrc.json',
                entryPath = path.join(__dirname, '../../');

            config = rServer.resolveConfig(entryPath, config);
            expect(config).to.be.an('Object');
        });

        it(`should do nothing if the user defined config path does not exist, returning only the
            internally defined config object`, function() {
            let config = '.rsvrc.jso',
                entryPath = path.join(__dirname, '../../');

            config = rServer.resolveConfig(entryPath, config);
            expect(config).to.be.an('Object');
        });
    });

    describe('getter #listening', function() {
        it(`should return a boolean value indicating if the server is currently listening for
        requests`, function() {
            expect(rServer.listening).to.be.false;
        });
    });

    describe('#listen(port?, callback?)', function() {
        it(`should start the server at the given port`, function(done) {
            rServer.listen(4000, function() {
                rServer.close();
                done();
            });
        });

        it(`should start the server at a default port of 8131 if no port is given`, function(done) {
            rServer.listen(null, function() {
                rServer.close();
                done();
            });
        });

        it(`should start the server using a dummy callback if no callback is given`, function(done) {
            rServer.listen(null);
            setTimeout(function() {
                if (rServer.listening) {
                    rServer.close();
                    done();
                }
                else {
                    done(new Error('server could not listen'));
                }
            }, 1000);
        });
    });

    describe('#close(callback?)', function() {
        it(`should close the server when called`, function(done) {
            rServer.listen(4000, function() {
                rServer.close(function() {
                    done();
                });
            });
        });

        it(`should close the server using a dummy callback if no callback is given`, function(done) {
            rServer.listen(4000, function() {
                rServer.close();
                setTimeout(function() {
                    if (rServer.listening)
                        done(new Error('close method instance fails to close server'));
                    else
                        done();
                }, 500);
            });
        });
    });

    describe('#address()', function() {
        it(`should return the server bound address`, function(done) {
            rServer.listen(4000, function() {
                let address = rServer.address();
                rServer.close();
                if (address && address.port === 4000)
                    done();
                else
                    done(new Error('incorrect server address found'));
            });
        });

        it(`should return null if server is not running`, function() {
            expect(rServer.address()).to.be.null;
        });
    });

    describe('#onError()', function() {
        it(`should handle server error such as trying to listen on an already taken port`, function(done) {
            rServer.listen(null, function() {
                // port 4000 is no longer available
                let rServer2 = new RServer();
                rServer2.listen(); //throws error
                rServer.close();
                done();
            });
        });

        it(`should handle server error such as calling the listen method multiple times. It should
        ignore such multiple calls and simply log info on the console`, function(done) {
            rServer.listen(null, function() {
                //server is already listening
                rServer.listen(); //throws error
                rServer.close();
                done();
            });
        });

        it(`should handle all other arbitrary errors`, function() {
            rServer.server.emit('error', new Error('something went bad'));
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

            rServer.mount('auth', router);

            expect(rServer.mountedRouters).to.be.lengthOf(1).and.to.satisfy(function(mountedRouters) {
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

            rServer.mount('auth', router);

            expect(router.routes.get[0][0]).to.equals('auth/login');
        });
    });

    describe('#runRoutes(engine, api, routes)', function() {
        it(`should run the given routes call the engines method for the given api. it returns
        true if a matching route was executed and false if otherwise`, function() {
            let callback = () => {};

            let engine = new RoutingEngine('user/1/profile', 'GET', {}, {}, []);

            rServer.router.get('auth/login', callback);
            rServer.router.get('user/{id}/profile', callback);

            expect(rServer.runRoutes(engine, 'GET', rServer.router.routes['get'])).to.be.true;
        });

        it(`should return false if a matching route is not found`, function() {
            let callback = () => {};

            let engine = new RoutingEngine('user/1/profile', 'GET', {}, {}, []);

            rServer.router.get('auth/login', callback);
            rServer.router.get('user/{id}/profil', callback);

            expect(rServer.runRoutes(engine, 'GET', rServer.router.routes['get'])).to.be.false;
        });
    });

    describe('integrated testing', function() {
        it (`should listen for requests, run the process, and call the appropriate route`, function(done) {
            rServer.listen(null, function() {
                rServer.router.get('/say-name', (req, res) => {
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.end('R-Server');
                });

                http.request('http://localhost:4000/say-name', (res) => {
                    let buffers = [];
                    res.on('data', (chunk) => {
                        buffers.push(chunk);
                    })
                        .on('end', () => {
                            rServer.close();
                            let data = Buffer.concat(buffers);
                            if (data.toString() === 'R-Server')
                                done();
                            else
                                done(new Error('wrong data received from the endpoint'));
                        });
                })
                    .end();
            });
        });

        it (`should listen for requests, run the process, and call the appropriate route,
            running the all routes first`, function(done) {
            rServer.listen(null, function() {
                rServer.router.all('/say-name', (req, res) => {
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.end('R-Server-All');
                });
                rServer.router.get('/say-name', (req, res) => {
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.end('R-Server-Get');
                });

                http.request('http://localhost:4000/say-name', (res) => {
                    let buffers = [];
                    res.on('data', (chunk) => {
                        buffers.push(chunk);
                    })
                        .on('end', () => {
                            rServer.close();
                            let data = Buffer.concat(buffers);
                            if (data.toString() === 'R-Server-All')
                                done();
                            else
                                done(new Error('wrong data received from the endpoint'));
                        });
                })
                    .end();
            });
        });

        it (`should listen for requests, run the process, and call the appropriate route,
            checking mounted routes if no main app routes matches the request`, function(done) {
            rServer.listen(null, function() {
                let router = new Router(false);
                router.get('/say-name', (req, res) => {
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.end('R-Server-Get');
                });
                rServer.mount('/', router);

                http.request('http://localhost:4000/say-name', (res) => {
                    let buffers = [];
                    res.on('data', (chunk) => {
                        buffers.push(chunk);
                    })
                        .on('end', () => {
                            rServer.close();
                            let data = Buffer.concat(buffers);
                            if (data.toString() === 'R-Server-Get')
                                done();
                            else
                                done(new Error('wrong data received from the endpoint'));
                        });
                })
                    .end();
            });
        });

        it (`should listen for requests, run the process, and call the appropriate route,
            checking mounted routes if no main app routes matches the request, it should
            run all routes first`, function(done) {
            rServer.listen(null, function() {
                let router = new Router(true);
                router.all('/say-name', (req, res) => {
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.end('R-Server-All');
                });
                router.get('/say-name', (req, res) => {
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.end('R-Server-Get');
                });
                rServer.mount('/', router);

                http.request('http://localhost:4000/say-name', (res) => {
                    let buffers = [];
                    res.on('data', (chunk) => {
                        buffers.push(chunk);
                    })
                        .on('end', () => {
                            rServer.close();
                            let data = Buffer.concat(buffers);
                            if (data.toString() === 'R-Server-All')
                                done();
                            else
                                done(new Error('wrong data received from the endpoint'));
                        });
                })
                    .end();
            });
        });

        it (`should send 404 response if no route matches request`, function(done) {
            rServer.listen(null, function() {
                http.request('http://localhost:4000/say-name', (res) => {
                    let buffers = [];
                    res.on('data', (chunk) => {
                        buffers.push(chunk);
                    })
                        .on('end', () => {
                            rServer.close();

                            if (res.statusCode === 404)
                                done();
                            else
                                done(new Error('wrong response status code recieved'));
                        });
                })
                    .end();
            });
        });

        it (`should parse request body if there is any`, function(done) {
            rServer.listen(null, function() {
                rServer.router.post('report-json', (req, res) => {
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify(req.body));
                });

                let data = {
                        name: 'Harrison',
                        password1: 'random_243',
                        password2: 'random_243'
                    },
                    options = {
                        hostname: 'localhost', path: '/report-json',
                        port: 4000, method: 'POST', headers: {'Content-Type': 'application/json'}
                    };

                let req = http.request(options, (res) => {
                    let buffers = [];

                    res.on('data', (chunk) => {
                        buffers.push(chunk);
                    })

                        .on('end', () => {
                            rServer.close();
                            let json = JSON.parse(Buffer.concat(buffers).toString());
                            if (data.name === json.name && data.password1 === json.password1 &&
                            data.password2 === json.password2)
                                done();
                            else
                                done(new Error('wrong data received from the endpoint'));
                        });
                });

                req.write(JSON.stringify(data));
                req.end();
            });
        });

        it (`should serve static file if it exist and return`, function(done) {
            rServer.listen(null, function() {
                http.request('http://localhost:4000/package.json', (res) => {
                    let buffers = [];
                    res.on('data', (chunk) => {
                        buffers.push(chunk);
                    })

                        .on('end', () => {
                            rServer.close();
                            let fileContent = fs.readFileSync(
                                path.resolve(__dirname, '../../package.json'));
                            if (fileContent.toString() === Buffer.concat(buffers).toString())
                                done();
                            else
                                done(new Error('wrong data received from the endpoint'));
                        });
                })
                    .end();
            });
        });

        it (`should destroy the request if the buffer sent exceeds the maxBufferSize config option`, function(done) {
            let rServer = new RServer('test/helpers/.rsvrc.json');
            rServer.listen(null, function() {

                let options = {
                    method: 'POST', hostname: 'localhost', port: 4000, path: '/report-json',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                };

                let data = {
                    name: 'Harrison',
                    password1: 'random_243',
                    password2: 'random_243'
                };

                let req = http.request(options, (res) => {
                    res.resume();
                    rServer.close();
                    done(new Error('server did not abort request as expected'));
                });

                req.on('error', () => {
                    rServer.close();
                    done();
                });

                req.write(JSON.stringify(data));
                req.end();
            });
        });
    });
});