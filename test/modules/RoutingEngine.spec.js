import RoutingEngine from '../../src/modules/RoutingEngine.js';

describe('RoutingEngine', function() {
    let engine = null;

    beforeEach(function() {
        engine = new RoutingEngine('/', 'get', {}, {end: function(){}}, []);
    });

    describe('#constructor(url, method, request, response, middlewares?)', function() {
        it(`should create an r-server RoutingEngine instance given the request url, request method,
            request object, request response object, and array of middlewares`, function() {
            expect(new RoutingEngine('/', 'get', {}, {}, [])).to.be.a('RoutingEngine');
        });

        it(`should initialize the middleware to empty array if no parameter is given`, function() {
            expect(new RoutingEngine('/', 'get', {}, {}).middlewares).to.be.an('Array');
        });
    });

    describe('#use(middlewares)', function() {
        it(`should set the engines middlewares to the given middlewares array parameter`, function() {
            let middlewares = [];
            engine.use(middlewares);
            expect(engine.middlewares).to.equals(middlewares);
        });

        it(`should do nothing if argument is not an array`, function() {
            let middlewares = function() {};
            engine.use(middlewares);
            expect(engine.middlewares).to.not.equals(middlewares);
        });
    });

    describe('#deComposeRouteToken(routeToken, pathToken)', function() {
        it(`should inspect the route token, decompose and coerce the pathToken value to the
        specified route token data type if any`, function() {
            expect(engine.deComposeRouteToken('int:user-id', '1')).to.deep.equals({
                name: 'user-id',
                value: 1,
                dataType: 'int'
            });
        });

        it(`should store the token as a parameter if it is a captured parameter`, function() {
            expect(engine.deComposeRouteToken('{bool:user-id}', '1')).to.deep.equals({
                name: 'user-id',
                value: true,
                dataType: 'bool'
            });
            expect(engine.params).to.deep.equals([['user-id', true]]);
        });

        it(`should a default parse if no data type is specified`, function() {
            expect(engine.deComposeRouteToken('{orderId}', '24')).to.deep.equals({
                name: 'orderId',
                value: '24',
                dataType: ''
            });
        });

        it(`should coerce the pathToken value to float if specified data type is float, double
            or number, returning 0 if coercion results to a NaN value`, function() {
            expect(engine.deComposeRouteToken('{float:orderId}', '24.4ad').value).to.equals(24.4);
            expect(engine.deComposeRouteToken('{float:orderId}', 'ad').value).to.equals(0);
        });

        it(`should coerce the pathToken value to boolean value if specified data type is boolean, or
            or bool`, function() {
            expect(engine.deComposeRouteToken('{bool:status}', '0').value).to.equals(false);
            expect(engine.deComposeRouteToken('{bool:status}', '-1').value).to.equals(true);
        });
    });

    describe('#validateRoute(callback, overrideMethod?)', function() {
        it(`should validate the route and return true if callback is callable and the
        routes method is equal to the request's method`, function() {
            expect(engine.validateRoute(() => {}, 'GET')).to.be.true;
        });

        it(`should return false if argument one is not callable`, function() {
            expect(engine.validateRoute({}, 'GET')).to.be.false;
        });

        it(`should return false if argument two is argument is given but it does not match the
        request method`, function() {
            expect(engine.validateRoute({}, 'POST')).to.be.false;
        });

        it(`should return true if argument two is not given`, function() {
            expect(engine.validateRoute(() => {})).to.be.true;
        });
    });

    describe('#validateOptions(options?)', function() {
        it(`should validate the route's additional options and return true if the options are
        valid.`, function() {
            expect(engine.validateOptions()).to.be.true;
        });

        it(`should validate the route's options.methods array parameter, return true if the request's
            method is among the array entries`, function() {
            expect(engine.validateOptions({
                methods: ['GET', 'POST']
            })).to.be.true;
        });

        it(`should validate the route's options.methods array parameter, return false if the request's
            method is not among the array entries`, function() {
            expect(engine.validateOptions({
                methods: []
            })).to.be.false;

            expect(engine.validateOptions({
                methods: ['POST', 'PUT']
            })).to.be.false;
        });
    });

    describe('#matchUrl(routeUrl)', function() {

        it(`should parse the route url, convert it to a regex pattern, match it with the request
            url and return true if it satisfies the request url`, function() {

            engine = new RoutingEngine('users/1/profile', 'GET', {}, {}, []);
            expect(engine.matchUrl('users/{int:user-id}/profile')).to.be.true;
            expect(engine.matchUrl('users/{int:user-id}/[profile]+')).to.be.true;
            expect(engine.matchUrl('users/{int:user-id}/(profile)?')).to.be.true;
            expect(engine.matchUrl('*')).to.be.true;
            expect(engine.matchUrl('users/*')).to.be.true;
            expect(engine.matchUrl('users/\\d+/{view}?')).to.be.true;
        });

        it(`should parse the route url, convert it to a regex pattern, match it with the request
            url and return false if it does not satisfy the request url`, function() {

            engine = new RoutingEngine('users/1/posts/4/comments?title=what-are-you-saying1', 'GET', {}, {}, []);
            expect(engine.matchUrl('users/{int:user-id}/posts/{int:post_id}/comments')).to.be.true;

            expect(engine.matchUrl('users/{int:user-id}/[profile]+')).to.be.false;
            expect(engine.matchUrl('users/{int:user-id}/(comments)?')).to.be.false;
            expect(engine.matchUrl('user/*')).to.be.false;
            expect(engine.matchUrl('')).to.be.false;
        });
    });

    describe('#run(callback)', function() {
        it(`should execute all middlewares and if all executes the next callback and those not
        end the response, it should execute the given routes callback`, function() {
            let called = false;
            engine.run(function() {called = true;});
            expect(called).to.be.true;
        });

        it(`should execute user defined middlewares, stopping or continuing depending on whether
            the middlewares keep executing the next command. If all goes well, it should execute
            the callback`, function() {
            let callSignatures = [];
            let middleware1 = function(req, res, next) {
                callSignatures.push('middleware 1');
                next();
            };
            let middleware2 = function(req, res, next) {
                callSignatures.push('middleware 2');
                next();
            };
            engine = new RoutingEngine('/', 'GET', {}, {}, [middleware1, middleware2]);
            engine.run(function() {
                callSignatures.push('controller');
            });

            expect(callSignatures).to.deep.equals(['middleware 1', 'middleware 2', 'controller']);
        });

        it(`should execute user defined middlewares, stopping the process once a middleware
        fails to call the next middleware or if it ends the response.`, function() {
            let callSignatures = [];
            let middleware1 = function(req, res) {
                callSignatures.push('middleware 1');
                res.end();
            };
            let middleware2 = function(req, res, next) {
                callSignatures.push('middleware 2');
                next();
            };
            engine = new RoutingEngine('/', 'GET', {}, {end: () => {}}, [middleware1, middleware2]);
            engine.run(function() {
                callSignatures.push('controller');
            });

            expect(callSignatures).to.deep.equals(['middleware 1']);
        });

        it(`should end the response if the middleware fails to call the next callback and fails to
            end the response.`, function() {
            let callSignatures = [];
            let middleware1 = function(req, res) {
                callSignatures.push('middleware 1');
                res.finished = true;
            };
            let middleware2 = function(req, res, next) {
                callSignatures.push('middleware 2');
                next();
            };
            engine = new RoutingEngine('/', 'GET', {}, {end: () => {}}, [middleware1, middleware2]);
            engine.run(function() {
                callSignatures.push('controller');
            });

            expect(callSignatures).to.deep.equals(['middleware 1']);
        });
    });

    describe('#process(routeUrl, callback, options?, overrideMethod?)', function() {
        it(`should process the route if given a route url, callback method, optional route
            additional options, an optional overrideMethod argument. It should run the process
            and execute middlewares, and callback method if route meets the request criteria`, function() {
            let called = false;
            engine.process('/', function(req, res) {
                called = true;
                res.end();
            });
            expect(called).to.be.true;
        });

        it(`should pass in request, response object and comma separated list of captured data to
            the controller as defined in the route`, function(done) {
            let request = {
                    method: 'GET',
                    headers: {
                        'user-agent': '',
                        'if-none-match': 'dhdhd9ed'
                    }
                },
                response = {
                    end: () => {}
                };
            engine = new RoutingEngine('/users/200/profile', 'GET', request, response, []);

            engine.process('users/{int:id}/profile', function(req, res, userId) {
                if (req !== request)
                    done(new Error('controller argument one is not the request object'));
                else if (res !== response)
                    done(new Error('controller argument two is not the response object'));
                else if (userId !== 200)
                    done(new Error('controller argument three is not the captured parameter'));
                else
                    done();
            });
        });

        it(`should pass in request, response object, comma separated list of captured data and the
            last remaining parts of the url that is matched by an asterisk`, function(done) {
            engine = new RoutingEngine('/api/1.0/user/1/profile', 'GET', {}, {}, []);

            engine.process('api/{float:version}/*', function(req, res, apiVersion, others) {
                if (others !== 'user/1/profile')
                    done(new Error('controller argument four is not the actual askerisk match'));
                else
                    done();
            });
        });

        it(`should not process the next route if a matching route has been resolved`, function() {
            let callCount = 0;
            engine.process('/', function(req, res) {
                callCount += 1;
                res.end();
            });
            engine.process('/', function(req, res) {
                callCount += 1;
                res.end();
            });

            expect(callCount).to.equals(1);
        });

        it(`should not resolve if the route details does not meet the request criteria`, function() {
            let callCount = 0;
            engine.process('/user', function(req, res) {
                callCount += 1;
                res.end();
            });

            engine.process('/user', null);

            expect(callCount).to.equals(0);
        });
    });

    describe('#all(routeUrl, callback, options?)', function() {
        it(`should process the given route for all method verbs`, function() {
            let called = false;
            engine.all('/', function(req, res) {
                called = true;
                res.end();
            });
            expect(called).to.be.true;
        });

        it(`should process the given route for all method verbs except when user specifies the methods
        using options.methods parameters`, function() {
            let called = false;
            engine.all('/', function(req, res) {
                called = true;
                res.end();
            }, {
                methods: ['POST', 'PUT']
            });
            expect(called).to.be.false;
        });
    });

    describe('#get(routeUrl, callback, options?)', function() {
        it(`should process the given route for only http GET method verb`, function() {
            let called = false;
            engine.get('/', function(req, res) {
                called = true;
                res.end();
            });
            expect(called).to.be.true;
        });

        it(`should not process the route if the request method is not the GET method`, function() {
            let called = false;
            engine = new RoutingEngine('/', 'POST', {}, {}, []);
            engine.get('/', function(req, res) {
                called = true;
                res.end();
            });
            expect(called).to.be.false;
        });
    });

    describe('#head(routeUrl, callback, options?)', function() {
        it(`should process the given route for only http HEAD method verb`, function() {
            let called = false;
            engine = new RoutingEngine('/', 'HEAD', {}, {end: function() {}}, []);
            engine.head('/', function(req, res) {
                called = true;
                res.end();
            });
            expect(called).to.be.true;
        });

        it(`should not process the route if the request method is not the HEAD method`, function() {
            let called = false;
            engine = new RoutingEngine('/', 'POST', {}, {}, []);
            engine.head('/', function(req, res) {
                called = true;
                res.end();
            });
            expect(called).to.be.false;
        });
    });

    describe('#options(routeUrl, callback, options?)', function() {
        it(`should process the given route for only http OPTIONS method verb`, function() {
            let called = false;
            engine = new RoutingEngine('/', 'OPTIONS', {}, {end: function() {}}, []);
            engine.options('/', function(req, res) {
                called = true;
                res.end();
            });
            expect(called).to.be.true;
        });

        it(`should not process the route if the request method is not the OPTIONS method`, function() {
            let called = false;
            engine = new RoutingEngine('/', 'POST', {}, {}, []);
            engine.head('/', function(req, res) {
                called = true;
                res.end();
            });
            expect(called).to.be.false;
        });
    });

    describe('#delete(routeUrl, callback, options?)', function() {
        it(`should process the given route for only http DELETE method verb`, function() {
            let called = false;
            engine = new RoutingEngine('/', 'DELETE', {}, {end: function() {}}, []);
            engine.delete('/', function(req, res) {
                called = true;
                res.end();
            });
            expect(called).to.be.true;
        });

        it(`should not process the route if the request method is not the DELETE method`, function() {
            let called = false;
            engine = new RoutingEngine('/', 'POST', {}, {}, []);
            engine.delete('/', function(req, res) {
                called = true;
                res.end();
            });
            expect(called).to.be.false;
        });
    });

    describe('#options(routeUrl, callback, options?)', function() {
        it(`should process the given route for only http POST method verb`, function() {
            let called = false;
            engine = new RoutingEngine('/', 'POST', {}, {end: function() {}}, []);
            engine.post('/', function(req, res) {
                called = true;
                res.end();
            });
            expect(called).to.be.true;
        });

        it(`should not process the route if the request method is not the POST method`, function() {
            let called = false;
            engine = new RoutingEngine('/', 'HEAD', {}, {}, []);
            engine.post('/', function(req, res) {
                called = true;
                res.end();
            });
            expect(called).to.be.false;
        });
    });

    describe('#put(routeUrl, callback, options?)', function() {
        it(`should process the given route for only http PUT method verb`, function() {
            let called = false;
            engine = new RoutingEngine('/', 'PUT', {}, {end: function() {}}, []);
            engine.put('/', function(req, res) {
                called = true;
                res.end();
            });
            expect(called).to.be.true;
        });

        it(`should not process the route if the request method is not the PUT method`, function() {
            let called = false;
            engine = new RoutingEngine('/', 'POST', {}, {}, []);
            engine.put('/', function(req, res) {
                called = true;
                res.end();
            });
            expect(called).to.be.false;
        });
    });
});