import config from '../../../src/.server.config.js';
import Engine from '../../../src/modules/Engine.js';
import Logger from '../../../src/modules/Logger.js';
import path from 'path';
import sinon from 'sinon';

describe('Engine', function() {
    let engine = null,
        request = null,
        response = null,
        logger = null,
        accessLog = '',
        errorLog = '';

    before(function() {
        errorLog = path.resolve(__dirname, '../../../.error.log');
        accessLog = path.resolve(__dirname, '../../../.access.log');
    });

    beforeEach(function() {
        //create a fake request
        request = {};

        //create a fake response
        response = {
            finished: false,
            end: function() {
                this.finished = true;
                return Promise.resolve(true);
            }
        };

        //create a logger instance
        logger = new Logger(
            errorLog,
            accessLog,
            config
        );

        //create an engine
        engine = new Engine('/', 'get', request, response, logger);
    });

    describe('#constructor(url, method, request, response, logger)', function() {
        it(`should create an RServer Rounting Engine instance given the request url,
            request method, request object, request response object, and logger instance`, function() {
            expect(engine).to.be.a('Engine');
        });

        it(`should initialize the instance middlewares to empty array`, function() {
            expect(engine.middlewares).to.be.an('Array').and.lengthOf(0);
        });
    });

    describe('#resolveUrl(url)', function() {
        it(`should trim the url of all backward slashes and return a lower cased value of the
            result`, function() {
            expect(engine.resolveUrl('////////////')).to.equals('');
            expect(engine.resolveUrl('/api/some-endpoint/')).to.equals('api/some-endpoint');
        });
    });

    describe('#use(middlewares)', function() {
        it(`should set the engines middlewares to the given middlewares array parameter`, function() {
            const middlewares = [
                ['/', (req, res, next) => next(), {}]
            ];
            engine.use(middlewares);
            expect(engine.middlewares).to.equals(middlewares);
        });

        it(`should do nothing if argument is not an array`, function() {
            engine.use(null);
            expect(engine.middlewares).to.not.equals(null);
        });
    });

    describe('#captureRouteParameter(routeToken, urlToken, params?)', function() {
        it(`should capture and store the url token for the given route token into the params
            array if routeToken is a capturing token`, function() {
            const params = [];

            engine.captureRouteParameter('{int:user-id}', '1', params);
            expect(params[0]).to.deep.equals(['user-id', 1]);

            engine.captureRouteParameter('{user-id}', '1', params);
            expect(params[1]).to.deep.equals(['user-id', '1']);
        });

        it(`should initialize the params parameter to empty array if it is not any array
            `, function() {
            const params = engine.captureRouteParameter('{int:user-id}', '1');
            expect(params[0]).to.deep.equals(['user-id', 1]);
        });

        it(`should return the resolved params array immediately if route token is not a capturing
        one`, function() {
            const params = [];
            const result = engine.captureRouteParameter('int:user-id', '1', params);
            expect(params).to.equals(result);
        });

        it(`should cast the url token to the route token data type`, function() {
            const datasets = {
                'integer set': ['int', '1', 1],
                'float set': ['float', '33.5', 33.5],
                'nan cast': ['numeric', 'notnumber', 0],
                'boolean true cast': ['bool', 'true', true],
                'boolean false cast': ['bool', '0', false]
            };
            for (const [, dataset] of Object.entries(datasets)) {
                const [type, value, expected] = dataset;
                expect(engine.captureRouteParameter(`{${type}:param}`, value)[0]).to.deep.equals([
                    'param',
                    expected
                ]);
            }
        });
    });

    describe('#validateOptions(overrideMethod, options)', function() {
        it(`should validate the overrideMethod and route's additional options and return true if everything
        is valid`, function() {
            expect(engine.validateOptions('', {})).to.be.true;
        });

        it(`should validate the route's options.methods array parameter, return true if the request
            method is among the array entries, else, return false`, function() {
            expect(engine.validateOptions('', {
                methods: ['GET', 'POST']
            })).to.be.true;

            expect(engine.validateOptions('', {
                methods: []
            })).to.be.false;

            expect(engine.validateOptions('', {
                methods: ['POST', 'PUT']
            })).to.be.false;
        });

        it(`should return false if the routes overrideMethod is not equal to request method`, function() {
            expect(engine.validateOptions('POST', {})).to.be.false;
        });

        it(`should return true if the routes overrideMethod is equal to request method and routes
            methods options are valid`, function() {
            expect(engine.validateOptions('get', {})).to.be.true;
        });
    });

    describe('#matchUrl(routeUrl)', function() {

        it(`should parse the route url, convert it to a regex pattern, match it with the request
            url and return true if it satisfies the request url`, function() {
            expect(engine.matchUrl('')).to.be.true;
            expect(engine.matchUrl('/')).to.be.true;

            //create an engine with request url of 'users/1/profile'
            engine = new Engine('api/v1.0/users/1/profile', 'GET', request, response, logger);

            expect(engine.matchUrl('api/v1.0/users/{int:user-id}/profile')).to.be.true;
            expect(engine.matchUrl('api/v1.0/users/{int:user-id}/[profile]+')).to.be.true;
            expect(engine.matchUrl('api/v1.0/users/{int:user-id}/(profile)?')).to.be.true;
            expect(engine.matchUrl('*')).to.be.true;
            expect(engine.matchUrl('api/v1.0/users/*')).to.be.true;
            expect(engine.matchUrl('api/v1.0/users/[0-9]+/{view}?')).to.be.true;
            expect(engine.matchUrl('api/v1.0/users/[0-9]+/profile/{optional}?')).to.be.true;
        });

        it(`should parse the route url, convert it to a regex pattern, match it with the request
            url and return false if it does not satisfy the request url`, function() {

            engine = new Engine('users/1/posts/4/comments', 'GET', request, response, logger);
            expect(engine.matchUrl('users/{int:user-id}/posts/{int:post_id}/comments')).to.be.true;

            expect(engine.matchUrl('users/{int:user-id}/[profile]+')).to.be.false;
            expect(engine.matchUrl('users/{int:user-id}/(comments)?')).to.be.false;
            expect(engine.matchUrl('user/*')).to.be.false;
            expect(engine.matchUrl('')).to.be.false;
        });
    });

    describe('runValidations(routeUrl, options, overrideMethod)', function() {
        it(`should validate the route and return false if overrideMethod is given and not the same as the request method,
        or if the options argument is given and request did not meet requirements, or if the route
            url did not match the request url`, function() {

            expect(engine.runValidations('/index.html')).to.be.false;
            expect(engine.runValidations('/', {}, 'POST')).to.be.false;
            expect(engine.runValidations('/index.html', {methods: ['POST']})).to.be.false;
        });

        it(`should validate and return array of captured parameters if everything goes well`, function() {

            expect(engine.runValidations('/')).to.deep.equals([]);
            expect(engine.runValidations('/{view}?')).to.deep.equals(['']);

            engine = new Engine('users/1/posts/4/comments', 'GET', request, response, logger);
            expect(engine.runValidations('users/{int:userId}/posts/{int:postId}/comments'))
                .to.deep.equals([1, 4]);

            engine = new Engine('/schemes/abcdef', 'GET', request, response, logger);
            expect(engine.runValidations('schemes/{schemeCode}'))
                .to.deep.equals(['abcdef']);
        });

        it(`should capture ending url tokens for a universal match`, function() {

            expect(engine.runValidations('*')).to.deep.equals(['']);
        });
    });

    describe('#runMiddlewares(middlewares, middlewareParams)', function() {
        it(`should asynchronously run the given array of middleware callbacks passing in the request, response, next and
        the array of middlewareParams to each middleware`, function() {
            const spy = sinon.spy((req, res) => {
                res.end();
            });
            return engine.runMiddlewares([spy], [1, 2, 3]).then(() => {
                expect(spy.callCount).to.equals(1);
                expect(spy.getCall(0).args[0]).to.equals(request);
                expect(spy.getCall(0).args[1]).to.equals(response);
                expect(spy.getCall(0).args[2]).to.be.a('Function');
                expect(spy.getCall(0).args[3]).to.equals(1);
                expect(spy.getCall(0).args[4]).to.equals(2);
                expect(spy.getCall(0).args[5]).to.equals(3);
            });
        });

        it(`should resolve to false if any of the middlewares fails to execute the next callback`, function() {
            return engine.runMiddlewares([() => {}], []).then((result) => {
                expect(result).to.be.false;
            });
        });

        it(`should resolve to true if all the middlewares executed the next callback`, function() {
            const middlewares = new Array(3).fill((req, res, next) => {
                next();
            });

            return engine.runMiddlewares(middlewares, []).then((result) => {
                expect(result).to.be.true;
            });
        });
    });

    describe('#run(callback, params, options)', function() {

        it(`should asynchronously call the runMiddlewares method on each middlewares that applies to the
        route, and running the route callback if all the executed middlewares executes the next
        callback`, function() {

            const middlewares = new Array(3).fill(sinon.spy((req, res, next) => {
                next();
            }));

            const middlewares2 = new Array(3).fill(sinon.spy((req, res, next) => {
                next();
            }));

            const middlewares3 = new Array(3).fill(sinon.spy((req, res, next) => {
                next();
            }));

            const callback = sinon.spy();

            engine.use([
                //applies to route
                ['/', middlewares, null],
                //does not apply
                ['/api/some-endpoint', middlewares2, null],
                //applies to all routes
                ['*', middlewares3, null],
            ]);

            return engine.run(callback, [1, 2, 4], {}).then(() => {
                expect(middlewares[0].callCount).to.equals(3);

                expect(middlewares2[0].callCount).to.equals(0);

                expect(middlewares3[0].callCount).to.equals(3);

                expect(callback.called).to.be.true;
            });
        });

        it(`should stop immediately if any of the applied middlewares fails to execute the
        next callback`, function() {

            const middlewares = new Array(3).fill(sinon.spy((req, res, next) => {
                next();
            }));

            const middlewares2 = new Array(3).fill(sinon.spy());

            const callback = sinon.spy();

            engine.use([
                //applies to route
                ['/', middlewares, null],

                //applies to all routes
                ['*', middlewares2, null],
            ]);

            return engine.run(callback, [1, 2, 4], {}).then(() => {
                expect(middlewares[0].callCount).to.equals(3);

                expect(middlewares2[0].callCount).to.equals(1);

                expect(callback.called).to.be.false;
            });
        });

        it(`should also run any localized middleware/middlewares defined on the route`, function() {
            const middleware = sinon.spy((req, res, next) => {
                next();
            });
            const callback = sinon.spy();

            return engine.run(callback, [], {middlewares: new Array(5).fill(middleware)})
                .then(() => {
                    expect(middleware.callCount).to.equals(5);
                    expect(callback.called).to.be.true;
                });
        });

        it(`should skip any localized middleware that is not a callable`, function() {
            const middleware = sinon.spy((req, res, next) => {next();});
            const callback = sinon.spy();

            return engine.run(callback, [], {middlewares: [null, middleware]})
                .then(() => {
                    expect(middleware.callCount).to.equals(1);
                    expect(callback.called).to.be.true;
                });
        });

        it(`should stop if any of the localized middleware/middlewares defined on the route fails
        to call the next callback`, function() {
            const middleware = sinon.spy(() => {});
            const callback = sinon.spy();

            return engine.run(callback, [], {middlewares: new Array(5).fill(middleware)})
                .then(() => {
                    expect(middleware.callCount).to.equals(1);
                    expect(callback.called).to.be.false;
                });
        });
    });

    describe('#process(routeUrl, callback, options, overrideMethod)', function() {
        it(`should process the route and return a promise that resolves to false if the route
        does not match the request`, function() {
            return engine.process('/api/some-endpoint', () => {}, null).then(result => {
                expect(result).to.equals(false);
            });
        });

        it(`should call the run method on the route and return a promise that resolves to true if
        the route matches the current`, function() {
            const callback = sinon.spy();
            sinon.spy(engine, 'run');
            return engine.process('/', callback, null).then(result => {
                expect(result).to.be.true;
                expect(engine.run.called).to.be.true;
                expect(callback.called).to.be.true;
            });
        });

        it(`should catch and log any fatal error that occurs in the route callback or applied
        middlewares, and still resolve to true`, function() {
            const callback = sinon.spy(() => {
                throw new Error('somethin went bad');
            });
            sinon.spy(logger, 'fatal');
            return engine.process('/', callback, null).then(result => {
                expect(result).to.be.true;
                expect(logger.fatal.called).to.be.true;
                expect(callback.called).to.be.true;
            });
        });

        it(`should return a promise that resolves to true immediately if a matching route has
        already been found, without making any further processing`, function(done) {

            engine.process('/', () => {}, null).then(result => {
                expect(result).to.be.true;

                const callback = sinon.spy();
                engine.process('*', callback, null).then(result => {
                    expect(result).to.be.true;
                    expect(callback.called).to.be.false;
                    done();
                });
            });
        });
    });

    describe('#all(routeUrl, callback, options?)', function() {
        it(`should process the given route for all method verbs`, function() {
            const callback = sinon.spy();
            return engine.all('/', callback).then((status) => {
                expect(callback.called).to.be.true;
                expect(status).to.be.true;
            });
        });

        it(`should process the given route for all method verbs except when user specifies the methods
        using options.method or options.methods parameter`, function() {
            const callback = sinon.spy();
            return engine.all('/', callback, {methods: ['POST', 'PUT']}).then((status) => {
                expect(callback.callCount).to.equals(0);
                expect(status).to.be.false;
            });
        });
    });

    describe('#get(routeUrl, callback, options?)', function() {
        it(`should process the given route for only http GET method verb`, function() {
            const callback = sinon.spy();
            return engine.get('/', callback).then((status) => {
                expect(callback.called).to.be.true;
                expect(status).to.be.true;
            });
        });

        it(`should not process the route if the request method is not the GET method`, function() {
            const callback = sinon.spy();
            return new Engine('/', 'POST', request, response, logger).get('/', callback).then(status => {
                expect(callback.callCount).to.equals(0);
                expect(status).to.be.false;
            });
        });
    });

    describe('#head(routeUrl, callback, options?)', function() {
        it(`should process the given route for only http HEAD method verb`, function() {
            const callback = sinon.spy();
            return new Engine('/', 'HEAD', request, response, logger).head('/', callback).then((status) => {
                expect(callback.called).to.be.true;
                expect(status).to.be.true;
            });
        });

        it(`should not process the route if the request method is not the HEAD method`, function() {
            const callback = sinon.spy();
            return engine.head('/', callback, {}).then(status => {
                expect(callback.callCount).to.equals(0);
                expect(status).to.be.false;
            });
        });
    });

    describe('#options(routeUrl, callback, options?)', function() {
        it(`should process the given route for only http OPTIONS method verb`, function() {
            const callback = sinon.spy();
            return new Engine('/', 'OPTIONS', request, response, logger).options('/', callback).then((status) => {
                expect(callback.called).to.be.true;
                expect(status).to.be.true;
            });
        });

        it(`should not process the route if the request method is not the OPTIONS method`, function() {
            const callback = sinon.spy();
            return engine.options('/', callback).then(status => {
                expect(callback.callCount).to.equals(0);
                expect(status).to.be.false;
            });
        });
    });

    describe('#delete(routeUrl, callback, options?)', function() {
        it(`should process the given route for only http DELETE method verb`, function() {
            const callback = sinon.spy();
            return new Engine('/', 'DELETE', request, response, logger).delete('/', callback).then((status) => {
                expect(callback.called).to.be.true;
                expect(status).to.be.true;
            });
        });

        it(`should not process the route if the request method is not the DELETE method`, function() {
            const callback = sinon.spy();
            return engine.delete('/', callback).then(status => {
                expect(callback.callCount).to.equals(0);
                expect(status).to.be.false;
            });
        });
    });

    describe('#put(routeUrl, callback, options?)', function() {
        it(`should process the given route for only http PUT method verb`, function() {
            const callback = sinon.spy();
            return new Engine('/', 'PUT', request, response, logger).put('/', callback, {}).then((status) => {
                expect(callback.called).to.be.true;
                expect(status).to.be.true;
            });
        });

        it(`should not process the route if the request method is not the PUT method`, function() {
            const callback = sinon.spy();
            return engine.put('/', callback, {}).then(status => {
                expect(callback.callCount).to.equals(0);
                expect(status).to.be.false;
            });
        });
    });

    describe('#post(routeUrl, callback, options?)', function() {
        it(`should process the given route for only http POST method verb`, function() {
            const callback = sinon.spy();
            return new Engine('/', 'POST', request, response, logger).post('/', callback, {}).then((status) => {
                expect(callback.called).to.be.true;
                expect(status).to.be.true;
            });
        });

        it(`should not process the route if the request method is not the POST method`, function() {
            const callback = sinon.spy();
            return engine.post('/', callback, {}).then(status => {
                expect(callback.callCount).to.equals(0);
                expect(status).to.be.false;
            });
        });
    });
});