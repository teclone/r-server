import Engine from '../../src/modules/Engine.js';
import sinon from 'sinon';

describe('Engine', function() {
    let response = null,
        engine = null;

    beforeEach(function() {
        response = {
            finished: false,
            end: function(){
                this.finished = true;
            }
        };
        engine = new Engine('/', 'get', {}, response, []);
    });

    describe('#constructor(url, method, request, response, middlewares?)', function() {
        it(`should create an RServer Rounting Engine instance given the request url,
            request method, request object, request response object, and array of middlewares`, function() {
            expect(new Engine('/', 'get', {}, {}, [])).to.be.a('Engine');
        });

        it(`should initialize the middleware to empty array if no parameter is given`, function() {
            expect(new Engine('/', 'get', {}, {}).middlewares).to.be.an('Array');
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

        it(`should run a default string parse if no data type is specified`, function() {
            expect(engine.deComposeRouteToken('{orderId}', '24')).to.deep.equals({
                name: 'orderId',
                value: '24',
                dataType: ''
            });
        });

        it(`should coerce the pathToken value to float if specified data type is float, double
            or number, returning 0 if coercion results to NaN`, function() {
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
        routes method is equal to the current request's method`, function() {
            expect(engine.validateRoute(() => {}, 'GET')).to.be.true;
        });

        it(`should return false if argument one is not callable`, function() {
            expect(engine.validateRoute({}, 'GET')).to.be.false;
        });

        it(`should return false if argument two is given but it does not match the
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
            method is among the array entries, else, return false`, function() {
            expect(engine.validateOptions({
                methods: ['GET', 'POST']
            })).to.be.true;

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

            engine = new Engine('users/1/profile', 'GET', {}, {}, []);
            expect(engine.matchUrl('users/{int:user-id}/profile')).to.be.true;
            expect(engine.matchUrl('users/{int:user-id}/[profile]+')).to.be.true;
            expect(engine.matchUrl('/users/{int:user-id}/(profile)?')).to.be.true;
            expect(engine.matchUrl('*')).to.be.true;
            expect(engine.matchUrl('users/*')).to.be.true;
            expect(engine.matchUrl('users/\\d+/{view}?')).to.be.true;
        });

        it(`should parse the route url, convert it to a regex pattern, match it with the request
            url and return false if it does not satisfy the request url`, function() {

            engine = new Engine('users/1/posts/4/comments?title=what-are-you-saying1', 'GET', {}, {}, []);
            expect(engine.matchUrl('users/{int:user-id}/posts/{int:post_id}/comments')).to.be.true;

            expect(engine.matchUrl('users/{int:user-id}/[profile]+')).to.be.false;
            expect(engine.matchUrl('users/{int:user-id}/(comments)?')).to.be.false;
            expect(engine.matchUrl('user/*')).to.be.false;
            expect(engine.matchUrl('')).to.be.false;
        });
    });

    describe('#run(callback)', function() {
        it(`should asynchronously execute all middlewares and the given route callback method`, function() {
            const callback = sinon.spy();
            return engine.run(callback).then(() => {
                expect(callback.calledOnce).to.be.true;
            });
        });

        it(`should execute user defined middlewares, stopping or continuing depending on whether
            the middlewares keep executing the next method. If all goes well, it should execute
            the callback`, function() {
            const middleware1 = (req, res, next) => {
                    next();
                },
                middleware2 = (req, res, next) => {
                    next();
                },
                middlewareSpy1 = sinon.spy(middleware1),
                middlewareSpy2 = sinon.spy(middleware2),
                callback = sinon.spy();

            engine.use([middlewareSpy1, middlewareSpy2]);

            return engine.run(callback).then(() => {
                expect(middlewareSpy1.callCount).to.equals(1);
                expect(middlewareSpy2.callCount).to.equals(1);
                expect(callback.callCount).to.equals(1);
            });
        });

        it(`should execute user defined middlewares, stopping the process once a middleware
        fails to call the next middleware or if it ends the response.`, function() {
            const middleware1 = (req, res) => {
                    res.end();
                },
                middleware2 = (req, res, next) => {
                    next();
                },
                middlewareSpy1 = sinon.spy(middleware1),
                middlewareSpy2 = sinon.spy(middleware2),
                callback = sinon.spy();

            engine.use([middlewareSpy1, middlewareSpy2]);
            return engine.run(callback).then(() => {
                expect(middlewareSpy1.callCount).to.equals(1);
                expect(middlewareSpy2.callCount).to.equals(0);
                expect(callback.callCount).to.equals(0);
            });
        });

        it(`should end the response if the middleware fails to call the next callback and fails to
            end the response.`, function() {
            sinon.spy(response, 'end');
            const middleware1 = () => {

                },
                middlewareSpy1 = sinon.spy(middleware1),
                callback = sinon.spy();

            engine.use([middlewareSpy1]);
            return engine.run(callback).then(() => {
                expect(response.end.callCount).to.equals(1);
                expect(middlewareSpy1.callCount).to.equals(1);
                expect(callback.callCount).to.equals(0);
            });
        });
    });

    describe('#process(routeUrl, callback, options?, overrideMethod?)', function() {
        let request = null;
        beforeEach(function() {
            request = {
                method: 'GET',
                headers: {
                    'user-agent': '',
                    'if-none-match': 'dhdhd9ed'
                }
            };
        });

        it(`should process the route if given a route url, callback method, optional route
            additional options, an optional overrideMethod argument. It should run the process
            and execute middlewares, and callback method if route meets the request criteria
                and return a promise`, function() {
            const callback = sinon.spy();
            return engine.process('/', callback).then(() => {
                expect(callback.calledOnce).to.be.true;
            });
        });

        it(`should pass in request, response object and comma separated list of captured data to
            the controller as defined in the route`, function() {

            engine = new Engine('/users/200/profile', 'GET', request, response, []);
            const callback = sinon.spy();

            return engine.process('users/{int:id}/profile', callback).then(() => {
                expect(callback.getCall(0).args[0]).to.equals(request);
                expect(callback.getCall(0).args[1]).to.equals(response);

                expect(callback.getCall(0).args[2]).to.equals(200);
            });
        });

        it(`should pass in request, response object, comma separated list of captured data and the
            last remaining parts of the url that is matched by an asterisk`, function() {
            engine = new Engine('/api/1.0/user/1/profile', 'GET', request, response, []);

            const callback = sinon.spy();

            return engine.process('api/{float:version}/*', callback).then(() => {
                expect(callback.getCall(0).args[0]).to.equals(request);
                expect(callback.getCall(0).args[1]).to.equals(response);

                expect(callback.getCall(0).args[2]).to.equals(1.0);
                expect(callback.getCall(0).args[3]).to.equals('user/1/profile');
            });
        });

        it(`should not process the next route if a matching route has been resolved`, function(done) {

            const callback1 = sinon.spy(),
                callback2 = sinon.spy();

            engine.process('/', callback1).then(() => {
                engine.process('/', callback2).then(() => {
                    expect(callback1.calledOnce).to.be.true;
                    expect(callback2.callCount).to.equals(0);

                    done();
                });
            });
        });

        it(`should not resolve if the route details does not meet the request criteria`, function() {
            let callback = sinon.spy();
            return engine.process('/user', callback).then(status => {
                expect(callback.called).to.be.false;
                expect(status).to.be.false;
            });
        });
    });

    describe('#all(routeUrl, callback, options?)', function() {
        it(`should process the given route for all method verbs`, function() {
            const callback = sinon.spy();
            engine.all('/', callback).then((status) => {
                expect(callback.called).to.be.true;
                expect(status).to.be.true;
            });
        });

        it(`should process the given route for all method verbs except when user specifies the methods
        using options.methods parameters`, function() {
            const callback = sinon.spy();
            engine.all('/', callback, {methods: ['POST', 'PUT']}).then((status) => {
                expect(callback.callCount).to.equals(0);
                expect(status).to.be.false;
            });
        });
    });

    describe('#get(routeUrl, callback, options?)', function() {
        it(`should process the given route for only http GET method verb`, function() {
            const callback = sinon.spy();
            engine.get('/', callback).then((status) => {
                expect(callback.called).to.be.true;
                expect(status).to.be.true;
            });
        });

        it(`should not process the route if the request method is not the GET method`, function() {
            const callback = sinon.spy();
            new Engine('/', 'POST', {}, response, []).get('/', callback).then(status => {
                expect(callback.callCount).to.equals(0);
                expect(status).to.be.false;
            });
        });
    });

    describe('#head(routeUrl, callback, options?)', function() {
        it(`should process the given route for only http HEAD method verb`, function() {
            const callback = sinon.spy();
            new Engine('/', 'HEAD', {}, response, []).head('/', callback).then((status) => {
                expect(callback.called).to.be.true;
                expect(status).to.be.true;
            });
        });

        it(`should not process the route if the request method is not the HEAD method`, function() {
            const callback = sinon.spy();
            engine.head('/', callback).then(status => {
                expect(callback.callCount).to.equals(0);
                expect(status).to.be.false;
            });
        });
    });

    describe('#options(routeUrl, callback, options?)', function() {
        it(`should process the given route for only http OPTIONS method verb`, function() {
            const callback = sinon.spy();
            new Engine('/', 'OPTIONS', {}, response, []).options('/', callback).then((status) => {
                expect(callback.called).to.be.true;
                expect(status).to.be.true;
            });
        });

        it(`should not process the route if the request method is not the OPTIONS method`, function() {
            const callback = sinon.spy();
            engine.options('/', callback).then(status => {
                expect(callback.callCount).to.equals(0);
                expect(status).to.be.false;
            });
        });
    });

    describe('#delete(routeUrl, callback, options?)', function() {
        it(`should process the given route for only http DELETE method verb`, function() {
            const callback = sinon.spy();
            new Engine('/', 'DELETE', {}, response, []).delete('/', callback).then((status) => {
                expect(callback.called).to.be.true;
                expect(status).to.be.true;
            });
        });

        it(`should not process the route if the request method is not the DELETE method`, function() {
            const callback = sinon.spy();
            engine.delete('/', callback).then(status => {
                expect(callback.callCount).to.equals(0);
                expect(status).to.be.false;
            });
        });
    });

    describe('#put(routeUrl, callback, options?)', function() {
        it(`should process the given route for only http PUT method verb`, function() {
            const callback = sinon.spy();
            new Engine('/', 'PUT', {}, response, []).put('/', callback).then((status) => {
                expect(callback.called).to.be.true;
                expect(status).to.be.true;
            });
        });

        it(`should not process the route if the request method is not the PUT method`, function() {
            const callback = sinon.spy();
            engine.put('/', callback).then(status => {
                expect(callback.callCount).to.equals(0);
                expect(status).to.be.false;
            });
        });
    });

    describe('#post(routeUrl, callback, options?)', function() {
        it(`should process the given route for only http POST method verb`, function() {
            const callback = sinon.spy();
            new Engine('/', 'POST', {}, response, []).post('/', callback).then((status) => {
                expect(callback.called).to.be.true;
                expect(status).to.be.true;
            });
        });

        it(`should not process the route if the request method is not the POST method`, function() {
            const callback = sinon.spy();
            engine.post('/', callback).then(status => {
                expect(callback.callCount).to.equals(0);
                expect(status).to.be.false;
            });
        });
    });
});