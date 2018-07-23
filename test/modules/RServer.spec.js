import RServer from '../../src/modules/RServer.js';
import path from 'path';
import http from 'http';
import fs from 'fs';

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

        it(`should create an RServer instance even without given the user defined config path`, function() {
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

    describe('#addRoute(api, ...parameters)', function() {
        it(`should add the route to the routes array`, function() {
            rServer.addRoute('get', '/', function() {});
            expect(rServer.routes[0].parameters[0]).to.equals('/');
        });
    });

    describe('#use(middleware)', function() {
        it(`should add the middleware to the middlewares array`, function() {
            let middleware = function() {};
            rServer.use(middleware);
            expect(rServer.middlewares[0]).to.equals(middleware);
        });

        it(`should do nothing if middleware is not a function`, function() {
            let middleware = null;
            rServer.use(middleware);
            expect(rServer.middlewares).to.be.lengthOf(0);
        });
    });

    describe('#listen(port?)', function() {
        it(`should start the server at the given port`, function() {
            rServer.listen(4000);
            expect(rServer.server.listening).to.be.true;
            rServer.close();
        });

        it(`should start the server at port 8131 if no port is given`, function() {
            rServer.listen();
            expect(rServer.server.listening).to.be.true;
            rServer.close();
        });
    });

    describe('#close()', function() {
        it(`should close the server`, function() {
            rServer.listen(4000);
            expect(rServer.server.listening).to.be.true;
            rServer.close();
            expect(rServer.server.listening).to.be.false;
        });
    });

    describe('#runRoutes(url, method, request, response)', function() {
        it(`should run the all the routes until the router resolves`, function() {
            let callback = function() {};
            rServer.addRoute('get', '/', callback);
            rServer.addRoute('post', '/', callback);
            rServer.addRoute('delete', '/', callback);
            rServer.addRoute('options', '/', callback);
            rServer.addRoute('head', '/', callback);
            rServer.addRoute('put', '/', callback);
            rServer.addRoute('route', '/', callback);

            let result = rServer.runRoutes('/index.js', 'GET', {}, {});
            expect(result).to.equals(false);
        });

        it(`should run the all the routes until the router resolves`, function() {
            let callback = function() {};
            rServer.addRoute('get', '/', callback);
            rServer.addRoute('post', '/', callback);
            rServer.addRoute('delete', '/', callback);
            rServer.addRoute('options', '/', callback);
            rServer.addRoute('head', '/', callback);
            rServer.addRoute('put', '/', callback);
            rServer.addRoute('route', '/', callback);

            let result = rServer.runRoutes('/index.js', 'GET', {}, {});
            expect(result).to.equals(false);
        });

        it(`should run all the routes until the router resolves`, function() {
            let callback = function() {};

            rServer.addRoute('get', '/', callback);
            rServer.addRoute('post', '/', callback);

            rServer.addRoute('delete', '/', callback);
            rServer.addRoute('options', '/', callback);

            rServer.addRoute('head', '/', callback);
            rServer.addRoute('put', '/', callback);

            rServer.addRoute('route', '/', callback);

            let result = rServer.runRoutes('/index.js', 'GET', {}, {});
            expect(result).to.equals(false);
        });

        it(`should run the all the routes until the router resolves`, function() {
            let callback = function() {};

            rServer.addRoute('get', '/', callback);
            rServer.addRoute('post', '/', callback);

            rServer.addRoute('delete', '/', callback);
            rServer.addRoute('options', '/', callback);

            rServer.addRoute('head', '/', callback);
            rServer.addRoute('put', '/', callback);

            rServer.addRoute('route', '/', callback);

            let result = rServer.runRoutes('/', 'GET', {}, {});
            expect(result).to.equals(true);
        });
    });

    describe('integrated testing', function() {
        it (`should listen for requests, run the process, and call the
            appropriate route`, function(done) {
            rServer.listen();

            rServer.addRoute('get', 'say-name', (req, res) => {
                res.writeHead(200, {'Content-Type': 'text/plain'});
                res.end('R-Server');
            });

            http.request('http://localhost:8131/say-name', (res) => {
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

        it (`should parse request body if there is any`, function(done) {
            rServer.listen();

            rServer.addRoute('post', 'report-json', (req, res) => {
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
                    port: 8131, method: 'POST', headers: {'Content-Type': 'application/json'}
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

        it (`should serve static file and return`, function(done) {
            rServer.listen();

            http.request('http://localhost:8131/package.json', (res) => {
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

        it (`should serve a 404 response if no file and route matches the request`, function(done) {
            rServer.listen();

            http.request('http://localhost:8131/package', (res) => {
                rServer.close();

                res.resume();
                if (res.statusCode === 404)
                    done();
                else
                    done(new Error('wrong status code from endpoint'));
            })
                .end();
        });

        it (`should destroy the request if the buffer sent exceeds the maxBufferSize config option`, function(done) {
            let rServer = new RServer('test/helpers/.rsvrc.json');
            rServer.listen();

            let options = {
                method: 'POST', hostname: 'localhost', port: '8131', path: '/report-json',
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