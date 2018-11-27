import Router from '../../../src/modules/Router.js';

describe('Router', function() {
    let router = null;

    beforeEach(function() {
        router = new Router();
    });

    describe('#constructor(inheritMiddlewares?)', function() {
        it(`should create a Router instance when called the optional inheritMiddlewares
        parameter`, function() {
            expect(router).to.be.a('Router');
        });

        it(`should set the inheritMiddlewares property to true if no parameter is given`, function() {
            expect(router.inheritMiddlewares).to.be.true;
        });

        it(`should set the inheritMiddlewares property to the boolean parameter if given`, function() {
            expect(new Router(false).inheritMiddlewares).to.be.false;
        });

        it(`should initialize the instance middlewares to an empty array`, function() {
            expect(router.middlewares).to.be.an('Array').and.lengthOf(0);
        });

        it(`should initialize the instance routes to an object containing empty arrays for all
        supported http method apis`, function() {
            expect(router.routes).to.deep.equals({
                options: [], head: [], get: [], post: [], put: [], delete: [], all: []});
        });
    });

    describe('#options(url, callback, options?)', function() {
        it(`should push the given route url, callback and optional options object to the
        routes options api store`, function() {
            const callback = function() {}, options = {};
            router.options('/', callback, options);
            expect(router.routes.options).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/' && route[1] === callback && route[2] === options;
            });
        });

        it(`should resolve options to an object with the middlewares key set to an array
        containing the given middleware callback if options argument is a callable`, function() {
            const callback = function() {}, options = () => {};
            router.options('/', callback, options);
            expect(router.routes.options).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/' && route[1] === callback && route[2].middlewares[0] === options;
            });
        });

        it(`should resolve options to an object with the middlewares key set to the given
        middleware array if options argument is an array`, function() {
            const middlewares = [() => {}, () => {}];
            router.options('/', () => {}, middlewares);

            expect(router.routes.options).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/' && route[2].middlewares[0] === middlewares[0] &&
                    route[2].middlewares[1] === middlewares[1];
            });
        });

        it(`should do nothing if callback is not a callable`, function() {
            router.options('/', null);

            expect(router.routes.options).to.be.lengthOf(0);
        });
    });

    describe('#head(url, callback, options?)', function() {
        it(`should push the given route url, callback and optional options object to the
        routes head api store`, function() {
            let callback = function() {};
            router.head('/', callback);
            expect(router.routes.head).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/' && route[1] === callback && route[2] === null;
            });
        });
    });

    describe('#get(url, callback, options?)', function() {
        it(`should push the given route url, callback and optional options object to the
        routes get api store`, function() {
            const callback = function() {}, options = {};
            router.get('/', callback, options);
            expect(router.routes.get).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/' && route[1] === callback && route[2] === options;
            });
        });
    });

    describe('#post(url, callback, options?)', function() {
        it(`should push the given route url, callback and optional options object to the
        routes post api store`, function() {
            const callback = function() {}, options = {};
            router.post('/', callback, options);
            expect(router.routes.post).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/' && route[1] === callback && route[2] === options;
            });
        });
    });

    describe('#put(url, callback, options?)', function() {
        it(`should push the given route url, callback and optional options object to the
        routes put api store`, function() {
            const callback = function() {}, options = {};
            router.put('/', callback, options);
            expect(router.routes.put).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/' && route[1] === callback && route[2] === options;
            });
        });
    });

    describe('#delete(url, callback, options?)', function() {
        it(`should push the given route url, callback and optional options object to the
        routes delete api store`, function() {
            const callback = function() {}, options = {};
            router.delete('/', callback, options);
            expect(router.routes.delete).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/' && route[1] === callback && route[2] === options;
            });
        });
    });

    describe('#all(url, callback, options?)', function() {
        it(`should push the given route url, callback and optional options object to the
        routes all api store`, function() {
            const callback = function() {}, options = {};
            router.all('/', callback, options);
            expect(router.routes.all).to.be.lengthOf(1).and.to.satisfy(function(routes) {
                let route = routes[0];
                return route[0] === '/' && route[1] === callback && route[2] === options;
            });
        });
    });

    describe('#route(url)', function() {
        it(`should return a Route Wrapper instance for the given url`, function() {
            expect(router.route('/user')).to.be.a('Wrapper');
        });
    });

    describe('#use(url, middlewares, options)', function() {
        it(`should turn the middlewares to array, filter out only callables, and push to the
        instance middlewares if final array length is greater than zero`, function() {
            const middlewares = function() {};
            router.use('/tests', middlewares);

            expect(router.middlewares).to.be.lengthOf(1);
            expect(router.middlewares[0]).to.deep.equals(['/tests', [middlewares], null]);
        });

        it(`should do nothing if argument is not a callable`, function() {
            router.use('', {});

            expect(router.middlewares).to.be.lengthOf(0);
        });

        it(`should resolve options to an object with the methods key set to an array
        containing the given method string if options argument is a string`, function() {
            const middleware = function() {};
            router.use('*', middleware, 'POST');

            expect(router.middlewares).to.be.lengthOf(1);
            expect(router.middlewares[0]).to.deep.equals(['*', [middleware], {
                methods: ['POST']
            }]);
        });

        it(`should resolve options to an object with the methods key set to an array
        containing the all the given methods if options argument is an array of method strings`, function() {
            const middleware = function() {};
            router.use('*', [middleware], ['POST', 'PUT']);

            expect(router.middlewares).to.be.lengthOf(1);
            expect(router.middlewares[0]).to.deep.equals(['*', [middleware], {
                methods: ['POST', 'PUT']
            }]);
        });
    });
});